from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_contact_email(*, name, email, subject, message):
    site_name = getattr(settings, "SITE_NAME", "sketches101")
    to_email = getattr(settings, "CONTACT_EMAIL", "") or settings.DEFAULT_FROM_EMAIL
    display_subject = subject or "New message"
    context = {
        "site_name": site_name,
        "name": name,
        "email": email,
        "subject": display_subject,
        "message": message,
    }
    mail_subject = f"[{site_name}] Contact: {display_subject}"
    text_body = render_to_string("registration/email/contact_email.txt", context)
    html_body = render_to_string("registration/email/contact_email.html", context)
    mail = EmailMultiAlternatives(
        subject=mail_subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
        reply_to=[email],
    )
    mail.attach_alternative(html_body, "text/html")
    mail.send(fail_silently=False)
