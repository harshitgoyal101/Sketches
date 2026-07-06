from django.db import migrations
from django.utils.text import slugify


def _author_prefix(author):
    if author is not None:
        return slugify(author.username) or "user"
    return "sketches101"


def _unique_slug_for_sketch(sketch, Sketch):
    title_slug = slugify(sketch.title) or "sketch"
    prefix = _author_prefix(sketch.author)
    max_title_len = max(1, 200 - len(prefix) - 1)
    if len(title_slug) > max_title_len:
        title_slug = title_slug[:max_title_len].rstrip("-")
    base = f"{prefix}-{title_slug}"
    slug = base
    counter = 2
    while Sketch.objects.filter(slug=slug).exclude(pk=sketch.pk).exists():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def prefix_sketch_slugs_with_author(apps, schema_editor):
    Sketch = apps.get_model("sketches", "Sketch")
    User = apps.get_model("auth", "User")

    for sketch in Sketch.objects.iterator():
        author = User.objects.filter(pk=sketch.author_id).first() if sketch.author_id else None
        sketch.author = author
        new_slug = _unique_slug_for_sketch(sketch, Sketch)
        if sketch.slug != new_slug:
            Sketch.objects.filter(pk=sketch.pk).update(slug=new_slug)


class Migration(migrations.Migration):
    dependencies = [
        ("sketches", "0004_gallery_filter_models"),
    ]

    operations = [
        migrations.RunPython(prefix_sketch_slugs_with_author, migrations.RunPython.noop),
    ]
