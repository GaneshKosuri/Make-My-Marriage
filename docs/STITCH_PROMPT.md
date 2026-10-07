# Make My Marriage — Stitch Prompt Pack

How to use: Stitch works best in steps. Paste **PART 1 (Master prompt)** first in a new project (or the existing project `5169674594013355245`). Then paste each **Batch** from PART 2 one at a time. Each batch asks for desktop (1440 px) and mobile (390 px) versions. Part 3 has refinement prompts.

Screens already approved in the existing Stitch project: onboarding, wedding overview, edit wedding, members + invite/revoke, accept member invite, events (list/empty/create), tasks (list/filtered/delete), guest list + create, guest sharing, public invitation, gallery overview. If you are in that project, skip those batches or use them only to regenerate missing states. If you are starting a new project, run everything.

---

# PART 1 — MASTER PROMPT (paste first)

```
Design a complete responsive web application called "Make My Marriage": a collaborative wedding-management platform for Indian families. Tagline: "The operating system for managing an Indian wedding." Create BOTH desktop (1440px wide) and mobile (390px wide) versions of every screen I request, with a polished, premium, warm, trustworthy and quietly celebratory feel. It must look like a serious modern product, NOT a traditional wedding-invitation website.

PRODUCT CONTEXT
- Users: "Wedding Members" (bride, groom, parents, siblings, trusted friends) who log in. Two roles: ADMIN (everything, plus manages members) and MANAGER (everything except managing members). Guests never have accounts; they use secret links for invitation/RSVP and a QR-linked photo gallery.
- Three surfaces: (1) private dashboard app, (2) public wedding website with 3 themes, (3) token-protected guest pages (invitation + RSVP, photo gallery/upload).
- Sample couple for all mock data: Akshay & Princi, wedding on 14 February 2027, Dehradun, Uttarakhand. Events: Roka, Mehendi, Haldi, Sangeet, Cocktail, Wedding, Reception. Sample guest: Rajesh Sharma, max 4 people. Family-style names (Sharma, Rawat, Bisht, Negi). All money in INR with Indian digit grouping, e.g. ₹12,45,000.

UX PRINCIPLES (very important)
1. Wedding-first: the couple identity ("Akshay & Princi", date, countdown; typographic, no hearts or clip-art) is visible on every logged-in screen.
2. Simple enough for parents: large tap targets, plain-language labels, obvious primary action per screen, never feel like enterprise project-management software. No jargon, no dense dashboards.
3. Mobile-friendly everywhere; guest pages are strictly mobile-first.
4. Zero guest friction: no sign-up, no password, no app install. Invitation link -> RSVP. QR scan -> gallery.
5. Indian context through content, not decoration: Indian event names, WhatsApp sharing, INR formatting, large guest counts, family-style names. Contemporary, not old-fashioned.
6. Trust: reassuring privacy microcopy, predictable patterns, clear saved/failed states.

VISUAL DESIGN SYSTEM — WARM, ELEGANT, PREMIUM, TRUSTWORTHY
Overall direction: a serious, modern SaaS product that happens to be about weddings. Think of the calm confidence of a premium fintech or high-end productivity app, with a warm, human, celebratory tone. It must NOT look like a wedding invitation website or a traditional Indian wedding template. Warm and elegant, never cute, never kitsch.
ABSOLUTELY AVOID: floral decoration or floral borders, mandala/paisley patterns, scrollwork, ornate frames, clip-art, glitter, shiny gold gradients, invitation-card styling, red-and-gold templates, pink or yellow dominated screens, hearts and cupid imagery, random stock photos, script/calligraphy fonts, heavy textures, and busy backgrounds.
- Feel: calm, spacious, confident, quietly joyful. Strong hierarchy, generous whitespace, clean grids, clear data. Trust is built through clarity: precise numbers, consistent patterns, obvious states, and reassuring microcopy ("Saved", "Only your family can see this", "Guests never need an account").
- Palette (restrained, 90% neutral): warm stone/ivory background (#F8F6F2), white surfaces (#FFFFFF), warm grey borders (#E6E1D9), deep ink text (#1E1B1A), secondary text (#6B645F). Primary brand colour: deep emerald-teal (#1F4A44) for buttons, active nav, key links and focus rings (an auspicious, premium and trustworthy colour that is not the usual wedding red or pink). One soft warm accent only, a muted clay / terracotta (#B5654A), used very sparingly for celebratory highlights such as the countdown, milestone badges and success moments. No large areas of pink, red, yellow or gold. Semantic colours used only for meaning: success #2F7D5B, warning #B7791F (small chips only), danger #B3261E (destructive actions and errors only), info #3C6A8E.
- Typography: Manrope (or Inter) for all UI, tables, forms and body text. A modern refined serif (Fraunces or Instrument Serif style, light weight, tight tracking) used ONLY for couple names, hero headings and a few big numbers, so it feels editorial and premium rather than traditional. Clear size scale, large display sizes on hero and public pages, 16px base, generous line height.
- Shape and depth: 12-20px rounded corners, hairline borders instead of heavy shadows, very soft diffused shadow only on floating elements, bento-style card grids, frosted top bar on scroll, plenty of padding. Flat, clean fills; subtle neutral gradients only.
- Celebration without decoration: celebration comes from motion, warm light and copy, not ornament. Examples: a soft confetti burst (small, elegant, in emerald/clay/stone tones) on RSVP success, wedding published and last task completed; an animated countdown ring; a progress ring that fills as the wedding gets organised; warm microcopy like "Your wedding is 42 days away". Always subtle and quick, never childish.
- Motion and interaction (annotate in the designs): smooth page transitions, skeleton loading, hover lift on cards, optimistic updates with undo toasts, sticky primary actions on mobile, bottom sheets, gentle checkbox completion animation, inline validation as the user types.
- Components: primary button emerald filled; secondary outline; tertiary text; destructive red. Status chips use soft tinted backgrounds with dark text: To Do (stone), In Progress (blue-grey), Completed (green); Priority Low (stone) / Medium (blue-grey) / High (clay); RSVP Pending (stone with amber dot) / Attending (green) / Not Attending (neutral grey); role chips Admin (emerald tint) / Manager (stone outline). One consistent 1.5px rounded line-icon set. Avatars with initials in muted tones.
- Imagery: do NOT generate or use random stock wedding photos. Wherever a photo belongs (wedding cover, event cover, hero, gallery, guest photos), show a clean neutral image placeholder: soft warm-grey tonal block with a small camera icon and a label such as "Your cover photo", or a soft abstract gradient. The product design must look complete and elegant even before any photo is uploaded, so design real empty and "add your photo" states. Gallery grids use tonal placeholder tiles of varied aspect ratios. Public pages are typography-led with the couple's own photo slot, not generic imagery.
- Illustrations: none needed beyond a minimal, abstract, single-line empty-state icon per module (no florals, no couples).
- Accessibility: WCAG AA contrast, visible focus rings, 44px minimum touch targets, labels on every input.
- UX quality bar (very important): extremely clear and fast. One obvious primary action per screen; progressive disclosure; sensible defaults; inline editing where possible; search and filters that are easy to find; undo instead of "are you sure" when an action is reversible; confirmation dialogs only for destructive actions; clear success feedback; thoughtful empty states that guide the next step; first-run setup checklist; consistent layout of list, detail and form screens across every module; designed for non-technical parents as much as for the couple.

APP SHELL (all logged-in screens)
- Desktop: left sidebar (logo, nav) + top bar (wedding name "Akshay & Princi", "42 days to go" pill, user avatar menu with role chip and Sign out). Sidebar nav, in order: Dashboard, Events, Tasks, Guests (Guest List, Invitations & RSVP), Expenses, Vendors (My Vendors, Discover Vendors), Wedding Website, Photos (Gallery, Guest Upload & QR), Live Stream, Settings (Wedding Details, Wedding Members — Admin only).
- Mobile: top bar with hamburger drawer containing the same nav, and a bottom tab bar with 5 items: Home, Tasks, Guests, Expenses, More. A floating "+" action where relevant.
- Every list screen needs: loading skeleton, empty state (illustration + one clear action), no-results state, and retryable error state shown as small variants.

STRICT SCOPE — DO NOT DESIGN any of these (not in V1): budgets, budget limits or variance, split expenses, payment schedules/installments, seating charts, hotel/room allocation, travel/transport/airport pickup, individual family-member tracking within a guest group, vendor booking or payments, WhatsApp/SMS automation, push notifications or notification centre, activity logs, real-time collaboration indicators, drag-and-drop website builder, custom domains, AI assistant, multiple weddings per user, planner/agency accounts, granular permissions beyond Admin/Manager.

Confirm you understand, and keep this design system for everything that follows. I will now give you screen batches.
```

