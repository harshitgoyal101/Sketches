from .models import Sketch


def can_edit_sketch(user, sketch=None):
    """Authors may edit their own sketches; staff/admins may edit any sketch."""
    if not user.is_authenticated:
        return False
    if sketch is None:
        return True
    return user.is_staff or sketch.author_id == user.id


def can_access_sketch_editor(user, sketch):
    """Who may open the live IDE for a sketch.

    - Games: owner or staff only (play-only for everyone else).
    - Published non-games: anyone can open the browser editor.
    - Drafts: owner or staff only.
    """
    if getattr(sketch, "is_game", False):
        return can_edit_sketch(user, sketch)
    if sketch.status == Sketch.Status.PUBLISHED:
        return True
    return can_edit_sketch(user, sketch)


def can_fork_sketch(user, sketch):
    """Logged-in non-authors may fork published sketches into their own account.

    Games cannot be forked (keeps source private).
    """
    if getattr(sketch, "is_game", False):
        return False
    if not user.is_authenticated:
        return False
    if can_edit_sketch(user, sketch):
        return False
    return sketch.status == Sketch.Status.PUBLISHED
