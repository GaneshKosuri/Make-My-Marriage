# Make My Marriage — Dashboard: Stitch Prompts

Use the **same Stitch project** as the landing page and login flow so the look carries over.

How to use:
1. Paste **Prompt 1**. It generates the app shell and main dashboard in **both desktop and
   mobile**. Review and lock it.
2. Paste the **module prompts** (3 to 10) one at a time. Each one generates its screens in
   **both desktop and mobile**, so every PRD feature gets both versions.
3. **Prompt 2** is optional. Use it only if you want to regenerate the mobile dashboard alone.
4. Use the refinement prompts at the end.

Every prompt repeats the key style rules, because Stitch can drift between generations.

---

## Prompt 1 — App shell and main dashboard (desktop 1440px AND mobile 390px)

```text
Generate BOTH a desktop version (1440px) and a mobile version (390px) of the dashboard
described below, as separate screens in the same design system. The mobile screens are
specified in the "MOBILE SCREENS" section near the end.

Design the main logged-in dashboard for "Make My Marriage", the wedding command center that
a bride, groom and family organisers use daily to plan an Indian wedding together. Match the
landing page and login screens exactly: same logo, palette, fonts and style. Polished, modern,
warm, calm, premium, trustworthy. It must feel like a serious modern product, NOT enterprise
project-management software and NOT a wedding-invite site. A non-technical parent should feel
comfortable using it.

DESIGN SYSTEM (reuse exactly):
- Primary burgundy #6D1F2F; deep burgundy #4A1220; ivory background #FBF7F1; sand #EFE7DA;
  white cards #FFFFFF; graphite text #2B2326; muted text #6B5F63; muted gold #B08D57 / #C9A66B
  for tiny accents only.
- Status colours kept quiet: success deep green #2F6B4F on pale green tint, warning muted amber-
  brown #8A5A1F on a pale sand tint, overdue burgundy text on pale sand-rose #F6E9E9.
  No bright red, no pink, no yellow blocks.
- Playfair Display 600 for page and card headlines, Manrope for UI and body. 20 to 24px rounded
  cards, soft low-opacity shadows, thin sand borders, 12-column grid, generous whitespace.
- Logo: burgundy rounded-square tile with a lowercase "m" made of two ivory arches sharing a
  middle pillar and a small gold sun, plus the wordmark "Make My Marriage".
- No stock photos of people, no florals, no mandalas, no confetti, no clip-art hearts or rings.
  Use clean line icons and UI only.

APP SHELL
- Left sidebar (264px, ivory with a thin sand right border): logo at top. Navigation with line
  icons, in this order, with sub-items shown as indented links:
    Dashboard (active, burgundy tint pill)
    Events
    Tasks
    Guests: Guest List, Invitations, RSVP
    Expenses
    Vendors: My Vendors, Discover Vendors
    Wedding Website
    Photos: Gallery, Guest Upload, QR Code
    Live Stream
    Settings: Wedding Details, Wedding Members (the Members item has a small "Admin" pill)
  At the bottom: the signed-in user card (initials avatar, "Akshay Saini", role pill "Admin")
  and a "Sign out" link.
- Top bar: breadcrumb or page title at left; a global search field "Search guests, tasks,
  vendors"; a "+ Quick add" burgundy button that opens a menu (Add event, Add task, Add guest,
  Add expense, Add vendor, Upload photos); and the user avatar menu.
- Wedding identity is always visible: the couple name "Akshay & Princi", date "14 February 2027"
  and "Dehradun, Uttarakhand" shown in the page header, so the page always feels connected to
  this wedding.

DASHBOARD CONTENT (main area, scrolling, ivory background)

1. Hero wedding card (deep burgundy gradient card, full width): eyebrow "YOUR WEDDING", title
   "Akshay & Princi" in Playfair, subline "14 February 2027 · Dehradun, Uttarakhand". On the
   right a large "42" with "Days to Go" and a thin progress ring or bar. Two small buttons:
   "Edit wedding details" (outlined ivory) and "View wedding website".

2. Summary stat row (6 cards, each with a line icon, a big number, a label and a tiny link):
   - Events: 6 (link "View events")
   - Tasks: 32 / 48 completed with a thin progress bar
   - Guests: 186 invitations
   - RSVPs: 132 responded (small line "54 pending")
   - Expenses: ₹12,45,000 total spent (no budget, no limits)
   - Vendors: 8 booked

3. Two-column row:
   - Left, "Upcoming events" card: list of the nearest 3 events (Mehendi, Haldi, Sangeet) each
     with a date block, event name, time range, venue name, dress code chip, and a chevron.
     Footer link "All events". Include an "Add event" ghost button.
   - Right, "Upcoming tasks" card: list of incomplete tasks nearing their due date. Each row
     has a checkbox, title ("Finalise photographer"), assignee initials avatar, related event
     chip, due date, and a priority pill (Low, Medium, High). One overdue example in burgundy
     on a pale tint. Footer links "All tasks" and "My tasks".

4. RSVP overview card: a horizontal stacked bar and three legend items, Attending 120 invitations,
   Not attending 12, Pending 54, with a large "287 people attending" number beside it (invitations
   are different from people, because one invitation can bring several). Buttons: "Send reminder
   to pending guests" and "Share on WhatsApp".

5. Guests and invitations card: small table of recent guests (name, invited events as chips,
   max guests, RSVP status pill, "Copy link" and "WhatsApp" icon buttons). Footer "Manage guest
   list" and "Send invitations".

6. Expenses card: total ₹12,45,000, a simple category breakdown as horizontal bars (Venue
   ₹6,00,000, Catering ₹4,20,000, Photography ₹1,80,000) and an "Add expense" button. Must NOT
   show budget, remaining, variance or payment schedules.

7. Vendors card: 3 vendor rows (Pixel Photography, Royal Garden Venue, Spice Route Caterers)
   with category chip, phone icon and "Discover vendors" button.

8. Memories card: a grid of 6 abstract tonal placeholder tiles (sand and burgundy tints labelled
   Mehendi, Haldi, Sangeet, Wedding), NOT real photos. Counts "1,248 photos · 312 from guests".
   Buttons "Upload photos", "Share gallery link", "Show QR code".

9. Website and live stream card: wedding website status pill "Published" with the address
   makemymarriage.in/w/akshay-princi, a "Theme: Minimal Elegant" row and a "Change theme"
   link; below it a Live Stream row "YouTube Live linked" with an "Update link" action.

10. Wedding team card: avatars with names and role pills (Admin, Manager) and, for admins only,
    an "Invite member" button.

11. Getting started checklist (shown only when little is set up, collapsible): Create first
    event, Add a task, Add your first guest, Invite a family member, Send invitations. Each
    with a tick when done.

States to include as separate small frames at the bottom: empty dashboard for a brand-new
wedding (friendly empty cards with a primary action each), and a loading skeleton.

MOBILE SCREENS (390px wide), same palette, type and content as desktop. Generate these as
separate mobile screens:
- M1 Dashboard home. Replace the sidebar with a compact top bar (logo mark, couple name
  "Akshay & Princi", search icon, avatar) and a bottom tab bar with five tabs: Home, Events,
  Guests, Tasks, More. Add a floating burgundy "+" button (56px) above the tab bar. The hero
  wedding card shows "42 Days to Go". Stat cards become a horizontally scrollable chip row,
  then a 2-column grid. Cards 2 to 11 stack in a single column with 16px gutters, in the same
  order as desktop. Tasks have 44px tap-friendly checkboxes. Tables become cards.
- M2 More sheet. A full-height sheet listing Expenses, Vendors (My Vendors, Discover
  Vendors), Wedding Website, Photos (Gallery, Guest Upload, QR Code), Live Stream and Settings
  (Wedding Details, Wedding Members with the "Admin" pill), plus the signed-in user card and
  "Sign out".
- M3 Quick add sheet. A bottom sheet opened by the "+" button with Add event, Add task, Add
  guest, Add expense, Add vendor and Upload photos, each with an icon.
- M4 Empty dashboard and loading skeleton for a brand-new wedding.
- M5 Getting started checklist as a dismissible card at the top of the mobile home screen.
Mobile rules: body text at least 16px, tap targets at least 44px, safe-area padding at the
bottom, no horizontal page scrolling (only the stat chip row scrolls), no hover-only behaviour.

STRICT DON'TS: no budget planning, budget limits, split expenses, payment schedules, hotel or
room allocation, travel tracking, seating, SMS, push notifications, activity feeds, real-time
presence, AI assistant, custom domains. Do not add pricing, upgrade banners or ratings.

Accessibility: 4.5:1 text contrast, visible focus rings, status shown with text as well as
colour, tap targets of at least 44px.
```