---

# PART 2 — SCREEN BATCHES (paste one at a time)

## Batch A — Authentication & Onboarding

```
Using the Make My Marriage design system, design these screens, each in desktop and mobile:

1. Sign Up: split layout on desktop (left: calm warm-stone panel with a large serif tagline such as "Plan the wedding together." and three short trust points, no photo and no decoration; right: clean airy form). Fields: Name, Email, Password (show/hide toggle, helper "12–128 characters"). Primary "Create account", link "Already have an account? Sign in". Show variants: inline validation errors, email-already-exists error, submitting state.
2. Log In: Email, Password, "Forgot password?" link, error state with generic message "Invalid email or password.", submitting state.
3. Forgot Password: email field, then a success confirmation state that never reveals whether the account exists ("If that email is registered, we've sent a reset link.").
4. Reset Password: new password + confirm, success state, and invalid/expired link state with "Request a new link".
5. Accept Wedding Invitation (public page for an invited member): shows couple names, wedding date, invited email, invited role chip (Manager). Variants: signed out ("Create an account to join" primary, "Already have an account? Sign in" secondary), signed in with matching email ("Accept invitation"), signed in with wrong email (explain and offer "Sign out and switch account"), user already belongs to another wedding (blocked message), accepting/success, and invalid / revoked / expired / already accepted states.
6. Create Your Wedding (onboarding, single page, shown right after first sign-up): Bride name, Groom name, Wedding date (calendar picker), Wedding city/location, optional Wedding title (with auto-suggestion "Akshay & Princi"), optional description, time zone (default Asia/Kolkata), optional cover image upload. Warm welcome copy: "Let's set up your wedding." Primary "Create wedding". Include a note that the creator becomes Admin.
```

