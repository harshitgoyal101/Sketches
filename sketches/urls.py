from django.urls import path

from . import views
from . import views_auth
from . import views_manage

urlpatterns = [
    path("", views.home, name="home"),
    path("interactive-ide/", views.landing_ide_redirect, name="landing_ide_redirect"),
    path("sketches/", views.sketch_list, name="sketch_list"),
    path("tags/<slug:slug>/", views.tag_detail, name="tag_detail"),
    path("sketches/<slug:slug>/", views.sketch_detail, name="sketch_detail"),
    path("sketches/<slug:slug>/embed/", views.sketch_embed, name="sketch_embed"),
    path(
        "sketches/<slug:slug>/media/<path:filename>",
        views.sketch_media_file,
        name="sketch_media_file",
    ),
    path(
        "sketches/<slug:slug>/source/",
        views_manage.sketch_save_source,
        name="sketch_save_source",
    ),
    path("pygments.css", views.pygments_css, name="pygments_css"),
    path("accounts/signup/", views_auth.signup, name="signup"),
    path("accounts/login/", views_auth.UserLoginView.as_view(), name="login"),
    path("accounts/logout/", views_auth.UserLogoutView.as_view(), name="logout"),
    path("accounts/", views_auth.account, name="account"),
    path("accounts/sketches/new/", views_manage.sketch_create, name="sketch_create"),
    path(
        "accounts/sketches/preview/",
        views_manage.sketch_preview_cache,
        name="sketch_preview_cache",
    ),
    path(
        "accounts/sketches/preview/<str:preview_id>/",
        views_manage.sketch_preview_embed,
        name="sketch_preview_embed",
    ),
    path(
        "accounts/sketches/<slug:slug>/edit/",
        views_manage.sketch_edit,
        name="sketch_edit",
    ),
    path(
        "accounts/sketches/<slug:slug>/fork/",
        views_manage.sketch_fork,
        name="sketch_fork",
    ),
    path(
        "accounts/sketches/<slug:slug>/settings/",
        views_manage.sketch_settings,
        name="sketch_settings",
    ),
    path(
        "accounts/sketches/<slug:slug>/settings/upload-thumbnail/",
        views_manage.sketch_upload_thumbnail,
        name="sketch_upload_thumbnail",
    ),
    path(
        "accounts/sketches/<slug:slug>/publish/",
        views_manage.sketch_publish,
        name="sketch_publish",
    ),
    path(
        "accounts/verify/<uidb64>/<token>/",
        views_auth.verify_email,
        name="verify_email",
    ),
    path(
        "accounts/verification-sent/",
        views_auth.verification_sent,
        name="verification_sent",
    ),
    path(
        "accounts/resend-verification/",
        views_auth.resend_verification,
        name="resend_verification",
    ),
    path(
        "accounts/password-reset/",
        views_auth.UserPasswordResetView.as_view(),
        name="password_reset",
    ),
    path(
        "accounts/password-reset/done/",
        views_auth.UserPasswordResetDoneView.as_view(),
        name="password_reset_done",
    ),
    path(
        "accounts/password-reset/confirm/<uidb64>/<token>/",
        views_auth.UserPasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(
        "accounts/password-reset/complete/",
        views_auth.UserPasswordResetCompleteView.as_view(),
        name="password_reset_complete",
    ),
]
