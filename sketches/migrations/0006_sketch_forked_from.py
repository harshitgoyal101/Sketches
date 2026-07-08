from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("sketches", "0005_author_prefixed_sketch_slugs"),
    ]

    operations = [
        migrations.AddField(
            model_name="sketch",
            name="forked_from",
            field=models.ForeignKey(
                blank=True,
                help_text="Original sketch this copy was forked from.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="forks",
                to="sketches.sketch",
            ),
        ),
    ]