## Batch B — Dashboard

```
Design the Wedding Dashboard (command center) in the Make My Marriage app shell, desktop and mobile. It must stay informational and friendly, not analytics-heavy.

Content:
- Hero banner with couple names in the display serif "Akshay & Princi", "14 February 2027 · Dehradun, Uttarakhand", an optional cover-photo slot (neutral placeholder with "Add your cover photo" when empty), and a large animated countdown ring "42 days to go".
- Six summary cards: Events 6; Tasks 32/48 completed (with thin progress bar); Guests 186 invitations; RSVPs (Attending 120, Pending 54, Not Attending 12) with 287 people attending; Expenses ₹12,45,000; Vendors 8. Each card links to its module.
- Upcoming Events list (next 3, with date, time, venue).
- Upcoming Tasks list (next 5 incomplete, due date, assignee avatar, priority chip, quick "mark complete" checkbox; overdue shown in red).
- Quick actions row: Add guest, Add task, Add expense, Share gallery QR.
- Variants: brand-new wedding empty state (setup checklist: Add first event, Add a task, Add guests, Invite family, each with a button), and a wedding-day-today variant.
Mobile: cards in a 2-column grid, lists stacked, bottom tab bar.
```

## Batch C — Events & Tasks

```
Design the Events and Tasks modules, desktop and mobile.

EVENTS
1. Events list grouped by date: each event card shows name, type icon (Roka, Engagement, Mehendi, Haldi, Sangeet, Cocktail, Wedding, Reception, Custom), date, start–end time, venue, dress code chip. Toggle "Show archived" (archived read-only, greyed). Primary "Add event". Empty state with suggested-event shortcut chips.
2. Create / Edit Event form: event type shortcut chips (Roka, Engagement, Mehendi, Haldi, Sangeet, Cocktail, Wedding, Reception, Custom), Name, Date, Start time, End time (optional), Venue name, Address, Description, Dress code, Cover image upload. Validation: end must be after start. Warning banner when an event date is after the main wedding date. Unsaved-changes confirmation dialog.
3. Event Details page: cover, info, plus related lists (linked tasks, invited guest count, vendors, expenses total, photos count).
4. Archive Event confirmation dialog: warns clearly that guests were invited, invitations will no longer show this event, and existing tasks/expenses/photos stay intact.

TASKS
5. Tasks list with tabs: All Tasks, My Tasks, Completed. Filter bar: Status, Event, Assigned member, Priority. Each row: checkbox/status dropdown, title, event chip, assignee avatar+name, due date (overdue in red), priority chip. Pagination. Mobile: card list with swipe-friendly status control.
6. Create / Edit Task: Title, Description, Assigned member (dropdown of wedding members; "Unassigned"), Related event (optional, "General wedding task"), Due date, Priority (Low/Medium/High), Status (To Do / In Progress / Completed).
7. Task Details with inline status change, "Former member" label for removed assignees, edit and delete.
8. Delete Task confirmation (permanent). Error and empty states.
No comments, attachments, subtasks or dependencies.
```

