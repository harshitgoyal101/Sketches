from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sketches", "0015_sketch_is_game"),
    ]

    operations = [
        migrations.AddField(
            model_name="sketch",
            name="scoreboard_slug",
            field=models.SlugField(
                blank=True,
                default="",
                help_text=(
                    "Game scoreboard slug for postMessage scores. "
                    "Blank defaults to this sketch's slug."
                ),
                max_length=80,
            ),
        ),
    ]
