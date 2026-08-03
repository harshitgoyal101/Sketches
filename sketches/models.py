from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class TagCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "Tag categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    category = models.ForeignKey(
        TagCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tags",
    )
    description = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class SketchFormat(models.Model):
    """Admin-managed sketch format filters shown in the gallery (maps to Sketch.sketch_type)."""

    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=30, unique=True)
    description = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Sketch(models.Model):
    class SketchType(models.TextChoices):
        P5JS = "p5js", "p5.js"
        PROCESSING = "processing", "Processing"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    sketch_type = models.CharField(
        max_length=20,
        choices=SketchType.choices,
        default=SketchType.P5JS,
    )
    description = models.TextField(blank=True, help_text="Markdown supported.")
    entry_filename = models.CharField(
        max_length=100,
        default="sketch.js",
        help_text="Filename shown for the main source file.",
    )
    code = models.TextField(help_text="Main sketch source code (entry point).")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sketches",
    )
    forked_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="forks",
        help_text="Original sketch this copy was forked from.",
    )
    fork_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sketch_forks_created",
        editable=False,
        help_text="User who created this fork.",
    )
    thumbnail = models.ImageField(upload_to="thumbnails/", blank=True, null=True)
    app_icon = models.ImageField(
        upload_to="app_icons/",
        blank=True,
        null=True,
        help_text="Square app-style icon for mobile gallery lists (recommended 192×192).",
    )
    is_home_background = models.BooleanField(
        default=False,
        help_text="Use this sketch as an animated home-page background (see theme).",
    )

    class HomeBackgroundTheme(models.TextChoices):
        DARK = "dark", "Dark theme"
        LIGHT = "light", "Light theme"

    home_background_theme = models.CharField(
        max_length=10,
        blank=True,
        default="",
        choices=[("", "—")] + list(HomeBackgroundTheme.choices),
        help_text="When set, this sketch is the home hero background for that theme.",
    )
    is_landing_ide = models.BooleanField(
        default=False,
        help_text="Link this sketch from the home page Interactive IDE section.",
    )
    landing_ide_theme = models.CharField(
        max_length=10,
        blank=True,
        default="",
        choices=[("", "—")] + list(HomeBackgroundTheme.choices),
        help_text="When set, this sketch opens from the home Interactive IDE section for that theme.",
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="sketches")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title

    @property
    def thumbnail_card_url(self):
        """URL for the 640w gallery card variant when present."""
        if not self.thumbnail:
            return ""
        from django.core.files.storage import default_storage
        from sketches.services.thumbnail_generator import card_thumbnail_storage_name

        card_name = card_thumbnail_storage_name(self.thumbnail.name)
        if card_name and default_storage.exists(card_name):
            return default_storage.url(card_name)
        return self.thumbnail.url

    @property
    def thumbnail_srcset(self):
        """Responsive srcset for gallery cards (640w + full)."""
        if not self.thumbnail:
            return ""
        from django.core.files.storage import default_storage
        from sketches.services.thumbnail_generator import card_thumbnail_storage_name

        parts = []
        card_name = card_thumbnail_storage_name(self.thumbnail.name)
        if card_name and default_storage.exists(card_name):
            parts.append(f"{default_storage.url(card_name)} 640w")
        parts.append(f"{self.thumbnail.url} 1280w")
        return ", ".join(parts)

    @property
    def app_icon_url(self):
        """URL for the square mobile app icon when present."""
        if self.app_icon:
            return self.app_icon.url
        return ""

    def _author_slug_prefix(self):
        author = self.author
        if author is not None:
            return slugify(author.username) or "user"
        return "sketches101"

    def _unique_slug(self, base):
        title_slug = slugify(base) or "sketch"
        prefix = self._author_slug_prefix()
        max_title_len = max(1, 200 - len(prefix) - 1)
        if len(title_slug) > max_title_len:
            title_slug = title_slug[:max_title_len].rstrip("-")
        base = f"{prefix}-{title_slug}"
        slug = base
        counter = 2
        queryset = Sketch.objects.all()
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)
        while queryset.filter(slug=slug).exists():
            slug = f"{base}-{counter}"
            counter += 1
        return slug

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._unique_slug(self.title)
        if self.home_background_theme and not self.is_p5js:
            self.home_background_theme = ""
        if self.home_background_theme:
            self.is_home_background = True
        if self.is_home_background and not self.is_p5js:
            self.is_home_background = False
            self.home_background_theme = ""
        if self.is_home_background and not self.home_background_theme:
            # Legacy single-flag sketches default to the dark hero.
            self.home_background_theme = self.HomeBackgroundTheme.DARK
        if self.landing_ide_theme and not self.is_p5js:
            self.landing_ide_theme = ""
        if self.landing_ide_theme:
            self.is_landing_ide = True
        if self.is_landing_ide and not self.is_p5js:
            self.is_landing_ide = False
            self.landing_ide_theme = ""
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        if self.status == self.Status.DRAFT:
            self.published_at = None
        super().save(*args, **kwargs)
        if self.home_background_theme:
            Sketch.objects.filter(
                home_background_theme=self.home_background_theme
            ).exclude(pk=self.pk).update(
                home_background_theme="",
                is_home_background=False,
            )
            # Drop legacy unthemed home backgrounds once a themed one exists.
            Sketch.objects.filter(
                is_home_background=True,
                home_background_theme="",
            ).exclude(pk=self.pk).update(is_home_background=False)
        elif self.is_home_background:
            Sketch.objects.filter(is_home_background=True).exclude(pk=self.pk).update(
                is_home_background=False,
                home_background_theme="",
            )
        if self.landing_ide_theme:
            Sketch.objects.filter(
                landing_ide_theme=self.landing_ide_theme
            ).exclude(pk=self.pk).update(
                landing_ide_theme="",
                is_landing_ide=False,
            )
        elif self.is_landing_ide:
            Sketch.objects.filter(is_landing_ide=True).exclude(pk=self.pk).update(
                is_landing_ide=False,
                landing_ide_theme="",
            )

    @property
    def is_interactive(self):
        return self.sketch_type in (self.SketchType.P5JS, self.SketchType.PROCESSING)

    @property
    def is_p5js(self):
        return self.sketch_type == self.SketchType.P5JS

    @property
    def is_processing(self):
        return self.sketch_type == self.SketchType.PROCESSING

    def default_entry_filename(self):
        if self.sketch_type == self.SketchType.PROCESSING:
            return "sketch.pde"
        return "sketch.js"

    def get_code_language(self):
        if self.sketch_type == self.SketchType.PROCESSING:
            return "java"
        return "javascript"

    def get_source_files(self):
        """Return ordered list of source files: main entry first, then assets."""
        files = [
            {
                "filename": self.entry_filename,
                "content": self.code,
                "language": self.get_code_language(),
                "is_main": True,
                "asset_type": "js",
                "asset_id": None,
            }
        ]
        for asset in self.assets.all():
            files.append(
                {
                    "filename": asset.filename,
                    "content": asset.content,
                    "language": asset.get_language(),
                    "is_main": False,
                    "asset_type": asset.asset_type,
                    "asset_id": asset.pk,
                }
            )
        return files

    def get_embed_scripts(self):
        """JS source strings to load in the embed iframe, in order."""
        scripts = [asset.content for asset in self.assets.filter(asset_type="js")]
        scripts.append(self.code)
        return scripts


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=80, blank=True)

    def __str__(self):
        return self.display_name or self.user.get_username()


class GuestMigrationLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guest_migrations",
    )
    guest_id = models.CharField(max_length=64)
    migrated_at = models.DateTimeField(auto_now_add=True)
    payload_hash = models.CharField(max_length=64, blank=True)
    result = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "guest_id"],
                name="unique_guest_migration_per_user",
            )
        ]

    def __str__(self):
        return f"{self.user_id}:{self.guest_id}"


class Game(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    max_score = models.PositiveIntegerField(
        default=1_000_000,
        help_text="Reject submitted scores above this (anti-abuse).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:80]
        super().save(*args, **kwargs)


class GameScore(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_scores",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="scores",
    )
    score = models.PositiveIntegerField()
    meta = models.JSONField(default=dict, blank=True)
    played_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    guest_id = models.CharField(
        max_length=64,
        blank=True,
        help_text="Guest id this score was migrated from, if any.",
    )

    class Meta:
        ordering = ["-score", "-played_at"]
        indexes = [
            models.Index(fields=["game", "-score"]),
            models.Index(fields=["user", "game", "-score"]),
        ]

    def __str__(self):
        return f"{self.user_id} {self.game_id}={self.score}"


class SketchAsset(models.Model):
    class AssetType(models.TextChoices):
        JS = "js", "JavaScript"
        CSS = "css", "CSS"
        JSON = "json", "JSON"
        OTHER = "other", "Other"

    sketch = models.ForeignKey(
        Sketch,
        on_delete=models.CASCADE,
        related_name="assets",
    )
    filename = models.CharField(max_length=200, help_text="e.g. particle.js")
    content = models.TextField()
    asset_type = models.CharField(
        max_length=20,
        choices=AssetType.choices,
        default=AssetType.JS,
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "filename"]
        unique_together = [["sketch", "filename"]]

    def __str__(self):
        return self.filename

    def get_language(self):
        ext = self.filename.rsplit(".", 1)[-1].lower() if "." in self.filename else ""
        return {
            "js": "javascript",
            "pde": "java",
            "css": "css",
            "json": "json",
        }.get(ext, "javascript")


class WeeklyChallenge(models.Model):
    """Lightweight weekly prompt — strip links into gallery via tag."""

    title = models.CharField(max_length=120)
    slug = models.SlugField(max_length=120, unique=True)
    prompt = models.TextField(
        blank=True,
        help_text="Short description shown in the challenge strip.",
    )
    tag = models.ForeignKey(
        Tag,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="challenges",
        help_text="Gallery filter for submissions (?tag=).",
    )
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-starts_on", "-pk"]
        verbose_name = "Weekly challenge"
        verbose_name_plural = "Weekly challenges"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:120]
        super().save(*args, **kwargs)
