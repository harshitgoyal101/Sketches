from django.conf import settings
from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from .models import Sketch, Tag

PUBLISHED = Sketch.Status.PUBLISHED


class SketchSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return Sketch.objects.filter(status=PUBLISHED, is_game=False)

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        if getattr(settings, "SPA_AT_ROOT", False):
            return f"/sketches/{obj.slug}"
        return reverse("sketch_detail", kwargs={"slug": obj.slug})


class GameSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.85

    def items(self):
        return Sketch.objects.filter(status=PUBLISHED, is_game=True)

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        return f"/games/{obj.slug}"


class TagSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.5

    def items(self):
        return Tag.objects.filter(sketches__status=PUBLISHED).distinct()

    def location(self, obj):
        if getattr(settings, "SPA_AT_ROOT", False):
            return f"/gallery?tag={obj.slug}"
        return reverse("tag_detail", kwargs={"slug": obj.slug})


class StaticViewSitemap(Sitemap):
    priority = 0.6
    changefreq = "monthly"

    def items(self):
        if getattr(settings, "SPA_AT_ROOT", False):
            return [
                "/",
                "/gallery",
                "/games",
                "/explore/today",
                "/sandbox",
            ]
        return ["home", "sketch_list"]

    def location(self, item):
        if item.startswith("/"):
            return item
        return reverse(item)
