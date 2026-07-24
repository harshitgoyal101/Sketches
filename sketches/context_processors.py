from .services.home_background import get_home_background_sketches


def home_background_sketches(request):
    """Expose landing hero background sketches on auth pages."""
    if not request.path.startswith("/accounts/"):
        return {}
    dark, light = get_home_background_sketches()
    return {
        "background_sketch_dark": dark,
        "background_sketch_light": light,
        "background_sketch": dark or light,
    }
