"""Create GitHub issues and PR comments from AI-generated change analysis.

https://github.com/assembly-automation-hub/repo-governance

This module runs inside GitHub Actions and inspects either push or pull
request events. It gathers the relevant diff, sends the change summary to a
hosted model, and uses the structured JSON response to open a GitHub issue
and optionally post a pull request comment.

Execution is orchestrated by :func:`main`: configuration is loaded and
validated first, the event payload is collected, a role-specific prompt is
assembled from the event's trigger labels (or auto-detected from the diff),
the hosted model is called, and finally a GitHub issue (and an optional PR
comment) is created. Early-exit conditions (unauthorized actor, duplicate
issue, tiny diff) terminate the run with a zero exit code so the workflow
stays green.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from dataclasses import dataclass

import requests
from github import Auth, Github
from github.PullRequest import PullRequest
from github.Repository import Repository
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL_NAME = "Llama-3.3-70B-Instruct"
ENDPOINT = "https://models.inference.ai.azure.com/chat/completions"

PUSH_DIFF_LIMIT = 10_000
PR_DIFF_LIMIT = 80_000
MIN_DIFF_LENGTH = 50
MODEL_TIMEOUT_SECONDS = 60
MODEL_RETRIES = 3
MODEL_RETRY_DELAY_SECONDS = 5

TRUNCATION_MARKER = "\n[Diff truncated...]"
PERMALINK_PLACEHOLDER = "PUT_PERMALINK_HERE"

# ---------------------------------------------------------------------------
# Configuration and event payload
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Config:
    """Immutable runtime configuration sourced from environment variables."""

    gh_token: str
    model_token: str
    repo_name: str
    event_name: str
    allowed_users: tuple[str, ...]
    commit_sha: str | None
    pr_number: int | None
    actor: str


@dataclass
class EventContext:
    """Everything gathered from the triggering push or pull request event."""

    diff_text: str
    description: str
    author_login: str
    trigger_labels: list[str]
    dedup_key: str
    changed_files: list[str]
    pr_ref: PullRequest | None = None


def load_config() -> Config:
    """Read and validate the environment variables required to run.

    Raises:
        SystemExit: If a mandatory variable is missing or malformed. A
            non-zero exit code is used because this is a configuration
            error, not a routine skip.
    """
    gh_token = os.environ.get("GITHUB_TOKEN", "").strip()
    model_token = os.environ.get("GH_MODELS_TOKEN", "").strip()
    repo_name = os.environ.get("REPOSITORY", "").strip()
    event_name = os.environ.get("EVENT_NAME", "").strip()

    missing = [
        name
        for name, value in (
            ("GITHUB_TOKEN", gh_token),
            ("GH_MODELS_TOKEN", model_token),
            ("REPOSITORY", repo_name),
            ("EVENT_NAME", event_name),
        )
        if not value
    ]
    if missing:
        sys.exit(f"Missing required environment variables: {', '.join(missing)}")

    if event_name not in ("push", "pull_request"):
        print(f"Unsupported event '{event_name}'. Skipping.")
        raise SystemExit(0)

    commit_sha = os.environ.get("COMMIT_SHA", "").strip() or None
    if event_name == "push" and not commit_sha:
        sys.exit("Missing required environment variable: COMMIT_SHA (push event)")

    pr_number: int | None = None
    if event_name == "pull_request":
        raw_pr_number = os.environ.get("PR_NUMBER", "").strip()
        if not raw_pr_number.isdigit():
            sys.exit("Missing or invalid environment variable: PR_NUMBER (pull_request event)")
        pr_number = int(raw_pr_number)

    allowed_users = tuple(
        user.strip().lower()
        for user in os.environ.get("ALLOWED_USER", "").split(",")
        if user.strip()
    )

    return Config(
        gh_token=gh_token,
        model_token=model_token,
        repo_name=repo_name,
        event_name=event_name,
        allowed_users=allowed_users,
        commit_sha=commit_sha,
        pr_number=pr_number,
        actor=os.environ.get("GITHUB_ACTOR", "").strip().lower(),
    )


# ---------------------------------------------------------------------------
# Event routing — collect the diff and metadata for push vs pull_request.
# ---------------------------------------------------------------------------


def collect_diff(files: list, limit: int) -> tuple[str, list[str]]:
    """Accumulate patch text for the changed files up to ``limit`` characters."""
    changed_files: list[str] = []
    diff_text = ""
    for file in files:
        changed_files.append(file.filename)
        # ``patch`` is None for binary files; coerce to an empty string.
        diff_text += f"File: {file.filename}\nPatch:\n{file.patch or ''}\n\n"
        if len(diff_text) > limit:
            diff_text += TRUNCATION_MARKER
            break
    return diff_text, changed_files


def collect_push_event(repo: Repository, cfg: Config) -> EventContext:
    """Build the event context for a push, enforcing the actor allow-list."""
    assert cfg.commit_sha is not None  # guaranteed by load_config()
    commit = repo.get_commit(cfg.commit_sha)

    if cfg.actor not in cfg.allowed_users:
        print(f"Action performed by {cfg.actor}, not in allowed list. Skipping.")
        raise SystemExit(0)

    pr_match = re.search(r"\(#(\d+)\)", commit.commit.message)
    dedup_key = f"PR #{pr_match.group(1)}" if pr_match else f"commit:{cfg.commit_sha[:7]}"

    diff_text, changed_files = collect_diff(commit.files, PUSH_DIFF_LIMIT)

    return EventContext(
        diff_text=diff_text,
        description=f"Commit Message: {commit.commit.message}",
        author_login=cfg.actor,
        trigger_labels=[m.lower() for m in re.findall(r"\[(.*?)\]", commit.commit.message)],
        dedup_key=dedup_key,
        changed_files=changed_files,
    )


def collect_pr_event(repo: Repository, cfg: Config) -> EventContext:
    """Build the event context for a pull request, enforcing the author allow-list."""
    assert cfg.pr_number is not None  # guaranteed by load_config()
    pr = repo.get_pull(cfg.pr_number)

    author_login = pr.user.login.strip().lower()
    if author_login not in cfg.allowed_users:
        print(f"PR author {author_login} not in allowed list. Skipping.")
        raise SystemExit(0)

    diff_text, changed_files = collect_diff(pr.get_files(), PR_DIFF_LIMIT)

    return EventContext(
        diff_text=diff_text,
        description=f"PR Title: {pr.title}\nPR Body: {pr.body}",
        author_login=author_login,
        trigger_labels=[label.name.lower() for label in pr.labels],
        dedup_key=f"PR #{cfg.pr_number}",
        changed_files=changed_files,
        pr_ref=pr,
    )


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------


def has_duplicate_issue(repo: Repository, dedup_key: str) -> bool:
    """Return whether an issue containing ``dedup_key`` already exists."""
    for issue in repo.get_issues(state="all"):
        if dedup_key in (issue.body or ""):
            print(f"Issue for {dedup_key} already exists (#{issue.number}), skipping.")
            return True
    return False


def was_already_closed(repo: Repository, title_keyword: str) -> bool:
    """Return whether a similar issue title already exists in closed issues."""
    for issue in repo.get_issues(state="closed"):
        if title_keyword.lower() in (issue.title or "").lower():
            print(f"Similar closed issue found: #{issue.number} — skipping.")
            return True
    return False


# ---------------------------------------------------------------------------
# Auto-detection of change type from file paths and diff content.
# Used when no explicit labels are provided in commit message or PR.
# ---------------------------------------------------------------------------


def detect_change_type(files: list[str], diff: str, context: str) -> str:
    """Determine the analysis role based on changed file paths and diff content.

    Inspects the list of changed files and diff text to infer what kind of
    review is most appropriate. Returns a role key that maps to a specific
    prompt persona.

    Args:
        files: List of changed file paths.
        diff: The accumulated diff text.
        context: Commit message or PR title/body.

    Returns:
        A string role key: "security", "deps", "ci", "docs", "frontend",
        "backend", "config", or "general".
    """
    files_lower = [f.lower() for f in files]
    diff_lower = diff.lower()

    has_security_keywords = any(kw in diff_lower for kw in [
        "secret", "token", "password", "api_key", "apikey", "auth",
        "credential", "private_key", "access_key", "bearer",
        "vulnerability", "cve-", "injection", "xss", "csrf",
    ])
    has_security_files = any(f for f in files_lower if any(kw in f for kw in [
        "security", "auth", ".env", "secret",
    ]))
    if has_security_keywords or has_security_files:
        return "security"

    has_dep_files = any(f for f in files_lower if any(kw in f for kw in [
        "requirements", "package.json", "package-lock", "pipfile",
        "poetry.lock", "cargo.toml", "go.sum", "gemfile",
        "dependabot", "renovate",
    ]))
    if has_dep_files:
        return "deps"

    has_ci_files = any(f for f in files_lower if any(kw in f for kw in [
        ".github/workflows/", "jenkinsfile", ".gitlab-ci",
        ".circleci", "dockerfile", "docker-compose",
        ".github/actions/",
    ]))
    if has_ci_files:
        return "ci"

    has_doc_files = all(
        any(kw in f for kw in [
            "readme", "contributing", "changelog", "license",
            "docs/", "doc/", ".md", ".rst", ".txt",
        ])
        for f in files_lower
    )
    if has_doc_files and files_lower:
        return "docs"

    has_frontend_files = any(f for f in files_lower if any(kw in f for kw in [
        ".html", ".css", ".jsx", ".tsx", ".vue", ".svelte",
        "frontend/", "public/", "static/", "assets/",
    ]))
    has_frontend_keywords = any(kw in diff_lower for kw in [
        "classname", "style=", "onclick", "addeventlistener",
        "document.get", "innerhtml", "appendchild",
    ])
    if has_frontend_files or has_frontend_keywords:
        return "frontend"

    has_backend_files = any(f for f in files_lower if any(kw in f for kw in [
        ".py", ".go", ".java", ".rb", ".rs", ".php",
        "api/", "server/", "backend/", "lib/", "src/",
    ]))
    if has_backend_files:
        return "backend"

    has_config_files = any(f for f in files_lower if any(kw in f for kw in [
        ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf",
        ".json", ".env",
    ]))
    if has_config_files:
        return "config"

    return "general"


# ---------------------------------------------------------------------------
# Prompt building — severity guidance, output contract, and role personas.
# ---------------------------------------------------------------------------

SEVERITY_GUIDE = """
Use the following severity scale. You have 7 levels — pick the one that best matches the ACTUAL impact:

CRITICAL — Production-breaking changes, security vulnerabilities (exposed secrets, SQL injection, XSS, CSRF, broken auth), data loss risks, or changes that could cause service outages.

HIGH — Significant logic changes affecting core functionality, new or modified API endpoints, permission and access control modifications, database schema changes, removal of important functionality, breaking changes to public interfaces.

ELEVATED — New substantial features or modules, large-scale refactors that change behavior across multiple files, integration with external services or APIs, changes to error handling or retry logic, modifications to data processing pipelines.

MEDIUM — New utility functions or helpers, workflow and CI/CD pipeline changes, configuration changes that affect runtime behavior, dependency version updates, adding new files with meaningful functionality, structural reorganization of existing code.

MODERATE — Minor feature additions, small behavioral changes, adding validation or input checks, improving logging or error messages, updating environment variables or build settings, adding new labels or issue templates.

LOW — Documentation updates (README, CONTRIBUTING, comments), cosmetic UI changes without behavior impact, code formatting or style fixes, renaming without behavior change, adding badges or metadata, updating .gitignore or editor configs.

INFORMATIONAL — Trivial changes: fixing typos, whitespace adjustments, comment rewording, version bumps in non-critical files, adding blank lines.

IMPORTANT: Do NOT default to LOW or INFORMATIONAL. Carefully evaluate the actual scope and impact. Most code changes that add or modify functionality should be MEDIUM or higher. Use the full range of the scale.
"""

BASE_INSTRUCTIONS = """
Return only a raw JSON object with no markdown formatting. The JSON must have these exact keys:

