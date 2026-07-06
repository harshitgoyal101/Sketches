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
    thumbnail = models.ImageField(upload_to="thumbnails/", blank=True, null=True)
    is_home_background = models.BooleanField(
        default=False,
        help_text="Use this sketch as the animated background on the home page.",
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="sketches")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        if self.is_home_background and not self.is_p5js:
            self.is_home_background = False
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        if self.status == self.Status.DRAFT:
            self.published_at = None
        super().save(*args, **kwargs)
        if self.is_home_background:
            Sketch.objects.filter(is_home_background=True).exclude(pk=self.pk).update(
                is_home_background=False
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
