import json

from django.http import JsonResponse


def json_response(data, *, status=200):
    return JsonResponse(data, status=status, json_dumps_params={"ensure_ascii": False})


def parse_json_body(request):
    content_type = request.content_type or ""
    if "application/json" in content_type:
        try:
            raw = request.body.decode("utf-8") if request.body else "{}"
            data = json.loads(raw or "{}")
            return data if isinstance(data, dict) else {}
        except (UnicodeDecodeError, json.JSONDecodeError):
            return {}
    return {key: request.POST.get(key) for key in request.POST.keys()}


def form_errors(form):
    errors = {}
    for field, field_errors in form.errors.items():
        errors[field] = [str(err) for err in field_errors]
    return errors


def require_login(request):
    if request.user.is_authenticated:
        return None
    return json_response(
        {
            "ok": False,
            "error": "Authentication required",
            "code": "auth_required",
        },
        status=401,
    )
