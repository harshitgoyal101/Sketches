"""Current weekly challenge lookup."""

from __future__ import annotations

from datetime import date

from sketches.models import Sketch, WeeklyChallenge

PUBLISHED = Sketch.Status.PUBLISHED


def get_current_challenge(*, today: date | None = None):
    today = today or date.today()
    return (
        WeeklyChallenge.objects.filter(
            is_active=True,
            starts_on__lte=today,
            ends_on__gte=today,
        )
        .select_related("tag")
        .order_by("-starts_on", "-pk")
        .first()
    )


def serialize_challenge(challenge, request=None):
    tag = challenge.tag
    entry_count = 0
    if tag is not None:
        entry_count = (
            Sketch.objects.filter(status=PUBLISHED, tags=tag)
            .distinct()
            .count()
        )
    return {
        "title": challenge.title,
        "slug": challenge.slug,
        "prompt": challenge.prompt or "",
        "starts_on": challenge.starts_on.isoformat(),
        "ends_on": challenge.ends_on.isoformat(),
        "tag": (
            {"name": tag.name, "slug": tag.slug}
            if tag is not None
            else None
        ),
        "entry_count": entry_count,
        "gallery_url": (
            f"/gallery?tag={tag.slug}" if tag is not None else "/gallery"
        ),
    }
