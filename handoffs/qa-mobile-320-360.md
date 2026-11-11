# QA hand-off: mobile layout at 360 px and 320 px

**Tested:** 11 November 2026 · **Build:** `dev` at `a809c0c` (themed date/time fields) · **Screenshots:** `handoffs/mobile-qa/`

## Target

The app must work from **360 px** wide and still hold up at **320 px**:
- 360×800 covers most Android phones.
- 320×640 covers the iPhone SE (1st gen) and small Androids.

At both widths, nothing should scroll sideways, nothing should be clipped, and every control should be reachable.

## How this was tested

- **Browser:** headless Chromium in **mobile emulation**: `isMobile`, touch, device scale 2, 360×804 and 320×640.
- **Coverage:** all 30 routes, signed out, as Admin, as Manager and as a user without a wedding. Then every menu, sheet, confirmation, calendar, time field and validation state, at both widths.
- **Realistic long data:**
  - Couple: "Sai Krishna Chaitanya & Venkata Lakshmi Priyanka".
  - Admin: "Venkata Lakshmi Narasimha Rao".
  - Event: "Grand Reception Dinner with Live Ghazal Band, Fireworks and Midnight Buffet", at "Sri Venkateswara Convention Centre & Gardens", with a full street address.
  - A 50-character invitation email, and a task whose title contains a Google Drive link.
- **Mobile emulation matters.** On a phone, when content is wider than the screen, Chrome widens the page and zooms out or lets it pan sideways. The `overflow-x` clipping you see in desktop "responsive" mode hides this. **To reproduce, use DevTools with a *Mobile* device type** (e.g. "Galaxy S8+" or a custom 360×800 mobile device). Then check `innerWidth` in the console: on a broken page it reads larger than 360.
- **Test data:** removed from Atlas `test` afterwards (3 users, 1 wedding, 5 events, 5 tasks, 3 invitations, 34 sessions). No emails were sent.

## Summary

| # | Sev | Where | Problem |
|---|---|---|---|
| M1 | P1 | Dashboard, Tasks | One long link or long venue name makes the whole page 500–700 px wide; Tasks sheets get cut off |
| M2 | P1 | All sheets/dialogs (seen on Revoke) | A long email in the title runs off screen and pushes the close button out of view |
| M3 | P1 | Event form (Date / Ends on) | Calendar button spills out of the date field and overlaps "Starts at" at 320; touches the border at 360 |
| M4 | P1 | Join page, signed in as someone else | The "different email" warning makes the page 134–173 px too wide |
| M5 | P1 | Home page | 22 px too wide at 360 and 62 px at 320; the header CTA and hero are clipped |
| M6 | P2 | Members → Pending invitations | Email cut to about 9 characters ("qa5.17944…"), so you can't tell invitations apart |
| M7 | P2 | All bottom sheets | Form content shows in a strip below Cancel/Save |
| M8 | P2 | Edit task → Delete | The confirmation sits behind the action bar; "Yes, delete" is half hidden |
| M9 | P2 | "+" button | Covers form fields on Settings; with the save bar, about 200 px of a 640 px screen is chrome |
| M10 | P2 | Settings calendar at 320×640 | The popover opens under the bottom nav, so the last week is hidden |
| M11 | P2 | Task rows | The event chip wraps to 5 lines in a narrow box |
| M12 | P2 | Many | Tap targets of 18–24 px (task tick, text links, FAQ) |
| M13 | P2 | Tasks filters | 14 px selects make iOS Safari zoom in on focus |
| M14–M22 | P3 | Various | Polish (see below) |

**What already works at 320 and 360:**
- **No sideways scrolling** on sign in, sign up, forgot/reset password, create wedding, Events, event pages, Settings, Members, the placeholder pages and the 404 page.
- **Sheets:** the Add/Edit event and task sheets, Invite and the "+" / More menus are proper bottom sheets with pinned actions.
- **Input text** is 16 px, so iOS doesn't zoom, apart from M13.
- **Calendar day cells** are 40 px.

---

## P1: broken layout

### M1 · Dashboard and Tasks grow wider than the screen
- **Screenshots:**
  - `mobile-qa/m1-dashboard-long-link-320.png` and `m1-dashboard-360.png`: the Upcoming events and Upcoming tasks cards run off the right edge.
  - `m1-tasks-long-link-320.png`: the link runs out of the task card.
  - `m1-task-sheets-cut-off-360.png`: on the Tasks page, the Add task sheet is cut off on the right.
