"""Verify Google Identity Services ID tokens."""

from django.conf import settings


class GoogleAuthError(Exception):
    """Raised when an ID token cannot be verified."""


def verify_google_id_token(credential: str) -> dict:
    """
    Verify a GIS credential (JWT) and return the token claims.

    Requires GOOGLE_OAUTH_CLIENT_ID. Raises GoogleAuthError on failure.
    """
    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""
    if not client_id:
        raise GoogleAuthError("Google sign-in is not configured.")
    if not credential or not isinstance(credential, str):
        raise GoogleAuthError("Missing credential.")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise GoogleAuthError("google-auth is not installed.") from exc

    try:
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            audience=client_id,
        )
    except ValueError as exc:
        raise GoogleAuthError(str(exc) or "Invalid Google credential.") from exc

    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise GoogleAuthError("Invalid token issuer.")
    if not claims.get("email"):
        raise GoogleAuthError("Google account has no email.")
    if claims.get("email_verified") is False:
        raise GoogleAuthError("Google email is not verified.")
    return claims
