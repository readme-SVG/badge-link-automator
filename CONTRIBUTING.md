## 1. Introduction

Thank you for your interest in contributing to this project. We welcome high-quality bug fixes, test improvements, documentation updates, and feature proposals that improve reliability, developer ergonomics, and long-term maintainability.

Please read this guide before opening an issue or pull request so we can keep triage and review fast, consistent, and fair for everyone.

## 2. I Have a Question

The GitHub issue tracker is reserved for:

- Reproducible bugs
- Actionable feature requests

Do not open issues for usage questions, troubleshooting requests, or general “how do I…” discussions.

For questions, use one of these channels:

- GitHub Discussions (preferred for project-specific Q&A)
- Stack Overflow (tag your question clearly with relevant ecosystem tags)
- Community channels maintained by the project team

If your question turns out to expose a real defect, open a bug report and include a minimal reproduction.

## 3. Reporting Bugs

High-quality bug reports are reproducible, scoped, and evidence-driven.

### Search Duplicates First

Before opening a new issue:

1. Search open issues.
2. Search recently closed issues.
3. If a similar report exists, add your reproduction details there instead of creating a duplicate.

### Required Environment Details

Include all of the following:

- OS and version (for example: Ubuntu 24.04, macOS 15.x, Windows 11)
- Runtime versions (for example: Node.js, npm, browser version)
- Project version/commit SHA/branch
- Any non-default configuration values relevant to the failure

### Steps to Reproduce

Provide a deterministic step-by-step algorithm:

1. Initial state and exact input
2. Command(s) executed or UI action sequence
3. Observed output/error/logs
4. Why the sequence should reproduce consistently

### Expected vs. Actual Behavior

Always include:

- Expected behavior (what should happen)
- Actual behavior (what happens instead)
- Impact level (blocking, degraded, cosmetic)

### Evidence Checklist

Attach as many as possible:

- Minimal reproduction repository or script
- Console output or stack traces
- Screenshots/screen recordings when UI behavior is involved
- Regression window (if known): “worked in X, broken in Y”

## 4. Suggesting Enhancements

Enhancement proposals should describe a problem, not just a solution idea.

### What to Include

- Problem statement: what pain point exists today?
- Justification: why this change matters now?
- Use cases: concrete real-world scenarios
- Proposed design: API shape, behavior changes, and migration impact
- Alternatives considered: what else was evaluated and why it was rejected

### Scope Expectations

- Keep proposals focused and reviewable.
- Break large architectural changes into phased milestones.
- Call out backward-compatibility risks explicitly.

## 5. Local Development / Setup

### Fork and Clone

```bash
# 1) Fork in GitHub UI, then clone your fork
git clone https://github.com/<your-username>/badge-link-automator.git
cd badge-link-automator

# 2) Add upstream remote
git remote add upstream https://github.com/<upstream-owner>/badge-link-automator.git
```

### Dependencies

This repository currently has no mandatory package-install step for local execution.

Optional tooling (recommended for contribution quality checks):

```bash
# Optional: run lint checks with Super-Linter via npx
npx super-linter
```

### Environment Variables

No `.env` setup is required for the current static-client architecture.

If a future change introduces environment-dependent behavior, contributors must:

1. Add `.env.example` with documented defaults
2. Document each variable in `README.md`
3. Ensure local fallback behavior is explicit and tested

### Running Locally

```bash
# Serve static files locally
python3 -m http.server 8080
# Open http://localhost:8080
```

## 6. Pull Request Process

### Branching Strategy

Use descriptive branch names:

- `feature/<short-description>`
- `bugfix/<issue-number-or-short-description>`
- `docs/<scope>`
- `chore/<scope>`

Examples:

- `feature/structured-log-filters`
- `bugfix/412-cache-expiry-boundary`
- `docs/contributing-guide`

### Commit Messages

This project follows Conventional Commits.

Use one of:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`
- `chore: ...`
- `ci: ...`

Examples:

- `feat: add transport-level metadata sanitizer`
- `fix: prevent cache read on malformed payload`
- `docs: clarify issue triage policy`

### Upstream Synchronization

Before opening or updating a PR:

```bash
git fetch upstream
git checkout main
git rebase upstream/main
git checkout <your-branch>
git rebase main
```

Resolve conflicts locally and retest before pushing.

### PR Description Requirements

Every PR body must include:

- Linked issue(s) (for example: `Closes #123`)
- Context and motivation
- Summary of implementation details
- Risk assessment and rollback considerations
- Test evidence (commands + outputs/screenshots where relevant)

PRs without sufficient context or validation evidence may be returned for updates.

## 7. Styleguides

### Code Quality and Formatting

The CI pipeline validates code with GitHub Super-Linter and CodeQL. Keep changes compliant with:

- JavaScript Standard style (`VALIDATE_JAVASCRIPT_STANDARD`)
- CSS linting (`VALIDATE_CSS`)
- HTML linting (`VALIDATE_HTML`)
- YAML linting (`VALIDATE_YAML`)

### Naming and Architecture Conventions

- Prefer explicit, intention-revealing identifiers.
- Keep functions single-purpose and side effects minimal.
- Maintain existing module boundaries (`assets/js`, `assets/i18n`, `assets/css`).
- Preserve i18n key consistency across locale dictionaries.
- Favor backward-compatible changes unless a breaking change is explicitly approved.

### Documentation Conventions

- Update `README.md` when behavior, setup, or configuration changes.
- Keep examples runnable and version-accurate.
- Prefer concise, implementation-aware phrasing over marketing language.

## 8. Testing

All bug fixes and new features must include relevant verification.

At minimum, run these checks locally before opening a PR:

```bash
# Syntax sanity check for main JS entrypoint
node --check assets/js/app.js

# Lint and policy checks (if available in your environment)
npx super-linter
```

For behavior changes, include reproducible manual test steps in the PR body:

- Input data used
- Expected output
- Actual output
- Screenshots or terminal logs when applicable

If you introduce test infrastructure (for example unit/integration tests), update this section with exact run commands and ensure CI executes them.

## 9. Code Review Process

After a PR is opened:

1. Automated checks run in CI (linting/security).
2. A maintainer reviews architecture, correctness, and regression risk.
3. At least one maintainer approval is required before merge.
4. All review comments must be addressed (code change or explicit rationale).
5. Author requests re-review after resolving feedback.

### Review Expectations

- Keep PRs focused and reasonably sized.
- Respond to feedback with concrete diffs, not only discussion.
- Preserve commit history clarity where practical.
- Do not merge with unresolved blocking conversations.

Maintainers may request additional tests, documentation, or scope reduction before approval.
