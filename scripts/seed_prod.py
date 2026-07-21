#!/usr/bin/env python3
"""
Convenience wrapper to seed production-required sketches101 data.

Run from the repo root (same environment as manage.py):

  python scripts/seed_prod.py
  python scripts/seed_prod.py --dry-run
  python scripts/seed_prod.py --skip-sketches
  python scripts/seed_prod.py --with-demo
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Seed production-required gallery formats, tags, and site sketches."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned changes without writing.",
    )
    parser.add_argument(
        "--skip-sketches",
        action="store_true",
        help="Only seed formats and tags.",
    )
    parser.add_argument(
        "--with-demo",
        action="store_true",
        help="Also load the optional demo sketch.",
    )
    args = parser.parse_args(argv)

    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)
    sys.path.insert(0, str(repo_root))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sketch_gallery.settings")

    import django

    django.setup()

    from django.core.management import call_command

    call_command(
        "seed_production_data",
        dry_run=args.dry_run,
        skip_sketches=args.skip_sketches,
        with_demo=args.with_demo,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
