from django.views.decorators.http import require_POST

from sketches.forms import ContactForm
from sketches.services.contact_email import send_contact_email

from .http import (
    enforce_rate_limit,
    form_errors,
    json_response,
    parse_json_body,
    require_login,
)


def _contact_display_name(user):
    profile = getattr(user, "profile", None)
    display = (getattr(profile, "display_name", None) or "").strip()
    if display:
        return display
    return user.get_username()


@require_POST
def api_contact(request):
    auth_error = require_login(request)
    if auth_error:
        return auth_error

    limited = enforce_rate_limit(
        f"contact:{request.user.pk}",
        limit=5,
        window_seconds=3600,
    )
    if limited:
        return limited

    data = parse_json_body(request)
    form = ContactForm(
        data={
            "subject": data.get("subject", ""),
            "message": data.get("message", ""),
        }
    )
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    email = (request.user.email or "").strip()
    if not email:
        return json_response(
            {
                "ok": False,
                "errors": {
                    "__all__": ["Your account needs an email address to send a message."]
                },
            },
            status=400,
        )

    try:
        send_contact_email(
            name=_contact_display_name(request.user),
            email=email,
            subject=form.cleaned_data["subject"],
            message=form.cleaned_data["message"],
        )
    except Exception:
        return json_response(
            {
                "ok": False,
                "errors": {"__all__": ["We could not send your message. Try again later."]},
            },
            status=502,
        )

    return json_response({"ok": True})
