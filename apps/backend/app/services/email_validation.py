"""Email validation — format, MX deliverability, disposable domain blocking."""

import re
from typing import Tuple

# Common throwaway / fake inbox providers
DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
    "grr.la", "guerrillamailblock.com", "pokemail.net", "spam4.me", "tempmail.com",
    "temp-mail.org", "throwaway.email", "yopmail.com", "yopmail.fr", "trashmail.com",
    "getnada.com", "maildrop.cc", "fakeinbox.com", "dispostable.com", "10minutemail.com",
    "tempail.com", "emailondeck.com", "mintemail.com", "mytemp.email", "mailnesia.com",
    "harakirimail.com", "discard.email", "mailcatch.com", "tempinbox.com",
}

# Obviously invalid patterns
FAKE_LOCAL_PATTERNS = [
    re.compile(r"^(test|fake|spam|noreply|no-reply|admin|root)@", re.I),
    re.compile(r"@(invalid|localhost)\.", re.I),
    re.compile(r"^(a+|abc|asdf|qwerty|123)@", re.I),
]


def validate_email_address(email: str, *, check_deliverability: bool = True) -> Tuple[bool, str]:
    """Return (is_valid, error_message). Empty error_message when valid."""
    raw = (email or "").strip().lower()
    if not raw:
        return False, "Email is required."

    try:
        from email_validator import validate_email, EmailNotValidError

        info = validate_email(raw, check_deliverability=check_deliverability)
        normalized = info.normalized
    except EmailNotValidError as exc:
        return False, str(exc)
    except Exception:
        return False, "Invalid email address format."

    domain = normalized.split("@")[-1]
    if domain in DISPOSABLE_DOMAINS:
        return False, "Disposable or temporary email addresses are not allowed."

    for pattern in FAKE_LOCAL_PATTERNS:
        if pattern.search(normalized):
            return False, "Please use a real, personal email address."

    return True, ""
