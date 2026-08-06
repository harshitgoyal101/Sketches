from django.core.management.base import BaseCommand

from sketches.models import Sketch
from sketches.services.thumbnail_generator import (
    generate_sketch_app_icon,
    generate_sketch_thumbnail,
)


class Command(BaseCommand):
    help = "Generate gallery thumbnails and app icons for sketches (including games)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--slug",
            help="Only generate for a single sketch slug.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate even when media already exists.",
        )
        parser.add_argument(
            "--all-statuses",
            action="store_true",
            help="Include drafts (default: published only).",
        )
        parser.add_argument(
            "--thumbnails-only",
            action="store_true",
            help="Skip app icon generation.",
        )
        parser.add_argument(
            "--icons-only",
            action="store_true",
            help="Skip thumbnail generation.",
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

        do_thumbs = not options["icons_only"]
        do_icons = not options["thumbnails_only"]
        force = options["force"]

        thumb_ok = thumb_skip = icon_ok = icon_skip = 0
        for sketch in queryset.iterator():
            label = "game" if sketch.is_game else "sketch"
            if do_thumbs:
                if generate_sketch_thumbnail(sketch, force=force):
                    thumb_ok += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"[{label}] thumbnail {sketch.slug}")
                    )
                else:
                    thumb_skip += 1
                    self.stdout.write(f"[{label}] thumbnail skipped {sketch.slug}")
            if do_icons:
                # Reload so icon save sees any thumbnail field updates.
                sketch.refresh_from_db()
                if generate_sketch_app_icon(sketch, force=force):
                    icon_ok += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"[{label}] app icon {sketch.slug}")
                    )
                else:
                    icon_skip += 1
                    self.stdout.write(f"[{label}] app icon skipped {sketch.slug}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Thumbnails {thumb_ok} generated / {thumb_skip} skipped. "
                f"Icons {icon_ok} generated / {icon_skip} skipped."
            )
        )