"issue_title": string — include severity prefix like [CRITICAL], [HIGH], [ELEVATED], [MEDIUM], [MODERATE], [LOW], or [INFO] at the start,
"severity": string — one of: critical, high, elevated, medium, moderate, low, informational,
"issue_body": string — must include these sections:
  ## Problem
  (clear description with exact file paths and line numbers if known)

  ## Code Reference
  (the exact problematic code snippet or the key changed code)

  ## Suggested Fix
  (concrete code or steps to fix — or "No action required" for informational changes)

  ## Permalink
  (placeholder: PUT_PERMALINK_HERE — will be replaced automatically)

"labels": list of strings — standard GitHub labels plus the severity level,
"affected_file": string — the most relevant filename from the diff (or "" if unknown),
"affected_line": integer — approximate line number of the issue (or 1 if unknown),
"summary": string — 2-3 sentence plain-English summary for the PR comment

The issue_title, issue_body and summary MUST be written entirely in English.
"""

PROMPT_ROLES = {
    "security": (
        "Act as a Strict Security Auditor. Perform a deep security audit "
        "(OWASP Top 10, CWE patterns). Find real vulnerabilities with exact "
        "file/line references. Check for exposed secrets, injection vectors, "
        "broken auth, insecure deserialization, and misconfigurations."
    ),
    "review": (
        "Act as a Strict Code Reviewer. Analyze code quality using SOLID, DRY, "
        "and KISS principles. Point to exact lines that violate these principles. "
        "Evaluate naming, error handling, and separation of concerns."
    ),
    "qa": (
        "Act as a QA Engineer. Identify edge cases, missing test coverage, "
        "untested error paths, and potential regressions. Reference exact "
        "functions and lines that need tests."
    ),
    "perf": (
        "Act as a Performance Expert. Analyze algorithmic complexity, identify "
        "O(n²) patterns, unnecessary allocations, N+1 queries, blocking I/O, "
        "and missed caching opportunities. Reference exact lines."
    ),
    "pm": (
        "Act as a Product Manager. Generate user-facing Release Notes with "
        "clear impact descriptions. Focus on what changed for the end user, "
        "not implementation details."
    ),
    "deps": (
        "Act as a Security & Dependency Auditor. Analyze all new or changed "
        "dependencies: check for known vulnerabilities (CVEs), license "
        "compatibility (MIT/Apache/GPL), package size impact, maintenance "
        "status, and whether each dep is actively maintained. Reference exact "
        "file and line where each dependency is added or changed."
    ),
    "arch": (
        "Act as a Software Architect. Review changes for architectural issues: "
        "violation of separation of concerns, tight coupling, wrong layer "
        "dependencies, anti-patterns (God object, spaghetti logic, magic "
        "numbers, circular dependencies). Reference exact files and lines."
    ),
    "ci": (
        "Act as a DevOps/CI Engineer. Review the CI/CD pipeline changes for "
        "correctness, security (token permissions, secret exposure), efficiency "
        "(caching, parallelism, job dependencies), and best practices. Check "
        "for overly broad permissions, missing timeout limits, and potential "
        "race conditions in workflows."
    ),
    "docs": (
        "Act as a Technical Writer. Review the documentation changes for "
        "completeness, accuracy, clarity, and consistency. Check that code "
        "examples are correct, links are valid, and the structure is logical. "
        "Note any missing sections or outdated information."
    ),
    "frontend": (
        "Act as a Frontend Engineer. Review the UI/UX changes for accessibility "
        "(a11y), responsive design, performance (bundle size, render blocking), "
        "XSS risks in DOM manipulation, proper event handling, and browser "
        "compatibility. Reference exact files and lines."
    ),
    "backend": (
        "Act as a Senior Backend Engineer. Review the changes for correctness, "
        "error handling, input validation, resource management (file handles, "
        "connections), concurrency safety, and API contract compliance. "
        "Reference exact files and lines."
    ),
    "config": (
        "Act as a Configuration & Infrastructure Reviewer. Analyze the config "
        "changes for correctness, security implications (exposed ports, "
        "permissive CORS, debug mode in production), consistency across "
        "environments, and potential breaking changes for existing deployments."
    ),
    "general": (
        "Act as a Senior Software Engineer reviewing a colleague's changes. "
        "Provide a thorough assessment covering: what was changed and why, "
        "whether the changes introduce any risks or bugs, code quality, "
        "and the overall scope and impact on the project."
    ),
}

# Maps commit-message bracket labels and PR labels to role keys.
LABEL_TO_ROLE = {
    "sec": "security", "security": "security", "audit": "security",
    "review": "review", "refactor": "review", "code-review": "review",
    "qa": "qa", "test": "qa", "testing": "qa",
    "perf": "perf", "performance": "perf", "optimize": "perf",
    "pm": "pm", "release": "pm", "product": "pm",
    "deps": "deps", "dependencies": "deps", "dep": "deps",
    "arch": "arch", "architecture": "arch",
    "ci": "ci", "devops": "ci", "pipeline": "ci", "workflow": "ci",
    "docs": "docs", "doc": "docs", "documentation": "docs",
    "frontend": "frontend", "ui": "frontend", "ux": "frontend", "css": "frontend",
    "backend": "backend", "api": "backend", "server": "backend",
    "config": "config", "infra": "config", "infrastructure": "config",
}

SEVERITY_LABELS = {
    "critical": "severity: critical",
    "high": "severity: high",
    "elevated": "severity: elevated",
    "medium": "severity: medium",
    "moderate": "severity: moderate",
    "low": "severity: low",
    "informational": "severity: informational",
}
DEFAULT_SEVERITY = "medium"


def select_role(trigger_labels: list[str], changed_files: list[str],
                diff_text: str, description: str) -> str:
    """Resolve the prompt role: explicit label match first, then auto-detection."""
    for label in trigger_labels:
        if label in LABEL_TO_ROLE:
            return LABEL_TO_ROLE[label]
    role_key = detect_change_type(changed_files, diff_text, description)
    print(f"Auto-detected change type: {role_key}")
    return role_key


def build_prompt(role_key: str, event: EventContext) -> str:
    """Assemble the full model prompt for the resolved role."""
    role_instruction = PROMPT_ROLES.get(role_key, PROMPT_ROLES["general"])
    return f"""{role_instruction}