## Batch D — Guests, Invitations & RSVP

```
Design the Guests module, desktop and mobile. One Guest record = one invitation/family group (e.g. "Rajesh Sharma", max 4 people), not each individual.

1. Guest List: search (name/email/phone), filters: Event, RSVP status (Pending/Attending/Not Attending), Invitation sent (Yes/No). Desktop table columns: Name, Contact, Max people, Invited events (small chips), RSVP chip, People attending, Invitation status ("Sent 12 Jan" or "Not sent"), row actions. Mobile: stacked cards. Pagination, bulk-select checkboxes, buttons "Add guest" and "Send invitations".
2. Add / Edit Guest form: Name (required), Email (optional), Phone (optional), Maximum people including the named guest (stepper, default 1), "Invited to" multi-select event checkboxes (Mehendi, Haldi, Cocktail, Wedding, Reception...), Notes. Helper: "Guests without email can still be invited via WhatsApp."
3. Guest Details + Invitation Sharing: guest info card, invited events, RSVP status and count. Sharing card with the unique invitation link (masked field), actions: Copy link, Open invitation, "Share on WhatsApp" (green button that opens WhatsApp with a prefilled message — show the message preview), "Send invitation email" (disabled with tooltip if no email), "Send reminder" (only when RSVP pending). Show "Invitation sent on ... / Last reminder ... (2 reminders)". Delete guest confirmation: permanent, link stops working.
4. Invitations & RSVP overview: summary tiles (Total invitations 186, Pending 54, Attending 120, Not attending 12, Total people attending 287), an RSVP donut/segmented bar, and a Pending guests list with per-row "Send reminder" and a primary "Send reminder to all pending guests".
5. Bulk Send Invitations dialog: scope radio (All unsent, All pending RSVP, Selected guests), count preview ("Will send to 437 guests; 12 have no email and will be skipped"), confirm.
6. Email Batch Progress panel (shown after bulk send): progress bar and counts Sent / Pending / Processing / Failed, "Retry failed" button, completed state, and a note that emails go out in small batches in the background.
```

## Batch E — Public Guest Invitation & RSVP (mobile-first)

```
Design the public Guest Invitation page (no login, mobile-first at 390px, with a graceful centered desktop layout). Opened from a link like makemymarriage.com/invite/X7K29P.

- Typography-led hero on warm stone (optional couple-photo slot, neutral placeholder if none, no floral art or frames), couple names "Akshay & Princi" in the display serif, "would love for you to celebrate their wedding with them", greeting "Dear Rajesh Sharma".
- Overlapping status card showing current RSVP status and "Invitation admits up to 4 people".
- Itinerary: ONLY events this guest is invited to (Cocktail, Wedding, Reception) — each with date, time, venue, address with "Open map" link, dress code and short description.
- RSVP form: "Will you be attending?" Yes / No large buttons. If Yes: "How many people will attend?" a stepper/segmented selector limited to 1–4 (cannot exceed 4, show helper "Up to 4 guests"). Primary "Send my response".
- States: pending (first visit), submitting, success after RSVP (warm thank-you, summary, "You can change your response anytime using this same link", add-to-calendar optional), already responded Attending with 3 people (edit mode), responded Not Attending, network error retaining input, capacity-reduced conflict message, and an "Invitation unavailable" generic state for invalid/deleted links (no details revealed).
Do not show other guests, contact details, expenses, or any internal data. Add a small footer "Made with Make My Marriage".
```

## Batch F — Expenses

