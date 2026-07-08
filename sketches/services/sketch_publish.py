from .thumbnail_generator import schedule_sketch_thumbnail_generation


def publish_sketch(sketch, *, generate_thumbnail=True):
    """Mark a sketch published and optionally generate its thumbnail."""
    from ..models import Sketch

    sketch.status = Sketch.Status.PUBLISHED
    sketch.save()
    if generate_thumbnail and not sketch.thumbnail:
        schedule_sketch_thumbnail_generation(sketch)
    return sketch