- **Steps:**
  1. Add a task titled `Send https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789 to the photographer`.
  2. Open `/app` and `/app/tasks` on a 360 px phone.
- **Expected:** the page is 360 px wide and the link wraps.
- **Actual:**
  - **Dashboard:** 696 px wide at 360 and 696 px at 320.
  - **Tasks:** 602 px at 360, 603 px at 320.
  - **Phone behaviour:** Chrome zooms the page out or lets it pan sideways. Every sheet opened from Tasks inherits the width and is cut off.
  - **Without the link, the Dashboard is still 494 px wide.** The venue "Sri Venkateswara Convention Centre & Gardens" (a `truncate`, i.e. `nowrap`, span) is enough to cause it.
- **Cause:**
  - **Dashboard:** `dashboard-screen.tsx:117` uses `grid gap-4 md:gap-6 lg:grid-cols-2` with no column template on mobile. The implicit column is `auto`, so it grows to the widest unbreakable content (min-content).
  - **Tasks:** the title `<button>` in `tasks-screen.tsx:533` has `break-words`. `overflow-wrap: break-word` doesn't reduce min-content, so the shrink-to-fit button is as wide as the link.
- **Fix:**
  - **Dashboard grid:** use `grid grid-cols-1 lg:grid-cols-2` (Tailwind's `grid-cols-1` is `minmax(0,1fr)`), and add `min-w-0` to both `<section>`s.
  - **User-entered text** (task titles, event names, venues, notes, emails): use `[overflow-wrap:anywhere]` (or `break-words` plus `min-w-0` on every flex/grid ancestor).
  - **Task title button:** make it `block w-full min-w-0` (or `max-w-full`).
  - **Check the same pattern** in the Upcoming tasks rows, Events list rows, the event page's "Tasks for this event" list and the dashboard checklist.

### M2 · Sheet/dialog titles don't wrap, so the close button disappears
- **Screenshots:** `m2-revoke-320.png`, `m2-revoke-360.png` (your screenshot showed the same dialog).
- **Steps:**
  1. Invite `ganesh.reddy.wedding.planner.1234@mailinator.com` (any address over about 30 characters).
  2. Tap **Revoke**.
- **Expected:** the title wraps inside the sheet and the ✕ stays at top right.
- **Actual:**
  - **Title:** "Revoke the invitation to qa5.1794412404103.venkata.laksh…" runs off the right edge.
  - **Close button:** the ✕ is pushed off screen.
  - **Description:** cut off ("…straight away. You").
  - **Short emails:** the title still takes 3 lines of large serif (your screenshot).
- **Cause:** the shared `Dialog` in `src/features/members/components/dialog.tsx` (used by every sheet in the app). The title wrapper is a plain `<div>` inside `flex items-start justify-between`, with no `min-w-0`/`flex-1`. The `<h2>` doesn't break long words.
- **Fix:**
  - **Layout:** title wrapper `min-w-0 flex-1`; `<h2>` gets `[overflow-wrap:anywhere]`; close button `shrink-0`.
  - **Wording:** keep confirmation titles short and move the variable part into the description. For example, title "Revoke this invitation?" and description "**ganesh.1234@mailinator.com** won't be able to use the link…".
  - **Size:** consider `text-title-lg` instead of `text-headline-sm` for confirmation titles on phones.

### M3 · Date field's calendar button spills out of the field
- **Screenshots:** `m3-date-fields-320.png`, `m3-date-fields-360.png` (your Add event screenshot).
- **Steps:**
  1. Open **Add event** on a 320 px phone.
  2. Look at the **Date** and **Ends on** fields.
- **Expected:** the date, the calendar icon and the field border all fit in the column.
- **Actual:**
  - **The field needs about 164 px** (segments `09 / 01 / 2027` ≈ 121 px at 16 px, + 8 px gap + 36 px button + 22 px padding).
  - **The column is 138 px at 320:** the calendar button sits at x 145–181 while the field ends at 154, so it overlaps the **Starts at** field (which starts at 166).
  - **The column is 158 px at 360:** the button touches/overhangs the border by about 7 px.
  - **Time fields fit.**
- **Cause:** the two-column grid in `event-form-dialog.tsx`, combined with the fixed min-content of `DateField` (`date-time-fields.tsx`, `groupClass` line 97, `DateInput className="flex flex-1"`).
- **Fix (pick one):**
  - **(Recommended)** Below 400 px, put **Date** full width on its own row, then **Starts at | Ends at** side by side. Do the same for **Ends on**. For example, change the grid to `grid-cols-1 min-[400px]:grid-cols-2`, or restructure the rows.
  - Or keep two columns but hide the calendar button when the field is under about 170 px (a container query on the field). The segments are still editable and the keyboard still works.
  - **Don't** just add `overflow-hidden`: that would clip the year.

### M4 · Join page: "This invitation is for a different email" breaks the layout
- **Screenshot:** `m4-join-other-account-320.png`
- **Steps:**
  1. Sign in as user X.
  2. Open an invitation link sent to a different, long email.
- **Expected:** the warning wraps inside its box.
- **Actual:**
  - **Text clipped:** "This invitation is for a different em…" and both emails run off the right.
  - **Page too wide:** 494 px at 360 and 493 px at 320, so it zooms or scrolls sideways.
  - **Short address:** even with a short invited address ("as an Admin"), the page is 20 px too wide at 320.
- **Cause:** in `join-screen.tsx`, the text `div.text-body-md` inside `flex gap-3 … border-l-4` has no `min-w-0`, and the emails don't break.
- **Fix:** add `min-w-0 flex-1` to the text column and `[overflow-wrap:anywhere]` to the emails. Consider putting each email on its own line.

### M5 · Home page is wider than the screen
- **Screenshot:** `m5-home-320.png`
- **Steps:** open `/` signed out on a 360 or 320 px phone.
- **Expected:** no sideways movement; header and hero fully visible.
- **Actual:**
  - **Page width:** 382 px (22 px too wide at 360, 62 px at 320).
  - **Header:** the **Start planning** button is cut off ("Start plannin" / "Start").
  - **Hero:** the headline "Your whole wedding, in one place." and the paragraph are clipped on the right.
  - **Preview card:** the Romeo & Juliet workspace preview loses its right edge ("Active planning", "Tasks 32/48", stat cards).
  - **Footnote:** "Built for Indian weddings. Guests never need an acc…" is clipped.
- **Cause:**
  - **Hero grid:** `hero.tsx:13` is `grid … xl:grid-cols-12` with no mobile column template, so it is sized by the preview's min-content.
  - **Preview:** `workspace-preview.tsx` has `whitespace-nowrap` chips and a `grid-cols-4` stats row.
  - **Header:** `site-header.tsx` puts logo, menu and a `whitespace-nowrap` CTA in one row.
- **Fix:**
  - **Hero:** `grid-cols-1 xl:grid-cols-12`.
  - **Preview:** `min-w-0` on the preview; stats `grid-cols-2` below `sm`; let the chips wrap or hide them below 360.
  - **Header:** below about 400 px, hide the header CTA (the hero already has **Start planning**) or shorten it to "Start".

---

## P2: wrong but usable

### M6 · Pending invitations: email unreadable
- **Screenshot:** `m6-pending-invites-320.png`
- **Actual:**
  - **Email width:** squeezed next to **Resend / Revoke**. At 320 it gets 73 px ("qa5.17944…"); at 360, 113 px. With two pending invitations you can't tell which is which.
  - **Expiry:** "Expires 18 Nov 2026" wraps onto two lines.
  - **Member rows:** emails are also cut ("…manager@ex…"), which is acceptable there.
- **Fix:** on phones, stack the row:
  1. The email full width, wrapping with `[overflow-wrap:anywhere]`.
  2. Role badge · expiry.
  3. An actions row (Resend, Revoke) aligned right or full width.

  File: `members-screen.tsx` (`PendingInvitations`).

### M7 · Content shows below the sheet's action bar
- **Screenshot:** `m7-sheet-strip-360.png` ("Notes / Optional" visible under Cancel / Save task; at 320 the Status select shows under it).
- **Actual:** a strip of about 16 px plus the safe area below the pinned **Cancel / Save** buttons shows form content scrolling underneath. The same happens in Add/Edit event and Edit task.
- **Cause:** in `dialog.tsx` (and the same classes in `quick-add.tsx:122`), the scroll container itself has `pb-[calc(16px+env(safe-area-inset-bottom))]` and the footer is `sticky bottom-0`. A sticky element sticks inside the padding box, so the padding area stays a window onto the content.
- **Fix:** lay out the sheet as a flex column: header, then a scrolling body (`flex-1 overflow-y-auto`), then the footer **outside** the scroller. Put the safe-area padding on the footer.

### M8 · Deleting a task: confirmation hidden behind the action bar
- **Screenshot:** `m8-task-delete-360.png`
- **Steps:**
  1. Edit a task.
  2. Scroll to the bottom and tap **Delete task**.
- **Actual:**
  - **Placement:** the inline prompt "Delete this task? This can't be undone. Keep it / Yes, delete" appears at the bottom of the form, under the pinned **Cancel / Save task** bar. **Yes, delete** is half covered.
  - **Competing buttons:** Save and Cancel stay active next to it, so there are two sets of buttons on screen.
- **Fix (one of):**
  - Scroll the prompt into view and temporarily replace the footer with **Keep it / Yes, delete**.
  - Or use the same confirmation dialog as Archive/Revoke/Remove.

  File: `task-form-dialog.tsx:314`.

### M9 · The "+" button covers content
- **Screenshot:** `m9-settings-fab-320.png`
- **Settings:** the "+" button covers the Time zone select and the "Optional" labels. Once a field changes, the **Discard / Save changes** bar sits on top of the "+" button, which sits on top of the bottom nav. That stack takes about 200 px of a 640 px screen, and the bar covers the Wedding date / Time zone fields.
- **Events list:** the "+" covers part of a row's time pill (e.g. Haldi "9:00 AM – 9:00 AM (next day)").
- **Fix:**
  - **Hide the "+" button** on Settings pages, and whenever a save bar or sheet is open.
  - **Lists:** give them bottom padding ≥ "+" height + 16 px.

  File: `quick-add.tsx:92`.

### M10 · Calendar popover hidden under the bottom nav
- **Screenshot:** `m10-settings-calendar-320.png`
- **Steps:** at 320×640, tap the calendar button in Settings → Wedding date.
- **Actual:** the popover opens below the field and its last week row (24–30) is under the bottom nav, so those days can't be tapped without closing it.
- **Fix (one of):**
  - Give the React Aria `Popover` a boundary or padding that excludes the 64 px nav (`containerPadding`), plus a `max-h` with scrolling.
  - Or on phones open the calendar in a bottom sheet.

  File: `date-time-fields.tsx` (`Popover placement="bottom start"`).

### M11 · Event chip under a task wraps into a tall box
- **Screenshot:** `m1-tasks-long-link-320.png` (second panel).
- **Actual:** on Tasks, the event chip "Grand Reception Dinner with Live Ghazal Band, Fireworks and Midnight Buffet" wraps onto 5 lines in a narrow bordered box. On the dashboard it's cut off instead (M1).
- **Fix:** make the chip a single line with `max-w-full truncate` and a `title` attribute.

### M12 · Tap targets below 44×44 px (the guideline minimum on both iOS and Android)
Measured at 360:

| Control | Size | Where |
|---|---|---|
| Task **tick circle** (main action on the list) | 24×24 | Tasks, event page, dashboard |
| Task **title** (opens edit) | 121–164 × 18 | Tasks |
| **Add event / All events / All tasks / My tasks** links | about 55–85 × 18 | Dashboard cards |
| **Open in Google Maps**, **Add task**, **All events** | 77–152 × 18 | Event page |
| **Show archived events** | 138×18 | Events |
| **Delete task** | 96×18 | Edit task |
| **Forgot password?**, **Back to sign in** | 103×18, 119×22 | Login, forgot password |
| **Sign out**, time zone **Change** | 49×18, 46×18 | Create wedding |
| FAQ questions (`summary`) | 298×23 | Home |
| Make Admin / Remove / Resend / Revoke | 76–122 × 36 | Members |
| Show password, calendar, time and month-arrow buttons | 36×36 | Forms |

- **Fix:** give each one at least a 44 px hit area. Use padding (`py-3`, `min-h-11`) or an invisible `::before` expansion, so the visual size can stay the same.
- **The task tick** matters most: make the button 44×44 with the 24 px circle centred.

### M13 · iOS zooms in on the Tasks filters
- **Where:** the four filter `<select>`s on Tasks (Status, Event, Assigned to, Priority) are 14 px. iOS Safari zooms the page when a field under 16 px gets focus, and doesn't zoom back.
- **Fix:** `text-base` (16 px) below `sm`. Every other field already uses 16 px.

---

## P3: polish

| # | Where | Observation | Suggestion |
|---|---|---|---|
| M14 | Dashboard hero | **Edit details** and **View website** wrap onto two lines at 320; **View website** also wraps at 360 | Stack both buttons full width below 400 px |
| M15 | App header | The couple name is cut to "Sai Krishna Chaitany…", so only the groom shows | Use first names on phones ("Sai & Venkata") or allow two lines |
| M16 | Settings tabs | **Wedding Details / Wedding Members** become a sideways scroller at 320; the active pill is cut at the right edge (`settings-tabs.tsx:17–18`, `w-max` + `overflow-x-auto`) | Two equal columns at full width on phones |
| M17 | Join page tabs | "Create an account" wraps onto two lines at 320; the two tabs have different heights | Shorter labels ("New account" / "Sign in") or a smaller label size |
| M18 | Events list (`m18-events-list-320.png`) | At 320 the venue is cut to about 116 px ("Simhachalam Te…", "Sri Venkateswar…"). The time pill "9:00 AM – 9:00 AM (next day)" wraps inside a fully rounded pill, which looks broken | Let the venue wrap to 2 lines; use `rounded-lg` for the time pill, or put "(next day)" on its own line outside the pill |
| M19 | Confirmations | Revoke/Remove stack full-width buttons with the destructive one on top; Archive puts **Keep event / Archive event** side by side | Use one pattern on phones (stacked, destructive on top, matching Revoke) |
| M20 | Long titles in single-line inputs | Edit task shows "Confirm the decorator's final quota…" and Edit event shows "Grand Reception Dinner with Live Ghaza…" in a one-line field. At 320 the password placeholder is cut ("Enter your passwor") | An auto-growing textarea for task and event titles; shorter placeholder ("Password") |
| M21 | Small text | Uppercase eyebrows and bottom-nav labels are 10–11 px; the home footnote is 11 px; the home preview has 9.5 px text | 12 px minimum for readable text (nav labels can stay 11 px) |
| M22 | Scrollbar inside sheets | The brand-coloured scrollbar (`d3b90af`) shows inside sheets in DevTools phone emulation (your screenshot). Real phones overlay their scrollbars | Optional: `@media (pointer: coarse) { scrollbar-width: none }` inside sheets |

**Outside mobile scope:** the Guests, Expenses, Vendors, Photos, Website and Livestream placeholder pages show developer text to users: "(PRD §9.7–9.14)" and "Placeholder · Phase 3: Guests".

---

## Suggested guard rails

1. **Global rule for user-entered text.** Any element showing names, emails, titles, venues, notes or links gets `min-w-0` (and its flex/grid parents too) plus `[overflow-wrap:anywhere]`.
   - **Mobile grids:** `grid` with no `grid-cols-*` is a trap on phones; always start from `grid-cols-1`.
   - **`truncate`/`whitespace-nowrap`** inside a grid or flex item needs `min-w-0` on every ancestor up to the card.
2. **E2E check.** Add a Playwright test that seeds the long data above and, for every route and every sheet, asserts `document.documentElement.scrollWidth <= 320`. Run it with a *mobile* context (`isMobile: true`, width 320 and 360), and it would catch M1, M4 and M5 automatically.
3. **Don't rely on `overflow-x: hidden`** on `html`/`body`. It hides the problem in desktop responsive mode, but mobile Chrome still widens the page.

## Re-test after fixes

- **Sizes:** 320×640 and 360×800 in a **mobile** device profile.
- **Data:** the long-data recipe above.
- **Routes:** `/`, `/app`, `/app/events`, an event page, `/app/tasks`, `/app/settings`, `/app/settings/members`, `/join/<token>` (signed out, signed in as the invitee, signed in as someone else), `/create-wedding`.
- **Interactions:** every sheet (Add/Edit event, Add/Edit task, Invite, Revoke, Remove, Archive, Delete task), both calendars and the "+" / More menus.
