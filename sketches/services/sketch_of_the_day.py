"""Deterministic sketch-of-the-day selection."""

from __future__ import annotations

import hashlib
from datetime import date, timedelta

from django.db.models import Count

from sketches.models import Sketch

PUBLISHED = Sketch.Status.PUBLISHED


def _published_ordered():
    return (
        Sketch.objects.filter(status=PUBLISHED)
        .select_related("author", "forked_from", "forked_from__author")
        .prefetch_related("tags", "assets")
        .annotate(fork_count=Count("forks"))
        .order_by("pk")
    )


def pick_sketch_for_date(day: date):
    """
    Same calendar date → same published sketch for all visitors.
    Uses a stable hash of YYYY-MM-DD over ordered published pks.
    """
    sketches = list(_published_ordered())
    if not sketches:
        return None
    digest = hashlib.sha256(day.isoformat().encode("utf-8")).hexdigest()
    index = int(digest[:12], 16) % len(sketches)
    return sketches[index]


def sketch_of_the_day_payload(*, today: date | None = None, trail_days: int = 7):
    today = today or date.today()
    current = pick_sketch_for_date(today)
    previous = []
    for offset in range(1, trail_days + 1):
        day = today - timedelta(days=offset)
        sketch = pick_sketch_for_date(day)
        if sketch is None:
            break
        previous.append(
            {
                "date": day.isoformat(),
                "slug": sketch.slug,
                "title": sketch.title,
            }
        )
    return today, current, previous
