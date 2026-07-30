"""Django endpoints that must remain when the React SPA owns the HTML UI."""

from django.urls import path

from . import views
from . import views_auth
from . import views_manage

urlpatterns = [
    path("interactive-ide/", views.landing_ide_redirect, name="landing_ide_redirect"),
    path("sketches/<slug:slug>/embed/", views.sketch_embed, name="sketch_embed"),
    path(
        "sketches/<slug:slug>/source/",
        views_manage.sketch_save_source,
        name="sketch_save_source",
    ),
    path("pygments.css", views.pygments_css, name="pygments_css"),
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
        "accounts/verify/<uidb64>/<token>/",
        views_auth.verify_email,
        name="verify_email",
    ),
    # Named routes kept for email templates / reverse(); they redirect into the SPA.
    path("accounts/login/", views_auth.spa_login_redirect, name="login"),
    path("accounts/signup/", views_auth.spa_signup_redirect, name="signup"),
    path("accounts/", views_auth.spa_account_redirect, name="account"),
    path(
        "accounts/password-reset/",
        views_auth.spa_password_reset_redirect,
        name="password_reset",
    ),
    path(
        "accounts/password-reset/done/",
        views_auth.spa_password_reset_done_redirect,
        name="password_reset_done",
    ),
    path(
        "accounts/password-reset/confirm/<uidb64>/<token>/",
        views_auth.spa_password_reset_confirm_redirect,
        name="password_reset_confirm",
    ),
    path(
        "accounts/password-reset/complete/",
        views_auth.spa_password_reset_complete_redirect,
        name="password_reset_complete",
    ),
    path(
        "accounts/verification-sent/",
        views_auth.spa_verification_sent_redirect,
        name="verification_sent",
    ),
    path(
        "accounts/resend-verification/",
        views_auth.spa_resend_verification_redirect,
        name="resend_verification",
    ),
]
