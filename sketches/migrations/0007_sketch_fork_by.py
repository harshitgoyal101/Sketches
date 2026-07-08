from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_fork_by(apps, schema_editor):
    Sketch = apps.get_model("sketches", "Sketch")
    for sketch in Sketch.objects.filter(forked_from__isnull=False, fork_by__isnull=True):
        if sketch.author_id:
            sketch.fork_by_id = sketch.author_id
            sketch.save(update_fields=["fork_by"])


class Migration(migrations.Migration):
    dependencies = [
        ("sketches", "0006_sketch_forked_from"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="sketch",
            name="fork_by",
            field=models.ForeignKey(
                blank=True,
                editable=False,
                help_text="User who created this fork.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sketch_forks_created",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_fork_by, migrations.RunPython.noop),
    ]
