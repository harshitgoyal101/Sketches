"""
Production URLConf: React SPA at / with Django API + embed/auth backends.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.shortcuts import redirect
from django.urls import include, path, re_path

from sketches.sitemaps import GameSitemap, SketchSitemap, StaticViewSitemap, TagSitemap
from sketches.views_spa import spa_app

sitemaps = {
    "sketches": SketchSitemap,
    "games": GameSitemap,
    "tags": TagSitemap,
    "static": StaticViewSitemap,
}


def _redirect_legacy_app(request, path=""):
    target = f"/{path}" if path else "/"
    if request.META.get("QUERY_STRING"):
        target = f"{target}?{request.META['QUERY_STRING']}"
    return redirect(target, permanent=False)


urlpatterns = [
    path("admin/", admin.site.urls),
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="sitemap"),
    path("api/", include("sketches.api.urls")),
    path("", include("sketches.urls_backend")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    path("app/", _redirect_legacy_app),
    re_path(r"^app/(?P<path>.*)$", _redirect_legacy_app),
    path("", spa_app, name="spa_app"),
    re_path(r"^(?P<path>.*)$", spa_app, name="spa_app_path"),
]
