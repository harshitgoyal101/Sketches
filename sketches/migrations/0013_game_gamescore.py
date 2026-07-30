# Generated manually for Game + GameScore

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def seed_games(apps, schema_editor):
    Game = apps.get_model("sketches", "Game")
    defaults = [
        {
            "slug": "orbit-run",
            "title": "Orbit Run",
            "description": "Demo high-score game for guest → auth migration.",
            "max_score": 1_000_000,
        },
        {
            "slug": "sandbox-score",
            "title": "Sandbox Score",
            "description": "Generic score bucket for sandbox / embed posts.",
            "max_score": 1_000_000,
        },
    ]
    for row in defaults:
        Game.objects.get_or_create(slug=row["slug"], defaults=row)


def unseed_games(apps, schema_editor):
    Game = apps.get_model("sketches", "Game")
    Game.objects.filter(slug__in=["orbit-run", "sandbox-score"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("sketches", "0012_userprofile_guestmigrationlog"),
    ]

    operations = [
        migrations.CreateModel(
            name="Game",
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
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "max_score",
                    models.PositiveIntegerField(
                        default=1000000,
                        help_text="Reject submitted scores above this (anti-abuse).",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["title"],
            },
        ),
        migrations.CreateModel(
            name="GameScore",
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
                ("score", models.PositiveIntegerField()),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("played_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "guest_id",
                    models.CharField(
                        blank=True,
                        help_text="Guest id this score was migrated from, if any.",
                        max_length=64,
                    ),
                ),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="scores",
                        to="sketches.game",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="game_scores",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-score", "-played_at"],
            },
        ),
        migrations.AddIndex(
            model_name="gamescore",
            index=models.Index(
                fields=["game", "-score"], name="sketches_ga_game_id_7f0c0a_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="gamescore",
            index=models.Index(
                fields=["user", "game", "-score"],
                name="sketches_ga_user_id_6a1b2c_idx",
            ),
        ),
        migrations.RunPython(seed_games, unseed_games),
    ]
