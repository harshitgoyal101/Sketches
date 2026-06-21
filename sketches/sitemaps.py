from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from .models import Sketch, Tag

PUBLISHED = Sketch.Status.PUBLISHED


class SketchSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return Sketch.objects.filter(status=PUBLISHED)

    def lastmod(self, obj):
        return obj.updated_at


class TagSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.5

    def items(self):
        return Tag.objects.filter(sketches__status=PUBLISHED).distinct()

    def location(self, obj):
        return reverse("tag_detail", kwargs={"slug": obj.slug})


class StaticViewSitemap(Sitemap):
    priority = 0.6
    changefreq = "monthly"

    def items(self):
        return ["home", "sketch_list"]

    def location(self, item):
        return reverse(item)
