from django.db import migrations, models
import django.db.models.deletion


def seed_gallery_filters(apps, schema_editor):
    SketchFormat = apps.get_model("sketches", "SketchFormat")
    TagCategory = apps.get_model("sketches", "TagCategory")

    SketchFormat.objects.bulk_create(
        [
            SketchFormat(
                name="p5.js",
                slug="p5js",
                description="Interactive sketches built with p5.js",
                sort_order=0,
                is_active=True,
            ),
            SketchFormat(
                name="Processing",
                slug="processing",
                description="Processing (Java mode) sketches",
                sort_order=1,
                is_active=True,
            ),
        ],
        ignore_conflicts=True,
    )

    topics, _ = TagCategory.objects.get_or_create(
        slug="topics",
        defaults={
            "name": "Topics",
            "description": "Browse sketches by theme or subject",
            "sort_order": 0,
            "is_active": True,
        },
    )

    Tag = apps.get_model("sketches", "Tag")
    Tag.objects.filter(category__isnull=True).update(category=topics)


class Migration(migrations.Migration):

    dependencies = [
        ("sketches", "0003_sketch_is_home_background"),
    ]

    operations = [
        migrations.CreateModel(
            name="TagCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("slug", models.SlugField(max_length=100, unique=True)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "verbose_name_plural": "Tag categories",
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.CreateModel(
            name="SketchFormat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=50)),
                ("slug", models.SlugField(max_length=30, unique=True)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.AddField(
            model_name="tag",
            name="description",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="tag",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="tag",
            name="sort_order",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="tag",
            name="category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tags",
                to="sketches.tagcategory",
            ),
        ),
        migrations.AlterModelOptions(
            name="tag",
            options={"ordering": ["sort_order", "name"]},
        ),
        migrations.RunPython(seed_gallery_filters, migrations.RunPython.noop),
    ]
