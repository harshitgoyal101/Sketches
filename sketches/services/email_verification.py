from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .email_branding import email_brand_context, site_base_url


def _build_absolute_link(request, path):
    if request:
        return request.build_absolute_uri(path)
    return f"{site_base_url()}{path}"


def _verification_url(request, user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    path = reverse("verify_email", kwargs={"uidb64": uid, "token": token})
    return _build_absolute_link(request, path)


def send_verification_email(request, user):
    verify_url = _verification_url(request, user)
    context = {
        **email_brand_context(),
        "user": user,
        "verify_url": verify_url,
    }
    subject = render_to_string(
        "registration/email/verify_email_subject.txt",
        context,
        request=request,
    ).strip()
    text_body = render_to_string(
        "registration/email/verify_email_body.txt",
        context,
        request=request,
    )
    html_body = render_to_string(
        "registration/email/verify_email_body.html",
        context,
        request=request,
    )
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    message.attach_alternative(html_body, "text/html")
    message.send(fail_silently=False)
