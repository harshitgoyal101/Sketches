from io import BytesIO

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand
from PIL import Image

from sketches.models import Sketch
from sketches.services.thumbnail_generator import (
    card_thumbnail_storage_name,
    save_sketch_thumbnail_bytes,
)


class Command(BaseCommand):
    help = (
        "Re-encode existing thumbnails to WebP and ensure a 640w card variant exists. "
        "Does not re-capture sketches."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--slug",
            help="Only recompress a single sketch slug.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing files.",
        )

    def handle(self, *args, **options):
        queryset = Sketch.objects.exclude(thumbnail="").exclude(thumbnail=None).order_by("slug")
        if options["slug"]:
            queryset = queryset.filter(slug=options["slug"])

        if not queryset.exists():
            self.stdout.write(self.style.WARNING("No sketches with thumbnails found."))
            return

        updated = 0
        skipped = 0
        failed = 0

        for sketch in queryset.iterator():
            name = sketch.thumbnail.name
            card_name = card_thumbnail_storage_name(name)
            needs_webp = not name.lower().endswith(".webp")
            needs_card = not default_storage.exists(card_name)

            if not needs_webp and not needs_card:
                skipped += 1
                self.stdout.write(f"OK {sketch.slug}")
                continue

            if options["dry_run"]:
                reasons = []
                if needs_webp:
                    reasons.append("png→webp")
                if needs_card:
                    reasons.append("add-640w")
                self.stdout.write(f"Would update {sketch.slug} ({', '.join(reasons)})")
                updated += 1
                continue

            try:
                with sketch.thumbnail.open("rb") as handle:
                    raw = handle.read()
                Image.open(BytesIO(raw)).load()
                if save_sketch_thumbnail_bytes(sketch, raw, force=True):
                    updated += 1
                    self.stdout.write(self.style.SUCCESS(f"Updated {sketch.slug}"))
                else:
                    skipped += 1
                    self.stdout.write(f"Skipped {sketch.slug}")
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(f"Failed {sketch.slug}: {exc}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Updated {updated}, skipped {skipped}, failed {failed}."
            )
        )
