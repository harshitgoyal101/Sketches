"""
Legacy URLConf: Django HTML UI primary, React SPA under /app/.

Used when SPA_AT_ROOT is false (default during `manage.py test`).
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.urls import include, path, re_path

from sketches.sitemaps import SketchSitemap, StaticViewSitemap, TagSitemap
from sketches.views_spa import spa_app

sitemaps = {
    "sketches": SketchSitemap,
    "tags": TagSitemap,
    "static": StaticViewSitemap,
}

urlpatterns = [
    path("admin/", admin.site.urls),
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="sitemap"),
    path("api/", include("sketches.api.urls")),
    path("app/", spa_app, name="spa_app"),
    re_path(r"^app/(?P<path>.*)$", spa_app, name="spa_app_path"),
    path("", include("sketches.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
