from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sketches", "0008_sketch_home_background_theme"),
    ]

    operations = [
        migrations.AddField(
            model_name="sketch",
            name="is_landing_ide",
            field=models.BooleanField(
                default=False,
                help_text="Link this sketch from the home page Interactive IDE section.",
            ),
        ),
    ]
