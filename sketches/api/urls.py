from django.urls import path

from . import auth_views, game_views, manage_views, views

urlpatterns = [
    path("home/", views.api_home, name="api_home"),
    path("sketches/", views.api_sketch_list, name="api_sketch_list"),
    path("sketches/<slug:slug>/", views.api_sketch_detail, name="api_sketch_detail"),
    path("formats/", views.api_formats, name="api_formats"),
    path("tags/", views.api_tags, name="api_tags"),
    path("starters/", manage_views.api_starters, name="api_starters"),
    path("auth/csrf/", auth_views.api_csrf, name="api_csrf"),
    path("auth/me/", auth_views.api_me, name="api_me"),
    path("auth/login/", auth_views.api_login, name="api_login"),
    path("auth/logout/", auth_views.api_logout, name="api_logout"),
    path("auth/signup/", auth_views.api_signup, name="api_signup"),
    path(
        "auth/password-reset/",
        auth_views.api_password_reset,
        name="api_password_reset",
    ),
    path(
        "auth/password-reset/confirm/",
        auth_views.api_password_reset_confirm,
        name="api_password_reset_confirm",
    ),
    path(
        "auth/resend-verification/",
        auth_views.api_resend_verification,
        name="api_resend_verification",
    ),
    path("auth/google/", auth_views.api_google, name="api_google"),
    path(
        "auth/migrate-guest/",
        auth_views.api_migrate_guest,
        name="api_migrate_guest",
    ),
    path("games/", game_views.api_game_list, name="api_game_list"),
    path(
        "games/<slug:slug>/scores/",
        game_views.api_game_scores,
        name="api_game_scores",
    ),
    path(
        "account/tags/",
        manage_views.api_manage_tags,
        name="api_manage_tags",
    ),
    path(
        "account/sketches/",
        manage_views.api_account_sketches_collection,
        name="api_account_sketches",
    ),
    path(
        "account/sketches/<slug:slug>/",
        manage_views.api_account_sketch_detail,
        name="api_account_sketch_detail",
    ),
    path(
        "account/sketches/<slug:slug>/settings/",
        manage_views.api_account_sketch_settings,
        name="api_account_sketch_settings",
    ),
    path(
        "account/sketches/<slug:slug>/publish/",
        manage_views.api_account_sketch_publish,
        name="api_account_sketch_publish",
    ),
    path(
        "account/sketches/<slug:slug>/thumbnail/",
        manage_views.api_account_sketch_thumbnail,
        name="api_account_sketch_thumbnail",
    ),
    path(
        "account/sketches/<slug:slug>/app-icon/",
        manage_views.api_account_sketch_app_icon,
        name="api_account_sketch_app_icon",
    ),
    path("preview/", manage_views.api_preview, name="api_preview"),
    path(
        "account/sketches/<slug:slug>/source/",
        manage_views.api_account_sketch_source,
        name="api_account_sketch_source",
    ),
    path(
        "sketches/<slug:slug>/fork/",
        manage_views.api_fork_sketch,
        name="api_fork_sketch",
    ),
]