```
Design the Expense Tracker, desktop and mobile. It records money spent or committed. It is NOT a budgeting tool: no budget, no variance, no remaining balance, no installments.

1. Expenses overview: a large "Total Wedding Expense ₹17,42,500" card, a category breakdown (horizontal bars or donut with legend: Venue ₹6,00,000, Catering ₹4,20,000, Photography ₹1,80,000, Videography, Decoration, Clothing, Jewellery, Entertainment, Invitations, Gifts, Travel, Makeup, Miscellaneous), and below it the expenses list.
2. Expenses list: filters (Category, Event, Vendor, date range), rows with title, category chip, event chip, vendor, date, amount right-aligned in INR lakh grouping, notes preview. Default newest first, pagination. Mobile: cards. "Add expense" primary button.
3. Add / Edit Expense: Title, Amount (₹ prefix, Indian grouping preview), Date, Category (13 categories with icons), Related event (optional), Related vendor (optional), Notes. Helper that event and vendor are optional.
4. Delete expense confirmation. Empty state: "No expenses recorded yet."
```

## Batch G — Vendors & Vendor Discovery

```
Design the Vendors module, desktop and mobile.

1. My Vendors list: category filter chips (Photographer, Videographer, Venue, Caterer, Decorator, DJ, Makeup Artist, Mehendi Artist, Pandit, Choreographer, Florist, Wedding Planner, Transport, Other), search by name/contact, vendor cards (name, category chip, contact person, phone with tap-to-call, email, total agreed cost ₹2,00,000, related events chips, a "Google" badge if added from discovery). "Show archived" toggle. Buttons "Add vendor" and "Discover vendors".
2. Add / Edit Vendor form: Name, Category, Contact person, Phone, Email, Address, Website, Total agreed cost (₹), Related events (multi-select), Notes.
3. Vendor Details: all info plus linked expenses list with total spent, and Archive vendor confirmation (explains existing expenses are kept).
4. Discover Vendors: category selector (Photographers, Wedding venues, Caterers, Makeup artists, Florists, Decorators, DJs), location field defaulting to the wedding location "Dehradun, Uttarakhand" with a "change location" control, optional keyword, results as cards: name, star rating + review count, address, distance if available, contact info if available, and an "Add to My Vendors" button (changes to "Added ✓"). Include a map/list toggle on desktop, loading skeletons, no-results state, and an error state "Vendor discovery is temporarily unavailable." that clearly shows the rest of the app still works.
No booking, payment or contract features.
```

## Batch H — Wedding Website, Themes & Livestream

```
Design the Wedding Website module.

DASHBOARD SIDE (desktop + mobile)
1. Website Settings: URL shown as makemymarriage.com/w/akshay-princi-14022027 with copy button (slug is read-only, with a note that it stays stable), Publish toggle with status badge (Draft / Published), welcome message textarea, theme picker showing three large selectable preview cards: "Classic Indian" (a modern take on tradition via deep emerald and stone tones, refined serif display type and restrained spacing, NOT ornate, no florals or patterns), "Minimal Elegant" (monochrome-leaning, clean typography, lots of whitespace), "Modern Celebration" (contemporary, bolder type and a richer but still controlled colour palette, large photo slots), a live preview pane, "Open public site" button. Note: changing theme changes presentation only, not content.
2. Live Stream settings: YouTube Live URL field with validation, "Test preview" embedded player, Enabled toggle, Save, Remove livestream. Error states for invalid URL.

PUBLIC WEBSITE (no login) — design the same content in all three themes, each in desktop and mobile:
- Hero: couple names, wedding date, cover-photo slot (neutral placeholder), countdown. Typography-led.
- Welcome: short message and description.
- Events: cards with event name, date, time, venue, dress code, "Open map" link.
- Gallery preview (only if enabled) with "View & upload photos" button.
- Livestream: embedded YouTube player with a "Watch live" badge (only if configured).
- Footer.
Also design: unpublished site returns a plain "Page not found" and a livestream-unavailable fallback where the player simply hides gracefully.
Make the three themes clearly distinct yet clearly the same content structure.
```

## Batch I — Photos, Gallery, QR & Guest Gallery

