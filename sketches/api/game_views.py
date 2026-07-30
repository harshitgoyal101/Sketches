"""Game score submission and leaderboards."""

from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods

from sketches.models import Game, GameScore
from sketches.services.game_scores import (
    best_score_for_user,
    create_score_for_user,
    parse_played_at,
)

from .auth_views import serialize_user
from .http import json_response, parse_json_body, require_login

LEADERBOARD_LIMIT = 20


def _serialize_score(row, *, include_user=True):
    data = {
        "id": row.pk,
        "game": row.game.slug,
        "score": row.score,
        "meta": row.meta if isinstance(row.meta, dict) else {},
        "played_at": row.played_at.isoformat(),
    }
    if include_user:
        data["user"] = {
            "id": row.user_id,
            "username": row.user.username,
            "display_name": serialize_user(row.user).get("display_name"),
        }
    return data


@require_GET
def api_game_list(request):
    games = Game.objects.filter(is_active=True)
    return json_response(
        {
            "results": [
                {
                    "slug": g.slug,
                    "title": g.title,
                    "description": g.description,
                    "max_score": g.max_score,
                }
                for g in games
            ]
        }
    )


@require_http_methods(["GET", "POST"])
def api_game_scores(request, slug):
    game = get_object_or_404(Game, slug=slug, is_active=True)

    if request.method == "GET":
        rows = (
            GameScore.objects.filter(game=game)
            .select_related("user", "user__profile")
            .order_by("-score", "-played_at")[: LEADERBOARD_LIMIT * 5]
        )
        seen = set()
        board = []
        for row in rows:
            if row.user_id in seen:
                continue
            seen.add(row.user_id)
            board.append(_serialize_score(row))
            if len(board) >= LEADERBOARD_LIMIT:
                break

        me = None
        if request.user.is_authenticated:
            best = best_score_for_user(request.user, game)
            if best:
                me = _serialize_score(best, include_user=False)

        return json_response(
            {
                "game": {
                    "slug": game.slug,
                    "title": game.title,
                    "max_score": game.max_score,
                },
                "results": board,
                "me": me,
            }
        )

    denied = require_login(request)
    if denied:
        return denied

    data = parse_json_body(request)
    try:
        score = int(data.get("score"))
    except (TypeError, ValueError):
        return json_response(
            {"ok": False, "errors": {"score": ["Score must be an integer."]}},
            status=400,
        )

    try:
        row, is_best = create_score_for_user(
            request.user,
            game,
            score=score,
            meta=data.get("meta") if isinstance(data.get("meta"), dict) else {},
            played_at=parse_played_at(data.get("played_at")),
        )
    except ValueError as exc:
        return json_response(
            {"ok": False, "errors": {"score": [str(exc)]}},
            status=400,
        )

    return json_response(
        {
            "ok": True,
            "score": _serialize_score(row),
            "is_personal_best": is_best,
        },
        status=201,
    )
