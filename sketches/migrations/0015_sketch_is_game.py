from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sketches", "0014_weeklychallenge"),
    ]

    operations = [
        migrations.AddField(
            model_name="sketch",
            name="is_game",
            field=models.BooleanField(
                default=False,
                help_text="List on the Games page as play-only (no public source, fork, or edit).",
            ),
        ),
    ]
