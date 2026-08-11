from django.views.decorators.http import require_POST

from sketches.forms import ContactForm
from sketches.services.contact_email import send_contact_email

from .http import (
    client_ip,
    enforce_rate_limit,
    form_errors,
    json_response,
    parse_json_body,
)


@require_POST
def api_contact(request):
    limited = enforce_rate_limit(
        f"contact:{client_ip(request)}",
        limit=5,
        window_seconds=3600,
    )
    if limited:
        return limited

    data = parse_json_body(request)
    form = ContactForm(
        data={
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "subject": data.get("subject", ""),
            "message": data.get("message", ""),
        }
    )
    if not form.is_valid():
        return json_response({"ok": False, "errors": form_errors(form)}, status=400)

    try:
        send_contact_email(
            name=form.cleaned_data["name"],
            email=form.cleaned_data["email"],
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
