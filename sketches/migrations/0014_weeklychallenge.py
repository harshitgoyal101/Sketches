# Generated manually for WeeklyChallenge

from datetime import date, timedelta

from django.db import migrations, models
import django.db.models.deletion


def seed_challenge(apps, schema_editor):
    Tag = apps.get_model("sketches", "Tag")
    WeeklyChallenge = apps.get_model("sketches", "WeeklyChallenge")
    tag, _ = Tag.objects.get_or_create(
        slug="generative-landscapes",
        defaults={
            "name": "Generative landscapes",
            "description": "Weekly challenge theme",
            "is_active": True,
            "sort_order": 50,
        },
    )
    today = date.today()
    # Align to Monday of current week through Sunday
    starts = today - timedelta(days=today.weekday())
    ends = starts + timedelta(days=6)
    WeeklyChallenge.objects.get_or_create(
        slug="generative-landscapes",
        defaults={
            "title": "Generative landscapes",
            "prompt": "Build a living landscape — noise, terrain, or weather as code.",
            "tag_id": tag.pk,
            "starts_on": starts,
            "ends_on": ends,
            "is_active": True,
        },
    )


def unseed_challenge(apps, schema_editor):
    WeeklyChallenge = apps.get_model("sketches", "WeeklyChallenge")
    WeeklyChallenge.objects.filter(slug="generative-landscapes").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("sketches", "0013_game_gamescore"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeeklyChallenge",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=120)),
                ("slug", models.SlugField(max_length=120, unique=True)),
                (
                    "prompt",
                    models.TextField(
                        blank=True,
                        help_text="Short description shown in the challenge strip.",
                    ),
                ),
                ("starts_on", models.DateField()),
                ("ends_on", models.DateField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "tag",
                    models.ForeignKey(
                        blank=True,
                        help_text="Gallery filter for submissions (?tag=).",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="challenges",
                        to="sketches.tag",
                    ),
                ),
            ],
            options={
                "verbose_name": "Weekly challenge",
                "verbose_name_plural": "Weekly challenges",
                "ordering": ["-starts_on", "-pk"],
            },
        ),
        migrations.RunPython(seed_challenge, unseed_challenge),
    ]