---

## Prompt 2 (optional) — Regenerate the mobile dashboard only (390px)

Prompt 1 already generates the mobile screens. Use this only to redo them on their own.

```text
Create the mobile version (390px wide) of the same dashboard with the same palette, type and
content. Replace the sidebar with a compact top bar (logo mark, couple name "Akshay & Princi",
search icon and avatar) and a bottom tab bar with five tabs: Home, Events, Guests, Tasks,
More. "More" opens a full-height sheet listing Expenses, Vendors (My Vendors, Discover),
Wedding Website, Photos (Gallery, Guest Upload, QR Code), Live Stream and Settings. Add a
floating "+" button (burgundy, 56px) above the tab bar that opens a bottom sheet with Quick
add actions. The hero wedding card shows the big "42 Days to Go". Stat cards become a
horizontally scrollable row of chips, then a 2-column grid. All other cards stack in a single
column with 16px gutters. Tasks have large tap-friendly checkboxes (44px). Tables become
cards. Body text at least 16px, no horizontal page scrolling, safe-area padding at the bottom.
```

---

## Module prompts (one per screen group)

Paste each after the dashboard is locked. Put this line at the start of every module prompt so
Stitch keeps the shell and always produces both versions:

"Using the same app shell, sidebar, top bar, bottom tab bar, palette and typography as the
Make My Marriage dashboard, design the following screens in BOTH desktop (1440px) and mobile
(390px) versions. On mobile use the bottom tab bar and floating + button, single-column
layouts with 16px gutters, tables turned into cards, forms as full-screen pages or bottom
sheets, body text at least 16px, tap targets at least 44px, and no horizontal scrolling."

