"""
Seed data required for a production sketches101 deploy.

Idempotent: safe to re-run. Ensures gallery filters, home background meshes,
and landing Interactive IDE sketches exist.

Usage:
  python manage.py seed_production_data
  python manage.py seed_production_data --dry-run
  python manage.py seed_production_data --skip-sketches
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from sketches.models import SketchFormat, Tag, TagCategory

SKETCH_FORMATS = (
    {
        "slug": "p5js",
        "name": "p5.js",
        "description": "Interactive sketches built with p5.js",
        "sort_order": 0,
    },
    {
        "slug": "processing",
        "name": "Processing",
        "description": "Processing (Java mode) sketches",
        "sort_order": 1,
    },
)

TAG_CATEGORIES = (
    {
        "slug": "topics",
        "name": "Topics",
        "description": "Browse sketches by theme or subject",
        "sort_order": 0,
    },
    {
        "slug": "techniques",
        "name": "Techniques",
        "description": "Filter by coding technique or visual approach",
        "sort_order": 1,
    },
)

TAGS = (
    # Topics
    {"slug": "particles", "name": "Particles", "category": "topics", "sort_order": 0},
    {"slug": "network", "name": "Network", "category": "topics", "sort_order": 1},
    {"slug": "generative", "name": "Generative", "category": "topics", "sort_order": 2},
    {"slug": "simulation", "name": "Simulation", "category": "topics", "sort_order": 3},
    {"slug": "interactive", "name": "Interactive", "category": "topics", "sort_order": 4},
    {"slug": "3d", "name": "3D", "category": "topics", "sort_order": 5},
    # Techniques
    {"slug": "webgl", "name": "WEBGL", "category": "techniques", "sort_order": 0},
    {"slug": "noise", "name": "Noise", "category": "techniques", "sort_order": 1},
    {"slug": "vectors", "name": "Vectors", "category": "techniques", "sort_order": 2},
    {"slug": "shader", "name": "Shader", "category": "techniques", "sort_order": 3},
)


class Command(BaseCommand):
    help = (
        "Seed production-required gallery formats, tag taxonomy, "
        "home background sketches, and landing IDE sketches."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created/updated without writing to the database.",
        )
        parser.add_argument(
            "--skip-sketches",
            action="store_true",
            help="Only seed formats and tags; skip home/IDE sketch loaders.",
        )
        parser.add_argument(
            "--with-demo",
            action="store_true",
            help="Also load the demo Flow Loop sketch (optional sample content).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        skip_sketches = options["skip_sketches"]
        with_demo = options["with_demo"]

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — no changes will be saved."))

        with transaction.atomic():
            self._seed_formats(dry_run=dry_run)
            self._seed_tag_categories(dry_run=dry_run)
            self._seed_tags(dry_run=dry_run)

            if dry_run:
                transaction.set_rollback(True)

        if skip_sketches:
            self.stdout.write(self.style.NOTICE("Skipped sketch loaders (--skip-sketches)."))
        elif dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    "Would run: load_theme_background_sketches, load_landing_ide_sketch"
                    + (", load_demo_sketch" if with_demo else "")
                )
            )
        else:
            self.stdout.write("Loading theme background sketches…")
            call_command("load_theme_background_sketches")
            self.stdout.write("Loading landing Interactive IDE sketches…")
            call_command("load_landing_ide_sketch")
            if with_demo:
                self.stdout.write("Loading demo sketch…")
                call_command("load_demo_sketch")

        self.stdout.write(self.style.SUCCESS("Production seed complete."))

    def _seed_formats(self, *, dry_run):
        for spec in SKETCH_FORMATS:
            existing = SketchFormat.objects.filter(slug=spec["slug"]).first()
            if existing:
                changed = any(getattr(existing, k) != v for k, v in spec.items() if k != "slug")
                action = "Would update" if dry_run and changed else ("Update" if changed else "Keep")
                if changed and not dry_run:
                    for key, value in spec.items():
                        setattr(existing, key, value)
                    existing.is_active = True
                    existing.save()
                self.stdout.write(f"  {action} format: {spec['slug']}")
            else:
                action = "Would create" if dry_run else "Create"
                if not dry_run:
                    SketchFormat.objects.create(is_active=True, **spec)
                self.stdout.write(self.style.SUCCESS(f"  {action} format: {spec['slug']}"))

    def _seed_tag_categories(self, *, dry_run):
        for spec in TAG_CATEGORIES:
            existing = TagCategory.objects.filter(slug=spec["slug"]).first()
            if existing:
                changed = any(getattr(existing, k) != v for k, v in spec.items() if k != "slug")
                action = "Would update" if dry_run and changed else ("Update" if changed else "Keep")
                if changed and not dry_run:
                    for key, value in spec.items():
                        setattr(existing, key, value)
                    existing.is_active = True
                    existing.save()
                self.stdout.write(f"  {action} tag category: {spec['slug']}")
            else:
                action = "Would create" if dry_run else "Create"
                if not dry_run:
                    TagCategory.objects.create(is_active=True, **spec)
                self.stdout.write(
                    self.style.SUCCESS(f"  {action} tag category: {spec['slug']}")
                )

    def _seed_tags(self, *, dry_run):
        categories = {c.slug: c for c in TagCategory.objects.all()}
        for spec in TAGS:
            category_slug = spec["category"]
            category = categories.get(category_slug)
            if category is None and not dry_run:
                self.stdout.write(
                    self.style.ERROR(
                        f"  Missing category '{category_slug}' for tag '{spec['slug']}'"
                    )
                )
                continue

            defaults = {
                "name": spec["name"],
                "sort_order": spec["sort_order"],
                "category": category,
                "is_active": True,
            }
            existing = Tag.objects.filter(slug=spec["slug"]).first()
            if existing:
                changed = (
                    existing.name != defaults["name"]
                    or existing.sort_order != defaults["sort_order"]
                    or existing.category_id != (category.id if category else None)
                    or not existing.is_active
                )
                action = "Would update" if dry_run and changed else ("Update" if changed else "Keep")
                if changed and not dry_run:
                    for key, value in defaults.items():
                        setattr(existing, key, value)
                    existing.save()
                self.stdout.write(f"  {action} tag: {spec['slug']}")
            else:
                action = "Would create" if dry_run else "Create"
                if not dry_run and category is not None:
                    Tag.objects.create(slug=spec["slug"], **defaults)
                self.stdout.write(self.style.SUCCESS(f"  {action} tag: {spec['slug']}"))
