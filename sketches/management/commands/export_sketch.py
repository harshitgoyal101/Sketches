from django.core.management.base import BaseCommand, CommandError

from sketches.models import Sketch
from sketches.services.sketch_filesystem import export_sketch, get_sketch_projects_root


class Command(BaseCommand):
    help = "Export sketch(s) from the database to sketch_projects/<slug>/ folders."

    def add_arguments(self, parser):
        parser.add_argument(
            "slug",
            nargs="?",
            help="Sketch slug to export. Omit with --all to export every sketch.",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Export every sketch.",
        )

    def handle(self, *args, **options):
        if options["all"]:
            sketches = Sketch.objects.prefetch_related("assets", "tags").order_by("slug")
            if not sketches.exists():
                raise CommandError("No sketches in the database.")
            for sketch in sketches:
                folder = export_sketch(sketch)
                self.stdout.write(self.style.SUCCESS(f"Exported {sketch.slug} → {folder}"))
            self.stdout.write(self.style.SUCCESS(f"Done. Projects root: {get_sketch_projects_root()}"))
            return

        slug = options.get("slug")
        if not slug:
            raise CommandError("Provide a sketch slug or use --all.")

        try:
            sketch = Sketch.objects.prefetch_related("assets", "tags").get(slug=slug)
        except Sketch.DoesNotExist as exc:
            raise CommandError(f'No sketch with slug "{slug}".') from exc

        folder = export_sketch(sketch)
        self.stdout.write(self.style.SUCCESS(f"Exported {sketch.slug} → {folder}"))
