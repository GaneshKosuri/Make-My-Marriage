# QA hand-off — Phase 3: Guests (guest list, invitations, RSVP, email, WhatsApp)

**Date:** 12 November 2026 · **Branch:** `dev` · **Commits:** `ba5bf6d` (shared UI clean-ups), `08b4411` (guests API), `fa30866` (guest screens), `29e1bd1` (invitation links, WhatsApp, guest RSVP), `41b027a` (email invitations and reminders)
**Scope:** PRD §9.7–9.14, API_DESIGN §39–52 and §85–87. Phases 1 and 2 were verified on 3 and 4 November; quick regression checks are at the end.

Automated checks on this build: lint, typecheck, 766 unit and component tests, 278 integration tests (in-memory MongoDB), production build and 22 Playwright tests (including the 320/360 px no-sideways-scroll check) all pass.

---

## 1. Test setup

Same as Phase 2 (see `docs/PROJECT_STATUS.md`, "Local testing setup"), with one change for email:

1. `npm run db:dev` in its own terminal (local MongoDB replica set).
2. `.env.local`: `MONGODB_URI=mongodb://127.0.0.1:27017/make-my-marriage-dev?replicaSet=rs0` and **`EMAIL_PROVIDER=console`**. Every email (invitations, reminders) then prints in the `next dev` terminal, including its link, and nothing leaves your machine.
3. Restart `npm run dev` after any `.env.local` change.

**Accounts you need**

| Who | How |
| --- | --- |
| **Admin A** | Sign up, create a wedding (India time zone), add 4–5 events (one archived later). |
| **Manager B** | Invite from Admin A, accept the `/join/...` link from the console. Managers have the same guest permissions as Admins. |
| **Admin C** | A second, separate wedding, for the cross-wedding checks in §10. |
| **A guest** | No account. Open invitation links in a **private window** or on a phone, never in A's or B's window. |

Most checks use two windows (A and B, or A and a guest) side by side.

> Tip: in the guest list, guests with an email address you can read (e.g. `you+rajesh@yourmail.com` with `EMAIL_PROVIDER=console`) make the printed emails easy to match.

---

## 2. Guest list — `/app/guests`

### 2.1 Adding guests

| # | Steps | Expected |
| --- | --- | --- |
| G1 | New wedding, open **Guests → Guest List** | "No guests yet" with **Add your first guest**. No summary strip yet. |
| G2 | **Add guest**: name only, save | "… added."; the row shows "1 person", "Awaiting reply" and "No events chosen yet". |
| G3 | Add "Rajesh Sharma" with email, phone, **People invited** 4 (use **+** three times), two events ticked, notes | Row: "Up to 4", "rajesh@… · +91 …" on one line, chips for the two events. |
| G4 | **People invited**: type 250; then delete the number and save | 250 is accepted; an empty box shows "Enter how many people are invited". **−** stops at 1. |
| G5 | Event checkboxes with 2+ events | **Select all** ticks every active event; then the link reads **Clear all** and unticks them. Archived events are not offered. |
| G6 | No events in the wedding yet | The form says "Add your events first; you can invite this guest to them later." and still saves. |
| G7 | Invalid values: email `raj@`, phone `call me`, name empty, notes > 2,000 characters | Field messages; nothing saved. |
| G8 | Two guests with the same email (a shared family address) | Both save (emails are not unique). |
| G9 | Dashboard → **Add guests** checklist step; phone **+** → **Add guest** | The add form opens straight away; the address bar shows `/app/guests` (no `?new=1`), and reloading does not reopen it. |

### 2.2 Search, filters and pages

