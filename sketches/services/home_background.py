from ..models import Sketch

PUBLISHED = Sketch.Status.PUBLISHED


def get_home_background_sketches():
    """Published sketches flagged as home/auth hero backgrounds (per theme)."""
    bg_qs = Sketch.objects.filter(status=PUBLISHED).prefetch_related("assets")
    dark = bg_qs.filter(home_background_theme=Sketch.HomeBackgroundTheme.DARK).first()
    light = bg_qs.filter(home_background_theme=Sketch.HomeBackgroundTheme.LIGHT).first()
    if not dark:
        dark = (
            bg_qs.filter(is_home_background=True, home_background_theme="").first()
            or bg_qs.filter(is_home_background=True).first()
        )
    return dark, light
