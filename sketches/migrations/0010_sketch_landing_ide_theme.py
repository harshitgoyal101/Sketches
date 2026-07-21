from django.db import migrations, models


def migrate_landing_ide_to_dark_theme(apps, schema_editor):
    Sketch = apps.get_model("sketches", "Sketch")
    Sketch.objects.filter(is_landing_ide=True, landing_ide_theme="").update(
        landing_ide_theme="dark"
    )


class Migration(migrations.Migration):

    dependencies = [
        ("sketches", "0009_sketch_is_landing_ide"),
    ]

    operations = [
        migrations.AddField(
            model_name="sketch",
            name="landing_ide_theme",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "—"),
                    ("dark", "Dark theme"),
                    ("light", "Light theme"),
                ],
                default="",
                help_text="When set, this sketch opens from the home Interactive IDE section for that theme.",
                max_length=10,
            ),
        ),
        migrations.RunPython(migrate_landing_ide_to_dark_theme, migrations.RunPython.noop),
    ]
