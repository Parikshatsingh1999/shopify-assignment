#!/usr/bin/env python3
"""
Validate `range` settings in this project's sections against Shopify's two
schema rules, neither of which `shopify theme check` enforces:

  1. (default - min) must be divisible by step
  2. (max - min) / step must be at most 101 steps

Both are rejected at upload time with a message that names the setting but not
the rule, which costs a `theme dev` round trip to discover. This catches them
before the push.

Usage:
    python3 bin/check-ranges.py          # exits non-zero on any violation
"""

import json
import pathlib
import re
import sys

SECTIONS = pathlib.Path(__file__).resolve().parent.parent / "sections"
SCHEMA = re.compile(r"\{%-?\s*schema\s*-?%\}(.*?)\{%-?\s*endschema\s*-?%\}", re.S)
MAX_STEPS = 101


def tenths(value):
    """Work in tenths so a 0.5 step doesn't trip over float representation."""
    return round(value * 10)


def check(setting):
    low, high, step, default = (
        setting["min"],
        setting["max"],
        setting["step"],
        setting["default"],
    )
    problems = []

    if tenths(step) == 0:
        return ["step is zero"]

    if (tenths(default) - tenths(low)) % tenths(step):
        problems.append(f"default {default} is not a step of {step} from {low}")

    if not low <= default <= high:
        problems.append(f"default {default} is outside {low}–{high}")

    steps = (tenths(high) - tenths(low)) / tenths(step)
    if steps > MAX_STEPS:
        problems.append(f"{steps:.0f} steps exceeds the {MAX_STEPS} limit")

    return problems


def main():
    failures = 0
    checked = 0

    for path in sorted(SECTIONS.glob("od-*.liquid")):
        match = SCHEMA.search(path.read_text())
        if not match:
            continue

        for setting in json.loads(match.group(1)).get("settings", []):
            if setting.get("type") != "range":
                continue

            checked += 1
            for problem in check(setting):
                failures += 1
                print(f"{path.name}: {setting['id']}: {problem}", file=sys.stderr)

    if failures:
        print(f"\n{failures} problem(s) in {checked} range settings", file=sys.stderr)
        return 1

    print(f"{checked} range settings OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
