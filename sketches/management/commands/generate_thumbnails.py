from django.core.management.base import BaseCommand

from sketches.models import Sketch
from sketches.services.thumbnail_generator import generate_sketch_thumbnail


class Command(BaseCommand):
    help = "Generate gallery thumbnails for published sketches."

    def add_arguments(self, parser):
        parser.add_argument(
            "--slug",
            help="Only generate for a single sketch slug.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate even when a thumbnail already exists.",
        )
        parser.add_argument(
            "--all-statuses",
            action="store_true",
            help="Include drafts (default: published only).",
        )

    def handle(self, *args, **options):
        queryset = Sketch.objects.all().order_by("slug")
        if not options["all_statuses"]:
            queryset = queryset.filter(status=Sketch.Status.PUBLISHED)
        if options["slug"]:
            queryset = queryset.filter(slug=options["slug"])

        if not queryset.exists():
            self.stdout.write(self.style.WARNING("No matching sketches found."))
            return

        generated = 0
        skipped = 0
        for sketch in queryset.iterator():
            if generate_sketch_thumbnail(sketch, force=options["force"]):
                generated += 1
                self.stdout.write(self.style.SUCCESS(f"Generated thumbnail for {sketch.slug}"))
            else:
                skipped += 1
                self.stdout.write(f"Skipped {sketch.slug}")

        self.stdout.write(
            self.style.SUCCESS(f"Done. Generated {generated}, skipped {skipped}.")
        )