### 3. Events

```text
Events. List view grouped by date, chronological, each event a card with cover image placeholder
(tonal, no photos), name, date, start and end time, venue name, address, dress code and a
description snippet. "Add event" button with preset shortcuts as chips: Roka, Engagement,
Mehendi, Haldi, Sangeet, Cocktail, Wedding, Reception, Custom event. Create/Edit event form:
event name, type, date, start time, end time, venue name, address, description, dress code,
cover image upload. Event details page with linked tasks, invited guest count, vendors and
expenses for that event, and photos. Delete confirmation that warns when guests were invited:
"This event is on 42 invitations. Removing it hides it from their invitations." Empty state.
Edge case: an event dated after the main wedding date shows a gentle warning.
```

### 4. Tasks

```text
Tasks. Tabs: All Tasks, My Tasks, Completed. Filter bar: status (To Do, In Progress,
Completed), event, assigned member, priority (Low, Medium, High). Rows: checkbox, title,
assignee avatar, event chip, due date, priority pill, status pill with inline status change.
Create/Edit task form: title, description, assigned wedding member, related event, due date,
priority, status. Overdue tasks marked with a quiet burgundy tint. Delete confirmation. Empty
state. No comments, attachments, subtasks or dependencies.
```

### 5. Guests: Guest List, Invitations and RSVP

```text
Guests. A guest is one invitation (a family or group), not each person. Guest List table with
search, filters (RSVP status, event, invitation sent), pagination, and columns: name, email,
phone, max guests, invited events as chips, RSVP status pill (Pending, Attending, Not
attending), people attending, invitation sent. Add/Edit guest form: name, email, phone
(optional), maximum guests allowed including the guest, events invited to (multi-select
chips), notes. Guest details with the invitation link: "Copy link", "Share on WhatsApp",
"Send email invitation", "Resend", plus the RSVP history line "Responded 3 people on 12 Jan".
Invitations screen: summary (not sent, sent, responded), bulk actions "Send invitations to all
unsent", "Send to selected", progress while emails go out ("Sending 200 of 437"). RSVP screen:
counts by status, people attending total, list of pending guests, button "Send reminder to
pending guests" and per-guest "Send reminder". Include a no-email case: guests without an email
show only Copy link and WhatsApp.
```

### 6. Public invitation and RSVP preview (organiser view)

```text
Invitation preview. Show what a guest sees when opening their link, on a phone frame next to
the desktop screen: couple names "Akshay & Princi", welcome message, only the events this guest
is invited to with date, time and venue, and the RSVP form "Will you be attending?" Yes or No,
then "How many people will attend?" as a 1 to 4 selector capped at the allowed maximum, a
"Submit RSVP" button, and the note "You can change your response any time with this link."
No account or login anywhere.
```