```
Design the Photos module, desktop and mobile.

ORGANISER SIDE
1. Wedding Gallery: album tabs/filter chips by event (All, Mehendi, Haldi, Sangeet, Wedding, Reception, "Other / Wedding Memories"), photo count, masonry/grid of photos with uploader badge (Family vs Guest), infinite scroll / "Load more", empty state, error state. Actions: Upload photos, Share gallery link, QR code.
2. Upload Photos dialog: drag-and-drop zone (mobile: choose from phone), file list with thumbnails, per-file progress bars, assign to event dropdown, supported types and limits text (JPEG, PNG, WebP; 10 MB each; up to 20 per batch), states: queued, uploading, success, failed with Retry, unsupported file, too large.
3. Full-size photo viewer: previous/next arrows, swipe on mobile, Download, Delete (permanent confirmation dialog), event label, uploaded-by and date.
4. Guest Upload & QR page: large QR code card "Share the Memories 📸 — Scan to upload and view photos from Akshay & Princi's wedding", Download QR, Print / share, Copy gallery link, a printable table-card preview, and Gallery Settings: Gallery enabled toggle, Guest uploads enabled toggle, note that the QR link never changes so printed copies keep working.

GUEST SIDE (no login, strictly mobile-first at 390px)
5. Guest Gallery landing: wedding header, event chips, photo grid, big floating "Upload photos" button, "Uploads are open" status, closed-uploads variant (view only), disabled gallery variant, invalid-link variant.
6. Guest Upload flow: pick photos from phone, optional "Which event?" selector, thumbnails with progress, success screen ("Thank you! Your photos are now in the gallery."), partial failure with retry, unsupported / too large file messages.
```

## Batch J — Settings & Members

```
Design Settings, desktop and mobile.

1. Wedding Details: edit Bride name, Groom name, Wedding date, Location, Description, Cover image, optional Title. Save/cancel with unsaved-changes guard and saved confirmation. (Slug and gallery link are not editable.)
2. Wedding Members (Admin only): list of members with avatar, name, email, role chip (Admin/Manager), joined date, "You" tag. Pending Invitations section (email, role, expires in 7 days, Revoke). Buttons: Invite member.
3. Invite Wedding Member dialog: email, role selector (Admin / Manager) with a one-line explanation of each role, send state, error states (already a member, pending invite exists).
4. Change Role dialog and Remove Member dialog (self-removal labelled "Leave wedding"), Revoke Invitation confirmation. Last-Admin protection: show disabled controls with explanatory tooltip/message "A wedding must always have at least one Admin."
5. Manager view of the same Wedding Members page: read-only list, no invite/role/remove controls, with a friendly note that only Admins can manage members.
6. Role comparison info card (Admin vs Manager capabilities) as a helper.
```

## Batch K — Global States & Utility Screens

```
Design these system screens, desktop and mobile:
1. Session expired overlay (keeps the user's unsaved form visible but disabled, with "Sign in again" opening in a new tab).
2. 404 / "This link is unavailable" generic page for invalid guest, gallery, or website links (no information leakage).
3. Generic error / retry state and offline/network error banner.
4. Rate-limit message ("Too many attempts. Please try again in a few minutes.").
5. Unsaved changes confirmation dialog and destructive confirmation dialog pattern.
6. Toast/snackbar patterns (success, error, info).
7. Loading skeletons for dashboard, list, and gallery.
8. A "Component sheet" board: buttons, inputs, selects, chips, cards, tables, dialogs, tabs, avatar, empty-state illustration style.
```

---

# PART 3 — REFINEMENT PROMPTS (use after the first pass)

```
Review all generated screens for consistency. Make sure the same sidebar, top bar, colours, typography, chips, spacing, and button styles are used everywhere. Fix any screen that deviates.
```

```
Make the mobile versions feel native: bottom tab bar, large touch targets, sticky primary action buttons, bottom-sheet dialogs instead of centered modals, and no horizontal scrolling at 390px.
```

```
Simplify any screen that looks busy. A non-technical parent should be able to add a guest, complete a task, record an expense and view RSVPs without help. Reduce text, increase whitespace, and keep one obvious primary action per screen.
```

```
Remove any element that implies features outside V1 (budget limits, seating, rooms, transport, vendor booking or payments, notifications, activity logs, real-time collaboration, AI assistant, custom domains).
```

```
Make the whole design feel like a serious, modern, trustworthy product. Remove any floral decoration, ornament, hearts, invitation-card styling, stock photos, and any dominance of pink, red or yellow. Use warm stone neutrals, deep emerald as the single brand colour, a sparing clay accent, hairline borders, bento-style cards, and large restrained typography. Celebration should come only from subtle motion (confetti on RSVP success, countdown ring, completion animations) and warm copy.
```

```
Audit every screen for usability: one obvious primary action, consistent list/detail/form patterns across modules, undo toasts instead of needless confirmations, inline validation, clear empty and error states, and reassuring privacy microcopy. Fix anything confusing.
```