Do NOT invent problems that do not exist in the diff. Base your analysis strictly on what you see.
{SEVERITY_GUIDE}
Context: {event.description}
Changed files: {', '.join(event.changed_files)}
Changes: {event.diff_text}
{BASE_INSTRUCTIONS}"""


# ---------------------------------------------------------------------------
# Model client
# ---------------------------------------------------------------------------


def make_session() -> requests.Session:
    """Build a session with automatic retries for transient transport errors."""
    session = requests.Session()
    retry = Retry(
        total=MODEL_RETRIES,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"POST"}),
    )
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def parse_model_response(raw: str) -> dict:
    """Strip markdown code fences and parse the model's JSON payload."""
    cleaned = re.sub(r"^```json\s*|^```\s*$", "", raw.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def call_model(session: requests.Session, model_token: str, prompt: str,
               retries: int = MODEL_RETRIES, delay: int = MODEL_RETRY_DELAY_SECONDS) -> dict:
    """Send a review prompt to the hosted model and parse the JSON reply.

    Retries on transport errors and malformed responses. Exits with a zero
    code after all attempts are exhausted so the workflow does not fail.
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {model_token}",
    }
    payload = {
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a professional software auditor. Always return "
                    "valid JSON only. No markdown, no explanation, just the "
                    "JSON object."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "model": MODEL_NAME,
        "temperature": 0.1,
    }

    for attempt in range(1, retries + 1):
        try:
            resp = session.post(ENDPOINT, headers=headers, json=payload,
                                timeout=MODEL_TIMEOUT_SECONDS)
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            return parse_model_response(raw)
        except requests.RequestException as exc:
            # Never log the exception body — it must not contain credentials.
            status = exc.response.status_code if exc.response is not None else "no response"
            print(f"Model request failed (attempt {attempt}/{retries}, HTTP {status}).")
        except (KeyError, IndexError, ValueError, json.JSONDecodeError) as exc:
            print(f"Malformed model response (attempt {attempt}/{retries}): {type(exc).__name__}")
        if attempt < retries:
            time.sleep(delay)

    print("All attempts failed. Exiting gracefully.")
    raise SystemExit(0)


# ---------------------------------------------------------------------------
# Publishing results to GitHub
# ---------------------------------------------------------------------------


def build_permalink(cfg: Config, event: EventContext,
                    filename: str, line: int = 1) -> str:
    """Build a GitHub blob permalink for a file and line number."""
    sha = cfg.commit_sha or (event.pr_ref.head.sha if event.pr_ref else "")
    return f"https://github.com/{cfg.repo_name}/blob/{sha}/{filename}#L{line}"


def resolve_issue_body(result: dict, cfg: Config, event: EventContext) -> str:
    """Substitute the permalink placeholder in the model-generated body."""
    body = result.get("issue_body", "")
    affected_file = result.get("affected_file", "")
    if affected_file:
        affected_line = result.get("affected_line", 1)
        permalink = build_permalink(cfg, event, affected_file, affected_line)
        return body.replace(PERMALINK_PLACEHOLDER, permalink)
    return body.replace(PERMALINK_PLACEHOLDER, "_No specific file identified_")


def merge_labels(result: dict, severity: str) -> list[str]:
    """Combine model-suggested labels with the severity label, order preserved."""
    model_labels = result.get("labels", [])
    if not isinstance(model_labels, list):
        model_labels = []
    severity_label = SEVERITY_LABELS.get(severity, SEVERITY_LABELS[DEFAULT_SEVERITY])
    return list(dict.fromkeys([*model_labels, severity_label]))


def publish_results(repo: Repository, cfg: Config, event: EventContext,
                    role_key: str, result: dict) -> None:
    """Create the GitHub issue and, for PR events, post the summary comment."""
    title_keyword = result.get("issue_title", "")[:40]
    if title_keyword and was_already_closed(repo, title_keyword):
        raise SystemExit(0)

    severity = str(result.get("severity", DEFAULT_SEVERITY)).lower()
    issue_body = resolve_issue_body(result, cfg, event)
    footer = (
        f"\n\n---\n*Generated from {event.dedup_key} | Auto-detected role: "
        f"`{role_key}` | Processed by actor: {cfg.actor or 'unknown'}*"
    )

    issue = repo.create_issue(
        title=result.get("issue_title") or "Automated change analysis",
        body=issue_body + footer,
        labels=merge_labels(result, severity),
    )
    print(f"Created issue #{issue.number}: {issue.title}")

    if event.pr_ref:
        summary = result.get("summary", "")
        if summary:
            pr_comment = (
                f"### AI Analysis Summary\n\n"
                f"{summary}\n\n"
                f"**Severity:** `{severity.upper()}` | **Role:** `{role_key}`\n\n"
                f"Full details: #{issue.number}"
            )
            event.pr_ref.create_issue_comment(pr_comment)
            print(f"Posted summary comment to PR #{event.pr_ref.number}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    """Run the full analysis pipeline. Returns a process exit code."""
    cfg = load_config()

    gh = Github(auth=Auth.Token(cfg.gh_token))
    repo = gh.get_repo(cfg.repo_name)

    if cfg.event_name == "push":
        event = collect_push_event(repo, cfg)
    else:
        event = collect_pr_event(repo, cfg)

    if len(event.diff_text.strip()) < MIN_DIFF_LENGTH:
        print("Diff too small to analyze. Skipping.")
        return 0

    if has_duplicate_issue(repo, event.dedup_key):
        return 0

    role_key = select_role(event.trigger_labels, event.changed_files,
                           event.diff_text, event.description)
    prompt = build_prompt(role_key, event)

    result = call_model(make_session(), cfg.model_token, prompt)
    publish_results(repo, cfg, event, role_key, result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