### 7. Expenses

```text
Expenses. This is a tracker of money already spent, not a budget. Header total "Total Wedding
Expense ₹17,42,500" and a category breakdown (Venue, Catering, Photography, Videography,
Decoration, Clothing, Jewellery, Entertainment, Invitations, Gifts, Travel, Makeup,
Miscellaneous) as horizontal bars. Expense table: title, amount in ₹ with Indian digit
grouping, date, category, related event (optional), related vendor (optional), notes. Filters
by category, event, vendor and date range. Add/Edit expense form with those fields. Delete
confirmation. Empty state. No budget limits, no remaining balance, no instalments.
```

### 8. Vendors: My Vendors and Discover

```text
Vendors. Two tabs: My Vendors and Discover Vendors. My Vendors: cards or table with name,
category (Photographer, Videographer, Venue, Caterer, Decorator, DJ, Makeup Artist, Mehendi
Artist, Pandit, Choreographer, Florist, Wedding Planner, Transport, Other), contact person,
phone, email, address, website, total agreed cost in ₹, related events, notes. Add/Edit vendor
form. Discover Vendors: category chips, location field defaulting to "Dehradun" and editable,
result cards with name, rating and review count, address, distance, phone, and a burgundy "Add
to My Vendors" button, plus a "Search this area" control. Error state "Vendor discovery is
temporarily unavailable. The rest of your workspace still works." No booking or payments.
```

### 9. Wedding Website, Live Stream, Photos and QR

```text
Wedding Website: settings page with theme picker of three themes (Classic Indian, Minimal
Elegant, Modern Celebration) as preview cards, welcome message field, publish toggle with the
fixed address makemymarriage.in/w/akshay-princi (read-only, "Link stays the same even if names
change"), and a live preview. Live Stream: field for a YouTube Live URL with Add, Update and
Remove, a validation message and an embedded player preview; an invalid link shows "We couldn't
read this link". Photos: Gallery grid of abstract tonal tiles with album filter chips by event
plus "Other / Wedding Memories", upload dialog with event picker, progress per file and retry,
photo viewer with download and delete, and badges "Guest upload". Guest Upload settings: toggle
"Allow guests to upload", gallery visibility toggle, copy gallery link. QR Code screen: a
printable card "Share the Memories. Scan to upload and view photos from Akshay & Princi's
wedding." with a QR code placeholder, and buttons Download, Print and Share link.
```

### 10. Settings and Wedding Members

```text
Settings. Left sub-navigation: Wedding Details, Wedding Members, Website, Gallery, Livestream.
Wedding Details form: bride name, groom name, wedding date, location, title, description, cover
image upload. Wedding Members (Admin only): member list with avatar, name, email, role pill,
joined date and actions Change role and Remove; pending invitations with Revoke; "Invite
member" dialog with email and role (Admin or Manager). Explain roles in plain words: "Admins
manage everything, including members. Managers help with everything else." Safeguard messages:
"A wedding must keep at least one Admin" and the Leave wedding wording for the current user.
Show the Manager view of the page with Wedding Members read-only and no invite or remove
controls.
```

---

## Refinement prompts

- "Reduce visual density: fewer borders, more whitespace, and keep only one primary action per card."
- "Use ₹ with Indian digit grouping everywhere (for example ₹12,45,000)."
- "Make burgundy more restrained: use it for the active nav item, primary buttons and the hero card only."
- "Replace any photos, hearts, florals or decorative ornaments with clean UI."
- "Make the dashboard feel simpler for a parent: bigger text, clearer labels, fewer numbers per card."
- "Make every card follow the same header pattern: title left, one text link right."

## Checklist before accepting

- All PRD areas are present: dashboard summary and countdown, events, tasks, guests, event-level
  invitations, invitation links, RSVP, email and WhatsApp sharing, reminders, expenses, My Vendors,
  vendor discovery, wedding website with three themes, gallery and albums, guest upload, QR code,
  YouTube livestream, settings, wedding members.
- Wedding identity visible on every page.
- Admin-only items clearly marked; Manager variant shown.
- No budgets, payments, seating, travel, SMS, notifications, activity logs, AI or custom domains.
- Mobile has bottom navigation, a Quick add button and no horizontal scroll.
