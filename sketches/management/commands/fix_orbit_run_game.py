"""
Mark Orbit Run as a play-only game and align its scoreboard slug.

Finds sketches titled "Orbit Run" (or known production slugs) and sets:
  is_game=True, scoreboard_slug=orbit-run

Also ensures the Game scoreboard row exists.

Usage:
  python manage.py fix_orbit_run_game
  python manage.py fix_orbit_run_game --dry-run
"""

from django.core.management.base import BaseCommand
from django.db.models import Q

from sketches.models import Game, Sketch

ORBIT_SCOREBOARD = "orbit-run"
KNOWN_SLUGS = (
    "harshitgoyal101-untitled-sketch",
    "orbit-run",
    "harshitgoyal101-orbit-run",
)


class Command(BaseCommand):
    help = "Mark Orbit Run sketch(es) as games with scoreboard slug orbit-run."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print changes without saving.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        qs = Sketch.objects.filter(
            Q(title__iexact="Orbit Run") | Q(slug__in=KNOWN_SLUGS)
        )
        if not qs.exists():
            self.stdout.write(
                self.style.WARNING(
                    "No Orbit Run sketch found. Run: python manage.py load_orbit_run_sketch"
                )
            )
        else:
            for sketch in qs:
                self.stdout.write(
                    f"{'[dry-run] ' if dry_run else ''}"
                    f"Marking {sketch.slug!r} as game "
                    f"(scoreboard={ORBIT_SCOREBOARD})"
                )
                if not dry_run:
                    sketch.is_game = True
                    sketch.scoreboard_slug = ORBIT_SCOREBOARD
                    sketch.save(update_fields=["is_game", "scoreboard_slug"])

        game, created = Game.objects.get_or_create(
            slug=ORBIT_SCOREBOARD,
            defaults={
                "title": "Orbit Run",
                "description": "Survive the gravity well.",
                "max_score": 1_000_000,
                "is_active": True,
            },
        )
        if dry_run:
            self.stdout.write(
                f"[dry-run] Game {ORBIT_SCOREBOARD} "
                f"{'would be created' if created else 'exists'}"
            )
            return

        if not game.is_active:
            game.is_active = True
            game.save(update_fields=["is_active"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Game {ORBIT_SCOREBOARD} {'created' if created else 'ready'}."
            )
        )
