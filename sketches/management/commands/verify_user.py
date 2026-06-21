from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = "Activate a user account without sending a verification email (dev only)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            help="Username to verify.",
        )
        parser.add_argument(
            "--email",
            help="Email address to verify.",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Verify every inactive user.",
        )
        parser.add_argument(
            "--list",
            action="store_true",
            help="List users waiting for email verification.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow running when DEBUG is False.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "Refusing to verify users when DEBUG is False. "
                "Use --force to override."
            )

        if options["list"]:
            self._list_unverified()
            return

        if options["all"]:
            users = User.objects.filter(is_active=False)
            if not users.exists():
                self.stdout.write(self.style.WARNING("No inactive users found."))
                return
            count = users.update(is_active=True)
            self.stdout.write(self.style.SUCCESS(f"Verified {count} user(s)."))
            return

        username = options.get("username")
        email = options.get("email")
        if not username and not email:
            raise CommandError("Provide --username, --email, --all, or --list.")

        user = self._get_user(username=username, email=email)
        if user.is_active:
            self.stdout.write(self.style.WARNING(f"{user.username} is already verified."))
            return

        user.is_active = True
        user.save(update_fields=["is_active"])
        self.stdout.write(
            self.style.SUCCESS(f"Verified {user.username} ({user.email}).")
        )

    def _get_user(self, username=None, email=None):
        if username:
            try:
                return User.objects.get(username=username)
            except User.DoesNotExist as exc:
                raise CommandError(f'No user with username "{username}".') from exc

        try:
            return User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise CommandError(f'No user with email "{email}".') from exc

    def _list_unverified(self):
        users = User.objects.filter(is_active=False).order_by("username")
        if not users.exists():
            self.stdout.write(self.style.WARNING("No inactive users found."))
            return

        self.stdout.write("Users waiting for verification:")
        for user in users:
            self.stdout.write(f"  - {user.username} <{user.email}>")
