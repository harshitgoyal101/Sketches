import json

from django.core.cache import cache
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


def enforce_rate_limit(key, *, limit, window_seconds):
    """
    Cache-backed fixed-window rate limit.
    Returns a 429 JsonResponse when exceeded, otherwise None.
    """
    cache_key = f"rl:{key}"
    try:
        count = cache.incr(cache_key)
    except ValueError:
        cache.add(cache_key, 1, timeout=window_seconds)
        count = 1
    if count > limit:
        return json_response(
            {
                "ok": False,
                "error": "Too many requests. Try again later.",
                "code": "rate_limited",
            },
            status=429,
        )
    return None


def client_ip(request):
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    if forwarded:
        return forwarded
    return request.META.get("REMOTE_ADDR") or "unknown"
