"""Backfill Game scoreboard rows for published is_game sketches.

Use after enabling List as game on existing sketches, or after deploy of
auto-create-on-settings, to repair boards that were never created.

  python manage.py ensure_game_scoreboards
"""

from django.core.management.base import BaseCommand

from sketches.models import Game, Sketch
from sketches.services.game_scores import ensure_scoreboard_for_sketch, resolve_scoreboard_slug


class Command(BaseCommand):
    help = "Ensure every is_game sketch has an active Game scoreboard row."

    def handle(self, *args, **options):
        qs = Sketch.objects.filter(is_game=True).order_by("pk")
        created = 0
        ensured = 0
        for sketch in qs:
            before_slug = resolve_scoreboard_slug(sketch)
            existed = Game.objects.filter(slug=before_slug).exists()
            game = ensure_scoreboard_for_sketch(sketch)
            ensured += 1
            if game and not existed:
                created += 1
                self.stdout.write(
                    f"Created scoreboard {game.slug} for sketch {sketch.slug}"
                )
            else:
                self.stdout.write(
                    f"OK {sketch.slug} → {resolve_scoreboard_slug(sketch)}"
                )
        self.stdout.write(
            self.style.SUCCESS(
                f"Ensured {ensured} game sketch(es); created {created} scoreboard(s)."
            )
        )
