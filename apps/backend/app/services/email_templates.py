"""HTML email templates for Embedded Collective."""


def otp_verification_email(code: str, recipient_email: str) -> tuple[str, str, str]:
    """Return (subject, plain_text, html)."""
    subject = f"{code} — Your Embedded Collective verification code"
    plain = (
        f"Your verification code is: {code}\n\n"
        "This code expires in 10 minutes.\n"
        "If you did not request this, ignore this email.\n\n"
        "— Embedded Collective"
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#12121a;border:1px solid rgba(192,25,44,0.35);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.45);">
          <tr>
            <td style="background:linear-gradient(135deg,#C0192C 0%,#8B0000 100%);padding:24px 28px;text-align:center;">
              <div style="font-size:28px;line-height:1;margin-bottom:8px;">⬡</div>
              <h1 style="margin:0;color:#ffffff;font-size:18px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">
                Embedded Collective
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:0.06em;">
                Verify your engineer identity
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 8px;color:#a0a0b0;font-size:13px;">Hello,</p>
              <p style="margin:0 0 24px;color:#e8e8f0;font-size:14px;line-height:1.6;">
                Use this one-time code to complete sign-in or registration for
                <strong style="color:#00F5FF;">{recipient_email}</strong>:
              </p>
              <div style="text-align:center;margin:0 0 28px;">
                <span style="display:inline-block;padding:16px 32px;background:rgba(192,25,44,0.12);border:2px dashed rgba(192,25,44,0.5);border-radius:12px;font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#ffffff;">
                  {code}
                </span>
              </div>
              <p style="margin:0 0 8px;color:#a0a0b0;font-size:12px;text-align:center;">
                Expires in <strong style="color:#00F5FF;">10 minutes</strong>
              </p>
              <p style="margin:16px 0 0;color:#666;font-size:11px;line-height:1.5;text-align:center;">
                If you didn't request this code, you can safely ignore this email.<br/>
                Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;color:#555;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">
                Connect · Debug · Collaborate · Build Better Embedded Systems
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, plain, html


def contact_us_acknowledgment_email(sender_name: str, sender_email: str, message_preview: str) -> tuple[str, str, str]:
    """Return (subject, plain_text, html) for contact-us auto-reply."""
    subject = "We received your message — Embedded Collective"
    plain = (
        f"Hi {sender_name},\n\n"
        "Thank you for reaching out! We've received your message and will get back to you within 24 hours.\n\n"
        f"Your message:\n{message_preview[:300]}\n\n"
        "— Harit Mandaliya\n"
        "Embedded Systems Engineer\n"
        "Embedded Collective"
    )
    trimmed_msg = message_preview[:250].replace("<", "&lt;").replace(">", "&gt;")
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Message Received</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#12121a;border:1px solid rgba(192,25,44,0.35);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.45);">
          <tr>
            <td style="background:linear-gradient(135deg,#C0192C 0%,#8B0000 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:32px;line-height:1;margin-bottom:10px;">⬡</div>
              <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">
                Embedded Collective
              </h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:12px;letter-spacing:0.06em;">
                Thank you for reaching out
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px;color:#e8e8f0;font-size:15px;font-weight:600;">
                Hi {sender_name.replace('<','&lt;').replace('>','&gt;')},
              </p>
              <p style="margin:0 0 24px;color:#c0c0d0;font-size:13px;line-height:1.7;">
                Thank you for contacting me! I've received your message and will get back to you
                <strong style="color:#00F5FF;">within 24 hours</strong>.
              </p>

              <div style="background:rgba(0,245,255,0.04);border:1px solid rgba(0,245,255,0.15);border-radius:10px;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0 0 8px;color:#00F5FF;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">
                  Your message
                </p>
                <p style="margin:0;color:#a0a0b0;font-size:12px;line-height:1.6;font-style:italic;">
                  "{trimmed_msg}..."
                </p>
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0 0 4px;color:#e8e8f0;font-size:13px;font-weight:600;">Harit Mandaliya</p>
                    <p style="margin:0;color:#a0a0b0;font-size:11px;">Embedded Systems Engineer</p>
                    <p style="margin:6px 0 0;color:#666;font-size:11px;">
                      <a href="https://github.com/harit" style="color:#00F5FF;text-decoration:none;">GitHub</a>
                      &nbsp;·&nbsp;
                      <a href="https://linkedin.com/in/harit-mandaliya" style="color:#00F5FF;text-decoration:none;">LinkedIn</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;color:#555;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;">
                Connect · Debug · Collaborate · Build Better Embedded Systems
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, plain, html


def admin_contact_notification_email(sender_name: str, sender_email: str, message: str) -> tuple[str, str, str]:
    """Return (subject, plain_text, html) email to admin when someone contacts via the form."""
    subject = f"New Contact Form Submission from {sender_name}"
    plain = (
        f"New contact form submission:\n\n"
        f"From: {sender_name} ({sender_email})\n"
        f"Message:\n{message}\n\n"
        "— Embedded Collective Contact System"
    )
    safe_name = sender_name.replace('<', '&lt;').replace('>', '&gt;')
    safe_email = sender_email.replace('<', '&lt;').replace('>', '&gt;')
    safe_msg = message.replace('<', '&lt;').replace('>', '&gt;')
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Submission</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0f;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#12121a;border:1px solid rgba(192,25,44,0.35);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.45);">
          <tr>
            <td style="background:linear-gradient(135deg,#C0192C 0%,#8B0000 100%);padding:24px 28px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:16px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">
                📩 New Contact Form Message
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
                <tr>
                  <td style="padding:8px 0;color:#a0a0b0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;width:80px;vertical-align:top;">From</td>
                  <td style="padding:8px 0;color:#e8e8f0;font-size:13px;font-weight:600;">{safe_name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#a0a0b0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;width:80px;vertical-align:top;">Email</td>
                  <td style="padding:8px 0;"><a href="mailto:{safe_email}" style="color:#00F5FF;font-size:13px;text-decoration:none;">{safe_email}</a></td>
                </tr>
              </table>
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px 20px;">
                <p style="margin:0 0 8px;color:#a0a0b0;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;">Message</p>
                <p style="margin:0;color:#e8e8f0;font-size:13px;line-height:1.7;white-space:pre-wrap;">{safe_msg}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return subject, plain, html