| # | Steps | Expected |
| --- | --- | --- |
| G10 | Add ~25 guests | Name order ignoring capitals (anita next to Anita); "1–20 of 25"; **Next** / **Previous** work. |
| G11 | Search part of a name, an email, a phone number | The list follows a moment after you stop typing; the address shows `?search=…`. **×** clears it. |
| G12 | Search `a.c` or `+91` | Treated as plain text (`a.c` doesn't match "abc"). |
| G13 | Filters: RSVP = Awaiting reply; Event = one event; Invitation = Not sent; then combinations | Each narrows the list; combined filters all apply; the address keeps them; reload or a copied address shows the same list. |
| G14 | Filters matching nothing | "No guests match" with **Clear filters**. |
| G15 | With exactly 21 guests, open page 2 and delete its only guest | Back on page 1; never an empty card. |
| G16 | Summary strip above the search | Invitations (guest entries), **People coming** (sum of replies) and Awaiting reply, with **RSVP status** linking to the RSVP page. |

### 2.3 Editing and deleting

| # | Steps | Expected |
| --- | --- | --- |
| G17 | Pencil on a row → change only the phone → save | "… saved."; only the phone changed. **Save guest** is disabled until something changes. |
| G18 | Untick an event and tick it again, then save | Nothing is sent (no change); the form just closes. |
| G19 | Guest has replied "Attending · 3" (see §5); set **People invited** to 2 | Message under the field: "They said 3 people are coming. Allow at least 3." Nothing saved. 3 or more saves. |
| G20 | **Conflict:** A and B edit the same guest; B saves first; A saves | A sees "This guest changed while you were editing" with **Reload guest**; reload shows B's change. A's typing isn't lost by switching tabs before saving. |
| G21 | **Conflict with a reply:** A opens a guest's edit form; the guest replies in the private window; A saves | Same message as G20 (the reply changed the guest). After reload A sees the reply and can save. |
| G22 | Archive an event a guest is invited to, then edit the guest | The archived event stays ticked as "Name (archived)" and can be unticked; it can't be added to other guests. The row shows it struck through. |
| G23 | **Delete guest** in the form → **Keep**; then → **Yes, delete** | First does nothing; second removes the guest ("… deleted."). Their invitation link stops working (§5, R12). |

### 2.4 Guest page — `/app/guests/[id]`

| # | Steps | Expected |
| --- | --- | --- |
| G24 | Click a guest's name | Their page: RSVP card (reply, "Invited: up to 4 people", "Replied 12 Nov 2026, 4:00 PM" or "No reply yet…"), Contact (mailto and tel links), **Invitation link**, **By email**, Events (each links to its event page, with date and time), Notes. |
| G25 | **Edit** and **Delete** on the guest page | Edit saves in place with "… saved."; Delete asks, then returns to the list. |
| G26 | `/app/guests/<random 24-hex id>` and `/app/guests/abc` | "Guest not found" with a link back. |

---

## 3. Invitation link and WhatsApp (guest page)

| # | Steps | Expected |
| --- | --- | --- |
| L1 | **Invitation link** card | **Share on WhatsApp**, **Copy link**, **Open invitation**, and "Sharing the link doesn't mark the invitation as emailed." |
| L2 | **Copy link**, paste it somewhere | `…/invite/<long code>`; the button shows **Copied**. Copying twice, or on another day, gives the same link. |
| L3 | Block clipboard access (or use a browser without it) and **Copy link** | The link appears in a box to copy by hand. |
| L4 | **Share on WhatsApp** (desktop: WhatsApp Web; phone: the app) | Message: "Dear Rajesh Sharma, / Akshay & Princi would love for you to celebrate their wedding with them. / Please see your invitation and let us know if you can come: <link>". It uses the couple's **names**, even when the wedding has a custom title. |
| L5 | After sharing or copying | "Invitation not emailed yet." still shows; the list's Invitation filter still says Not sent. |

---

## 4. Guest's invitation page — `/invite/[code]` (private window, no account)

| # | Steps | Expected |
| --- | --- | --- |
| R1 | Open Rajesh's link | Burgundy card "You're invited", "Akshay & Princi", the wedding date ("Sunday, 14 February 2027") and place; "Dear Rajesh Sharma," with the welcome line; "This invitation is for up to 4 people." No app menus, no sign-in. |
| R2 | Events | Only the events Rajesh is invited to, in date order: date, time in the wedding's time zone (a Sangeet to 1 AM reads "(next day)"), venue, address with **Open in Google Maps**, dress code, notes. |
| R3 | Archive one of Rajesh's events (as A), reload his page | That event is gone from his invitation. |
| R4 | Wedding with a custom title (Wedding Details) | The names stay as the heading; the title shows under them. |
| R5 | **RSVP**: **Yes, I'll be there** | "How many people will attend?" with buttons 1–4 (no 5). |
| R6 | Choose 3 → **Send reply** | "Thank you for letting us know! You're coming with 3 people in all." A's guest list shows "Attending · 3" (after a refresh or returning to the tab); the summary's People coming goes up by 3. |
| R7 | **Change reply** → **Sorry, I can't come** → **Update reply** | "You can't make it. You'll be missed!"; A sees "Not attending". |
| R8 | **Send reply** without choosing yes or no | "Choose yes or no." |
| R9 | Guest with **People invited** 1 | Yes needs no count ("You're coming."). |
| R10 | Guest with **People invited** 25 | A − / + counter instead of 25 buttons; it stops at 25. |
| R11 | **Party size lowered:** guest page open with Yes + 4 chosen (not sent); A lowers People invited to 2; guest sends | "The number of people on this invitation has changed. Please check your reply and send it again." The choice moves to 2 (and the 3–4 buttons disappear); Yes stays selected. |
| R12 | Open a deleted guest's link, a link with a few characters changed, `/invite/abc` | "This invitation isn't available" (the same page for all three). |
| R13 | Same link open in two tabs; reply in one | The other tab shows the new reply when you switch to it. |
| R14 | Send a reply 21 times within 15 minutes (change it back and forth) | The 21st is refused: "You've changed your reply many times. Please wait a few minutes and try again." Other guests' links are not affected. |
| R15 | Phone (320–360 px wide) | Everything fits without sideways scrolling; buttons are easy to tap. |
| R16 | View source / response headers of the invitation page | `noindex`; `Referrer-Policy: no-referrer`. The page shows no email, phone, notes or other guests. |

---

## 5. RSVP page — `/app/guests/rsvp`

| # | Steps | Expected |
| --- | --- | --- |
| P1 | No guests | "No guests yet" with **Add guests**. |
| P2 | With replies | **People coming** (big number) and "N invitations", then Attending / Awaiting reply / Not attending in **invitations**. |
| P3 | Tabs **Awaiting reply / Attending / Not attending** | Each lists the matching guests (name opens their page); the address shows `?status=…`; an empty tab says e.g. "Everyone has replied." |
| P4 | Dashboard RSVP card → **RSVP status** | Opens this page. |

---

## 6. Email invitations and reminders (`EMAIL_PROVIDER=console`)

### 6.1 One guest at a time (guest page → **By email**)

| # | Steps | Expected |
| --- | --- | --- |
| M1 | Guest with no email | "Add an email address to send the invitation by email." with **Add email** (opens Edit). |
| M2 | **Email invitation** | "Invitation emailed."; the card reads "Invitation emailed 12 Nov 2026, 4:05 PM." The terminal shows subject "You're invited: Akshay & Princi's wedding", "Dear …", the date and the guest's own link (same as **Copy link**). |
| M3 | Open the emailed link in the private window | The guest's invitation (§4). |
| M4 | After M2 | **Email again** and **Send RSVP reminder** appear (the reminder only while the guest hasn't replied). |
| M5 | **Send RSVP reminder** twice | Subject "Reminder: please RSVP for Akshay & Princi's wedding"; the card reads "2 reminders sent, the last …". |
| M6 | Guest replies; reload their page | **Send RSVP reminder** is gone. |
| M7 | A has the guest's edit form open while B emails the guest | A can still save (sending an email doesn't make A's form out of date). |

### 6.2 Everyone at once

| # | Steps | Expected |
| --- | --- | --- |
| M8 | Guest List with 5 guests with email (not emailed) and 2 without | **Email 5 invitations** next to **Add guest**. |
| M9 | Click it → **Not now** | Nothing sent. |
| M10 | Click it → **Send invitations** | The dialog closes at once; a panel shows "Emailing invitations: n of 5 sent" with a progress bar, then "5 invitations emailed." with a close (×). The terminal shows 5 emails; the 2 guests without email get none. The button disappears (no one left to invite). |
| M11 | Double-click **Send invitations**, or run M10 in two windows at once | Each guest still gets **one** email. |
| M12 | Start a bulk send and leave the page straight away | The emails still go out (check the terminal). |
| M13 | RSVP page → **Awaiting reply** → **Remind N guests** → **Send reminders** | Reminders to everyone with an email address who hasn't replied; progress as in M10; their pages show "Reminder sent …". |
| M14 | A guest replies, or is deleted, while their email is still queued | That email is not sent; the panel says "1 was skipped (deleted, or already replied)." (Hard to time by hand; covered by automated tests. Note it if you manage it.) |

### 6.3 Failures (optional, needs a real sender)

| # | Steps | Expected |
| --- | --- | --- |
| M15 | `EMAIL_PROVIDER=gmail` with a wrong app password, **Email invitation** | "Email delivery is temporarily unavailable."; nothing marked as sent. The terminal log names the cause (Gmail refused the sign-in) without the password. |
| M16 | Bulk send with the wrong app password | Progress stops with "n couldn't be sent." after retries (the retries take 5 and 30 minutes; **Try again** re-sends at once). |
| M17 | Cron: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/internal/jobs/email` | `{"data":{"claimed":…,"sent":…,"failed":…}}`; without the header: 401. |

---

## 7. Dashboard and home page

| # | Steps | Expected |
| --- | --- | --- |
| H1 | Dashboard after adding guests and replies | Guests card counts guest entries; RSVP card shows attending / awaiting / not attending and **people attending**; the "Send invitations" checklist step ticks after the first emailed invitation. |
| H2 | Signed out, `/` | Guests ("guest lists and RSVPs") and email invitations no longer say "Coming soon"; gallery, expenses, vendors, website and livestream still do. |
| H3 | Expenses, Vendors, Photos, Website, Livestream | "Coming soon" card, with no "(PRD §…)" or "Placeholder · Phase …" text. |

---

## 8. Phone sizes (320 and 360 px)

| # | Steps | Expected |
| --- | --- | --- |
| Z1 | Guest List | Search box, then a **Filters** button (showing "Filters (2)" when two are on) that opens the selects. Long names wrap; long emails and event chips are cut short on one line. No sideways scroll. |
| Z2 | Add/edit guest | Bottom sheet; − / number / + on one row; events one per row; **Cancel** / **Save guest** pinned at the bottom. |
| Z3 | Guest page | Cards stacked; the WhatsApp button full width. |
| Z4 | RSVP page | Reply counts as compact rows; tabs fit (labels may wrap to two lines). |

---

## 9. Security and API checks

Sign in as Admin C and use the dev tools console (or curl with C's cookie), with ids from A's wedding (address bar on guest pages).

| # | Request (as C, with A's ids) | Expected |
| --- | --- | --- |
| S1 | `GET` / `PATCH` / `DELETE /api/guests/<A's guest id>` | 404 `NOT_FOUND`; A's guest unchanged |
| S2 | `GET /api/guests/<A's guest id>/invitation-link` | 404; no link |
| S3 | `POST /api/guests/<A's guest id>/send-invitation` and `/send-reminder` | 404; nothing emailed |
| S4 | `POST /api/guests/actions/send-invitations` `{"scope":"SELECTED","guestIds":["<A's guest id>"]}` | 200 with `jobsCreated: 0`; nothing emailed |
| S5 | `GET /api/email-batches/<A's batch id>` (from A's Network tab) | 404 |
| S6 | `POST /api/guests` with `"weddingId"`, `"rsvpStatus"`, `"attendingCount"` or `"invitationToken"` | 400 (unknown field) |
| S7 | `POST /api/guests` with an event id from A's wedding | 400 with an `invitedEventIds` message |
| S8 | Any guest response (list, get, create) | Never contains `invitationToken` or the invitation code |
| S9 | As a guest (no session): `POST /api/public/invitations/<code>/rsvp` `{"status":"ATTENDING","attendingCount":5}` for a party of 4 | 400 `GUEST_LIMIT_EXCEEDED`; nothing saved |
| S10 | Same with `{"status":"NOT_ATTENDING","attendingCount":1}` or `{"status":"PENDING","attendingCount":0}` | 400 |
| S11 | `GET /api/public/invitations/<code>` | Only the fields on the page: no ids, contacts, notes or other guests |
| S12 | Signed out: `GET /api/guests`, `/api/guests/rsvp-summary` | 401 |

---

## 10. Regression (quick)

- **Phase 1:** sign up, sign in/out, create wedding, Wedding Details, invite + join + role change + remove, Settings tabs on a phone.
- **Phase 2:** add/edit/archive an event, add/tick/edit/delete a task, the event and task conflict messages.
- **Shared pieces moved in this phase** (no behaviour change intended): every dialog and sheet, the "couldn't save / changed meanwhile" banners, loading placeholders, and buttons on Events, Tasks and Members (secondary buttons are now 44 px tall everywhere).

---

## 11. Decisions to confirm

| # | Decision | Where it shows |
| --- | --- | --- |
| Q1 | **Copying or sharing a link doesn't count as sending the invitation**; only an email does. | L5 |
| Q2 | Invitations, WhatsApp messages and emails use the couple's **names** ("Akshay & Princi"), never the custom title; the title shows under the names on the invitation. | L4, R4 |
| Q3 | **Bulk reminders** go to everyone with an email address who hasn't replied, including guests who were invited by WhatsApp rather than email. On a guest's page, the reminder button appears only after their invitation was emailed. | M4, M13 |
| Q4 | One guest = one invitation; **reply counts are invitations**, people coming is the sum of replies. | P2, G16 |
| Q5 | **Lowering the party size** below a guest's reply is refused; the organiser must raise it or ask the guest to change their reply. | G19 |
| Q6 | **Email limits:** when the email account (Gmail ~500/day) refuses for its limit, queued emails wait an hour and keep trying; nothing is lost. | §6.3 |
| Q7 | Organiser email limits (placeholders): 60 single emails and 10 bulk sends per wedding per hour; guests: 20 replies per link per 15 minutes. | R14 |
| D7 | (Still open from Phase 2) **Changing the wedding's time zone** keeps each event's moment, so clock times shift. | — |

---

## 12. Known limitations (not bugs)

- **No guest selection for bulk email** yet: the API accepts chosen guests, but the screens offer "everyone not yet invited" / "everyone awaiting a reply" plus per-guest sends.
- **Sending speed:** a bulk send runs right after you start it and while the progress panel is open; whatever is left after that waits for the daily cron (Vercel Hobby). A more frequent scheduler is an open item in `PROJECT_STATUS.md`.
- **Real email:** Gmail sends about 500 a day; a verified domain on Resend is needed before launch.
- **Not in Phase 3 (PRD §16 "advanced"):** households, meal preferences, seating, CSV import.
- **Invitation artwork:** the page uses the brand colours; the floral artwork mentioned in API_DESIGN §50 notes isn't in the repo.
- **First page loads in `next dev`** take several seconds while the page compiles; judge speed on a production build.
- `docs/CODEBASE_ARCHITECTURE.md` §14 still lists these endpoints as "501 stub" (outside the editable set).

## 13. Reporting

Please use the Phase 1 format: P1/P2/P3 with the check number (e.g. "R11"), steps, expected, actual, and browser/size.
