import importlib.util
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location(
    "trigger_action", Path(__file__).resolve().parents[1] / "trigger action" / "trigger_action.py"
)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class TriggerActionTests(unittest.TestCase):
    def test_diff_limit_is_enforced_for_large_single_patch(self):
        diff, files = module.collect_diff([SimpleNamespace(filename="file.js", patch="x" * 500)], 40)
        self.assertEqual(files, ["file.js"])
        self.assertEqual(len(diff), 40 + len(module.TRUNCATION_MARKER))
        self.assertTrue(diff.endswith(module.TRUNCATION_MARKER))

    def test_permalink_uses_pr_head_and_only_changed_files(self):
        cfg = SimpleNamespace(commit_sha="merge-sha", repo_name="owner/repo")
        event = SimpleNamespace(pr_ref=SimpleNamespace(head=SimpleNamespace(sha="head-sha")), changed_files=["src/app.js"])
        result = {"issue_body": module.PERMALINK_PLACEHOLDER, "affected_file": "src/app.js", "affected_line": -1}
        self.assertEqual(module.resolve_issue_body(result, cfg, event), "https://github.com/owner/repo/blob/head-sha/src/app.js#L1")
        result["affected_file"] = "other.js"
        self.assertEqual(module.resolve_issue_body(result, cfg, event), "_No specific file identified_")

    def test_unexpected_model_label_types_are_ignored(self):
        self.assertEqual(module.merge_labels({"labels": ["bug", {}, "bug"]}, "high"), ["bug", "severity: high"])


if __name__ == "__main__":
    unittest.main()
