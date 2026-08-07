"""Shared helpers for creating and validating game scores."""

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.text import slugify

from sketches.models import Game, GameScore

SCORE_HISTORY_CAP_PER_USER_GAME = 50


def resolve_scoreboard_slug(sketch):
    """Return the Game slug this sketch should post scores to."""
    raw = (getattr(sketch, "scoreboard_slug", None) or "").strip()
    if raw:
        return raw[:80]
    return (sketch.slug or slugify(sketch.title) or "game")[:80]


def ensure_scoreboard_for_sketch(sketch):
    """Create/activate a Game row when a sketch is listed as a playable game.

    Settings can point scoreboard_slug at an existing board (e.g. orbit-run).
    If none exists yet, create one named after the sketch so Scores/API work.
    """
    if not getattr(sketch, "is_game", False):
        return None

    slug = resolve_scoreboard_slug(sketch)
    if not sketch.scoreboard_slug:
        sketch.scoreboard_slug = slug
        sketch.save(update_fields=["scoreboard_slug"])

    description = (sketch.description or "").strip()
    game, created = Game.objects.get_or_create(
        slug=slug,
        defaults={
            "title": sketch.title or slug,
            "description": description,
            "max_score": 1_000_000,
            "is_active": True,
        },
    )
    if not created and not game.is_active:
        game.is_active = True
        game.save(update_fields=["is_active"])
    return game


def parse_played_at(value):
    if not value:
        return timezone.now()
    if isinstance(value, str):
        dt = parse_datetime(value)
        if dt is None:
            return timezone.now()
        if timezone.is_naive(dt):
            return timezone.make_aware(dt, timezone.get_current_timezone())
        return dt
    return timezone.now()


def best_score_for_user(user, game):
    return (
        GameScore.objects.filter(user=user, game=game)
        .order_by("-score", "-played_at")
        .first()
    )


def trim_score_history(user, game):
    ids = list(
        GameScore.objects.filter(user=user, game=game)
        .order_by("-score", "-played_at")
        .values_list("pk", flat=True)[SCORE_HISTORY_CAP_PER_USER_GAME:]
    )
    if ids:
        GameScore.objects.filter(pk__in=ids).delete()


def create_score_for_user(user, game, *, score, meta=None, played_at=None, guest_id=""):
    """Insert a score run; returns (row, is_personal_best)."""
    score = int(score)
    if score < 0 or score > game.max_score:
        raise ValueError(f"Score must be between 0 and {game.max_score}.")
    previous = best_score_for_user(user, game)
    row = GameScore.objects.create(
        user=user,
        game=game,
        score=score,
        meta=meta if isinstance(meta, dict) else {},
        played_at=played_at or timezone.now(),
        guest_id=(guest_id or "")[:64],
    )
    trim_score_history(user, game)
    is_best = previous is None or score > previous.score
    return row, is_best
