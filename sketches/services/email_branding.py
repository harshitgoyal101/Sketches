from django.conf import settings
from django.templatetags.static import static


def site_base_url():
    return getattr(settings, "SITE_URL", "http://127.0.0.1:8000").rstrip("/")


def email_brand_context():
    """Shared branding vars for transactional HTML emails."""
    base = site_base_url()
    logo_path = static("email/logo-cube.png")
    if not logo_path.startswith("http"):
        logo_url = f"{base}{logo_path}"
    else:
        logo_url = logo_path
    return {
        "site_name": getattr(settings, "SITE_NAME", "sketches101"),
        "site_url": base,
        "email_logo_url": logo_url,
    }
