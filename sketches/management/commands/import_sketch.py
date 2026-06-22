from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from sketches.services.sketch_filesystem import get_sketch_projects_root, import_sketch

User = get_user_model()


class Command(BaseCommand):
    help = "Import a sketch from a sketch_projects/<slug>/ folder into the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "path",
            nargs="?",
            help="Path to a sketch folder. Defaults to sketch_projects/<slug> when --slug is set.",
        )
        parser.add_argument(
            "--slug",
            help="Import sketch_projects/<slug>/ by name.",
        )
        parser.add_argument(
            "--username",
            help="Assign the imported sketch to this user as author.",
        )

    def handle(self, *args, **options):
        folder = options.get("path")
        slug = options.get("slug")

        if not folder and slug:
            folder = get_sketch_projects_root() / slug
        elif not folder:
            raise CommandError("Provide a folder path or --slug.")

        folder = Path(folder)
        author = None
        username = options.get("username")
        if username:
            try:
                author = User.objects.get(username=username)
            except User.DoesNotExist as exc:
                raise CommandError(f'No user "{username}".') from exc

        sketch = import_sketch(folder, author=author)
        self.stdout.write(
            self.style.SUCCESS(f'Imported "{sketch.title}" ({sketch.slug}) from {folder}')
        )
