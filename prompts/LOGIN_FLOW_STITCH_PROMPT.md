# Make My Marriage — Login Flow: Single Stitch Prompt

Use this in the **same Stitch project** as the landing page so Stitch reuses the same look.
Copy everything inside the first box and paste it as one prompt. Then paste the mobile
follow-up. Upload a PNG of `docs/brand/logo-mark.svg` if Stitch accepts an image reference.

Scope: signup, login, forgot/reset password, joining a wedding through a member invitation,
and the system states around them. Wedding onboarding and the dashboard are separate
screens and are not included.

---

```text
Design the complete authentication flow for "Make My Marriage", a web app where Indian
families plan a wedding together. Match the landing page design exactly: same logo, palette,
fonts and style. Desktop (1440px) first. Polished, modern, warm, calm, premium and
trustworthy, like a serious modern software product, NOT a wedding-invite site.

DESIGN SYSTEM (reuse exactly):
- Primary burgundy #6D1F2F; deep burgundy #4A1220; ivory background #FBF7F1; sand #EFE7DA;
  graphite text #2B2326; muted text #6B5F63; muted gold #B08D57 / #C9A66B for tiny accents only.
- Success uses a calm deep green #2F6B4F on a pale green tint; errors use burgundy text on a
  pale sand-rose tint (#F6E9E9) with a small icon. No bright red, no pink, no yellow blocks.
- Playfair Display 600 for headlines, Manrope for UI and body. 24px rounded cards, soft
  shadows, thin sand borders, 12-column grid, generous whitespace.
- Logo: burgundy rounded-square tile with a lowercase "m" made of two ivory arches sharing a
  middle pillar and a small gold sun above the join, plus the wordmark "Make My Marriage".
- No stock photos, no florals, no mandalas, no confetti, no clip-art rings or hearts.

LAYOUT: a split screen. Left half (about 45%): a deep burgundy #4A1220 brand panel with the
logo in ivory, a Playfair line "Your whole wedding, in one place.", a short supporting line
"Plan together. Celebrate together.", and one small abstract product card (for example a
"42 Days to Go" countdown with three event rows Mehendi, Sangeet, Wedding). Subtle burgundy
glow only. Right half: ivory with a centred form card, max width 440px. The panel's content
changes per screen only where noted. On the invitation screens the left panel shows the
wedding being joined instead.

CONTENT RULES: never mention social login (no Google, Apple or phone OTP), email
verification, two-factor authentication, pricing, user counts or testimonials. Guests never
log in, so do not show guest flows. Use plain, kind language that a parent can follow.

SCREENS TO DESIGN (each one as its own desktop screen):

1. Login. Title "Welcome back". Subtitle "Sign in to your wedding workspace." Fields: Email,
   Password (with show/hide eye toggle). Right-aligned link "Forgot password?". Full-width
   burgundy button "Sign in". Footer line "New here? Create an account". A small muted line
   "Guests don't need an account. Use the link you received."

2. Login, error state. Same screen with a burgundy-tinted inline alert at the top of the
   card: "Invalid email or password." Fields keep their values, the password field is
   cleared and focused. Never say which one was wrong.

3. Login, loading state. Button shows a spinner and "Signing in…", fields disabled.

4. Sign up. Title "Create your account". Subtitle "Start planning your wedding together."
   Fields: Full name, Email, Password (show/hide) with a live helper below: "At least 12
   characters" with a thin strength bar (sand to burgundy, no red/green traffic lights) and a
   checklist item that turns into a small green tick once met. Full-width button "Create
   account". Footer "Already have an account? Sign in". Tiny muted line "By continuing you
   agree to the Terms and Privacy Policy." (as links).

5. Sign up, validation errors. Inline field errors under each field: "Enter your full name",
   "Enter a valid email address", "Password must be at least 12 characters". Also a state
   where the email already exists: "An account with this email already exists. Sign in
   instead." with a Sign in link.

6. Forgot password. Back link "← Back to sign in". Title "Reset your password". Subtitle
   "Enter your email and we'll send you a link to set a new one." Field: Email. Button "Send
   reset link".

7. Check your email (confirmation). Envelope icon in a burgundy-tinted circle. Title
   "Check your email". Text: "If an account exists for that address, we've sent a link to
   reset your password. It expires soon, so use it right away." (always the same message,
   never reveal whether the account exists). Buttons "Back to sign in" and a text link
   "Didn't get it? Send again" with a short 60-second resend countdown state.

8. Set a new password. Title "Choose a new password". Fields: New password (show/hide) with
   the same helper and strength bar, Confirm password. Button "Update password".

9. Password updated (success). Calm green tick in a circle. Title "Password updated".
   Text "You can now sign in with your new password." Button "Sign in".

10. Reset link invalid or expired. Neutral clock icon. Title "This link has expired". Text
    "Reset links can be used once and expire quickly. Request a new one." Button "Request a
    new link" and a text link "Back to sign in".

11. Join a wedding, signed out (member invitation). The left panel shows the invitation:
    "You've been invited to help plan the wedding of Akshay & Princi", wedding date
    "14 February 2027", and a role pill "Manager". Right card: title "Join Akshay & Princi's
    wedding". Subtitle "Create an account to accept your invitation." Email field is
    pre-filled and read-only with the invited address and a small lock icon. Fields: Full
    name, Password. Primary button "Create account to join". Secondary line "Already have an
    account? Sign in" (as a link).

12. Join a wedding, sign in variant. Same left panel. Card title "Sign in to join". The
    invited email is pre-filled and read-only. Field: Password. Button "Sign in to join".
    Helper line: "Receiving an invitation doesn't create an account. Use Create account
    if this is your first time." with a link.

13. Invitation problems. One neutral card with a pale tint and three variants, shown as three
    separate screens: "This invitation has expired" (ask the Admin to send a new one),
    "This invitation was cancelled", and "This invitation was already used". Each has a
    "Go to sign in" button. Also one variant: "This invitation was sent to a different email"
    with the message "You're signed in as another account. Sign out to continue." and a
    button "Sign out and continue".

14. Already in a wedding. Message "You already belong to a wedding. Make My Marriage supports
    one wedding per account for now." with a button "Go to my wedding".

15. Session expired. A centred modal over a dimmed, blurred app background: lock icon, title
    "Your session has expired", text "Sign in again to continue. Anything you were typing is
    still here.", button "Sign in". Secondary "Sign out".

16. Too many attempts. Burgundy-tinted inline alert on the Login screen: "Too many attempts.
    Please wait a few minutes and try again." and the Sign in button disabled with a gentle
    "Try again in 4:32" countdown label.

17. Connection problem. Inline alert on the form: "We couldn't reach the server. Check your
    connection and try again." with a "Try again" button; form values retained.

DETAILS TO SHOW CONSISTENTLY
- Inputs: 48px tall, 12px radius, 1px sand border, focus ring in burgundy at 2px, floating
  or top-aligned labels, helper text 13px muted.
- Buttons: primary burgundy pill, 52px tall, hover slightly deeper burgundy; secondary is an
  ivory outlined pill; disabled is sand with muted text.
- Accessibility: visible focus states, 4.5:1 contrast, errors paired with an icon and text,
  not colour alone.
- Footer on every screen: small muted "Privacy · Terms" links.

Show the full set as a consistent system so the screens feel like one product.
```

---

## Mobile follow-up prompt

Paste this after the desktop screens are generated:

```text
Create the mobile versions (390px wide) of the same authentication screens, using the same
palette, type and content. Remove the split layout: show a compact ivory header with the logo
mark and wordmark, then the form card full width with 16px side gutters. For the Join a
wedding screens, show the invitation as a small burgundy summary card at the top of the page
("Akshay & Princi · 14 February 2027 · Manager"), then the form. Inputs and buttons are 52px
high, body text at least 16px so iOS does not zoom, tap targets at least 44px, no horizontal
scrolling. The primary button sits at the bottom of the form card, not floating. The session
expired dialog becomes a bottom sheet. Keep the password show/hide toggle and the strength
bar. Make sure the on-screen keyboard does not hide the primary button, by letting the page
scroll.
```

## Handy refinement prompts

- "Keep the brand panel quieter: reduce the product card and remove any decoration."
- "Make the form card cleaner with fewer borders and more whitespace."
- "Use the exact same input, button and alert styles on every screen."
- "Replace any social login buttons or extra options with the plain email form."
- "Make the error state calmer: smaller alert, no red, burgundy text on a pale tint."
