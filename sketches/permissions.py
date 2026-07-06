from .models import Sketch


def can_edit_sketch(user, sketch=None):
    """Authors may edit their own sketches; staff may edit any sketch."""
    if not user.is_authenticated:
        return False
    if sketch is None:
        return True
    return user.is_staff or sketch.author_id == user.id


def can_access_sketch_editor(user, sketch):
    """Published sketches are editable in the browser by anyone; drafts stay private."""
    if sketch.status == Sketch.Status.PUBLISHED:
        return True
    return can_edit_sketch(user, sketch)
