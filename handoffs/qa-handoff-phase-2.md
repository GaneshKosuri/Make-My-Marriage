# QA hand-off — Phase 2: Planning (events and tasks)

**Date:** 4 November 2026 · **Branch:** `dev` · **Commits:** `25b2f4d` (events API), `fb9192f` (events screens), `60d2fb1` (tasks API), `d513e0f` (tasks screen), plus the code-review fixes (R1–R7)
**Scope:** PRD §9.5 (events) and §9.6 (tasks), API_DESIGN §29–38. Phase 1 was verified on 3 November; its smoke checks are repeated at the end.

Automated checks on this build: lint, typecheck, 671 unit and component tests, 193 integration tests (in-memory MongoDB), production build and 14 Playwright smoke tests all pass.

---

## 1. Test setup

Same as Phase 1 (see `docs/PROJECT_STATUS.md`, "Local testing setup"):

1. `npm run db:dev` in its own terminal (local MongoDB replica set).
2. `.env.local`: `MONGODB_URI=mongodb://127.0.0.1:27017/make-my-marriage-dev?replicaSet=rs0` and an empty `RESEND_API_KEY` (emails print in the `next dev` console).
3. Restart `npm run dev` after any `.env.local` change.

**Accounts you need**

| Who | How |
| --- | --- |
| **Admin A** | Sign up, create a wedding (India time zone). |
| **Manager B** | Invite from Admin A (Settings → Wedding Members), accept the `/join/...` link from the console. |
| **Admin C** | A second, separate wedding, for the cross-wedding checks in §5. |

Use two browsers (or a normal and a private window) for A and B; several checks need both at once.

> The Atlas `make-my-marriage-dev` database also has a developer preview account (`preview@example.test`, wedding "Akshay & Princi"). It is not part of this test plan and can be ignored or deleted.

---

## 2. Events — `/app/events`

### 2.1 List

| # | Steps | Expected |
| --- | --- | --- |
| E1 | New wedding, open Events | Empty state: "No events yet", **Add your first event**, and shortcuts Mehendi, Haldi, Sangeet, Wedding, Reception. |
| E2 | Tap the **Sangeet** shortcut | Add form opens with "Sangeet" selected and the name filled in. |
| E3 | Add 4–5 events, one of them in the past (e.g. a Roka last month) | **Upcoming** lists future events by date and time; **Past** lists the Roka (most recent first). Times read in India time; the page says "Times are in India (IST), the wedding's time zone." |
| E4 | Add an event that started an hour ago and ends in an hour | Shown under **Upcoming** (still running counts as upcoming). |
| E5 | Each row | Date tile, name, time range, venue (or address), "Dress code: …" when set. Clicking opens the event page. |
| E5a | Keep Events open past the end time of an event (or add one ending in 2 minutes) | Within a minute, or on returning to the tab, it moves from Upcoming to Past without a reload. |

### 2.2 Add / edit form

| # | Steps | Expected |
| --- | --- | --- |
| E6 | **Add event** | Date defaults to the wedding day (or today if the wedding day has passed), start 6:00 PM, end empty. |
| E7 | Pick **Haldi**, then **Mehendi** | Name follows the occasion each time. |
| E8 | Type your own name ("Nani's Haldi"), then pick another occasion | Your name is kept. |
| E9 | **Custom event** | Name stays as typed (or empty); the event saves with type Custom. |
| E10 | Start 8:00 PM, end 1:00 AM, **Ends on** empty | Hint "Ends the next day"; after saving, the event page reads "8:00 PM – 1:00 AM (next day)". |
| E10a | Start 12 Feb 6:00 PM, **Ends on** 14 Feb, end 1:00 AM | Saves; the event page reads "6:00 PM – 14 Feb, 1:00 AM". Reopening Edit shows Ends on 14 Feb. |
| E10b | Edit that event and change its Date to 13 Feb | Ends on moves to 15 Feb by itself (same length). |
| E10c | An event from 6:00 PM to 6:00 PM the next day: edit only its name | Saves (no "End the event after it starts"). |
| E10d | Ends on earlier than Date / Ends on set without an end time | "End on or after the start date" / "Choose the end time". |
| E11 | End time equal to start time | "End the event after it starts" on the end time; nothing is saved. |
| E12 | Leave the name empty / clear the date or start time | Field messages; nothing is saved. |
| E13 | Venue, address, dress code, notes left blank | Saves; the event page shows "Venue not added yet" and no dress code or notes. |
| E14 | Very long text (venue > 200, notes > 2,000 characters) | Field message; nothing is saved. |
| E15 | Phone size | The form is a bottom sheet; **Cancel** and **Save event** stay pinned at the bottom while scrolling. |

### 2.3 Event page — `/app/events/[id]`

| # | Steps | Expected |
| --- | --- | --- |
| E16 | Open an event with everything filled in | Eyebrow (occasion, or "Event" when the name already says it), date ("Friday, 12 February 2027"), time, venue + address, **Open in Google Maps** (new tab, correct search), "Dress code: …", notes with line breaks kept. |
| E17 | **Edit**, change only the dress code, save | "… saved." message; only the dress code changed. **Save event** is disabled until something changes. |
| E18 | **Conflict:** A and B open the same event's edit form; B saves a change; then A saves a different change | A sees "Someone else changed this event" with **Reload event**. Reload shows B's change; A can then make theirs. B's change is never overwritten silently. |
| E18a | A opens the edit form and types; meanwhile B saves a change; A switches to another tab and back | A's typing is still there (the form is not reset). Saving shows the conflict message from E18. |
| E19 | **Archive** → **Keep event** | Nothing happens. |
| E20 | **Archive** → **Archive event** | Back on the list; the event is gone from Upcoming/Past and from the dashboard's Upcoming events and count. |
| E21 | **Show archived events** on the list | "Archived" section with the event and an "Archived" badge. |
| E22 | Open the archived event | "Archived on … It stays linked to its tasks and guests, but can't be changed." No Edit/Archive buttons. Its tasks are still listed. |
| E23 | B archives an event while A has its edit form open; A saves | A sees the "changed" message; after reload the form closes and the page shows it archived. |
| E24 | `/app/events/<random 24-hex id>` and `/app/events/abc` | "We couldn't find this event" with a link back. |

### 2.4 Shortcuts into the add form

| # | Steps | Expected |
| --- | --- | --- |
| E25 | Dashboard → Upcoming events → **Add event** (or the empty state, or the get-started checklist step) | `/app/events` opens with the add form already open; the address bar shows `/app/events` (no `?new=1`). Reloading does not reopen the form. |
| E26 | Phone: **+** → **Add event**, also while already on Events | Form opens each time. |

---

## 3. Tasks — `/app/tasks`

### 3.1 Views and list

| # | Steps | Expected |
| --- | --- | --- |
| T1 | New wedding, open Tasks | "No tasks yet" with **Add a task**. |
| T2 | Add ~6 tasks: assigned to A, to B, unassigned; some linked to events; some with due dates (one in the past); mixed priorities | **All tasks** lists them newest first, with assignee (initials + name), event chip, "Due 15 Jan 2027", status and priority. The past-due one is red with an **Overdue** chip. |
| T3 | **My tasks** as A, then as B | Only tasks assigned to the signed-in person. The "Assigned to" filter is hidden. Address shows `?view=mine`. |
| T4 | **Completed** | Only completed tasks ("Nothing completed yet" when none). The status filter is hidden. |
| T5 | Dashboard → Upcoming tasks → **My tasks** | Opens on the My tasks view, also when Tasks was already open earlier with another view or filter. |
| T5a | Open Tasks and set a filter; then open `/app/tasks?eventId=<an event id>` (or an event page's **All tasks for this event**, shown with 51+ tasks) | The list is filtered to that event. Clicking **Tasks** in the sidebar afterwards shows all tasks again. |
| T6 | Add 21+ tasks | "1–20 of 21", **Next** / **Previous** work. |
| T6a | With exactly 21 tasks, go to page 2 and delete (or tick, under Status = To Do) its only task | The list moves back to page 1 ("1–20 of 20"); never an empty card or "21–20 of 20". |

### 3.2 Filters

| # | Steps | Expected |
| --- | --- | --- |
| T7 | Status = In Progress | Only in-progress tasks. |
| T8 | Event = a specific event; then **General (no event)** | Only that event's tasks; then only tasks with no event. Archived events are offered as "Name (archived)". |
| T9 | Assigned to = B; then **Unassigned** | Only B's tasks; then only unassigned ones. |
| T10 | Two filters at once (e.g. event + High) | Both apply. |
| T11 | Reload the page with filters set; copy the address into another tab | Same view and filters. |
| T12 | Filters that match nothing | "No tasks match these filters" with **Clear filters**. |

### 3.3 Tick, add, edit, delete

| # | Steps | Expected |
| --- | --- | --- |
| T13 | Tick a task | It's struck through and marked done; the Overdue chip disappears; dashboard "Tasks completed" goes up. Tick again → back to To Do. |
| T14 | **Conflict on tick:** B edits a task; A (stale list) ticks it | A sees "Someone else changed that task, so the list was reloaded. Try again." |
| T15 | **Add task** with assignee, event, due date 15 Jan, High | Saves; due shows "15 Jan" (not 14 or 16). |
| T16 | Add with only a title | Saves as Medium, To Do, unassigned, general. |
| T17 | Click a task's title, change only the priority | "… saved."; nothing else changed (the due date in particular). **Save task** disabled until something changes. |
| T18 | Set status to Completed in the form, later edit its title | Stays completed; completion is kept. |
| T19 | **Conflict on edit:** A and B edit the same task, B saves first | A sees "Someone else changed this task" with **Reload task**; A's typing isn't lost before saving, even after switching tabs. Reload shows B's version. |
| T19a | Rename or archive an event, then open Tasks | Tasks linked to it show the new name / "(archived)" straight away. |
| T19b | Block `/api/members` in dev tools (Network → block request URL), open a task | "We couldn't load the wedding's members and events for this form." with **Try again**, not a form showing "Unassigned". |
| T20 | **Delete task** → **Keep it**; then **Delete task** → **Yes, delete** | First does nothing; second removes it with "… deleted." It is gone for B too. |
| T21 | Phone size | View tabs fit in one row; filters in two columns; the form is a bottom sheet. |

### 3.4 Former members and archived events

| # | Steps | Expected |
| --- | --- | --- |
| T22 | Assign a task to B; Admin A removes B (Settings → Wedding Members) | The task stays, showing **Former member** (italic) instead of B's name. |
| T23 | Edit that task | "Assigned to" shows **Former member**; saving other changes keeps it; choosing another person or Unassigned replaces it. |
| T24 | Try to assign a *new* task to the removed member | Not offered in the list (only current members are). |
| T25 | Link a task to an event, then archive the event | Task shows "Event (archived)"; editing it keeps the link unless changed; new tasks can't pick the archived event. |

### 3.5 Tasks on event pages

| # | Steps | Expected |
| --- | --- | --- |
| T26 | Open an event with tasks | "Tasks for this event" lists them (without repeating the event name); tick and edit work in place. |
| T27 | **Add task** on the event page | Tasks page opens with the add form, the event preselected, and the list filtered to that event. |
| T28 | Archived event page | Tasks listed; no **Add task** link. |
| T29 | Phone: **+** → **Add task**; dashboard "Add a task" / checklist step | Add form opens straight away. |

---

## 4. Home page

| # | Steps | Expected |
| --- | --- | --- |
| H1 | Signed out, open `/` | Events, Tasks and Family members show as available (no "Coming soon"); guests, gallery, etc. still say "Coming soon". The FAQ "coming next" answer no longer lists events or tasks. |

---

## 5. Security and API checks

Sign in as Admin C (the other wedding) and use the browser dev tools console, or curl with C's cookie. Take ids from Admin A's wedding (from the address bar on event pages, or the Network tab on Tasks).

| # | Request (as C, with A's ids) | Expected |
| --- | --- | --- |
| S1 | `GET /api/events/<A's event id>` | 404 `NOT_FOUND` |
| S2 | `PATCH /api/events/<A's event id>` `{"name":"x"}` | 404; A's event unchanged |
| S3 | `DELETE /api/events/<A's event id>` | 404; A's event not archived |
| S4 | `GET` / `PATCH` / `DELETE /api/tasks/<A's task id>` | 404; A's task unchanged |
| S5 | `POST /api/tasks` `{"title":"x","eventId":"<A's event id>","assignedMembershipId":"<A's membership id>"}` | 400 with both `eventId` and `assignedMembershipId` messages; nothing created |
| S6 | `POST /api/events` with `"weddingId":"<A's wedding id>"` | 400 (unknown field) |
| S7 | `PATCH /api/tasks/<C's task>` `{"completedAt":"2026-01-01T00:00:00Z"}` | 400 (not allowed) |
| S8 | `GET /api/tasks?mine=yes`, `?status=DONE`, `?limit=101` | 400 |
| S9 | Signed out: `GET /api/events`, `/api/tasks` | 401 |
| S10 | Signed out: open `/app/tasks?view=mine` | Sign-in page; after signing in you land back on My tasks. |

Mutations from the console need the same origin (they're sent from the app's own tab, so this is automatic).

---

## 6. Phase 1 regression (quick)

Sign up, sign in/out, create wedding, Wedding Details save, invite + join + role change + remove, dashboard numbers. The dashboard now counts events and tasks and its Upcoming events/tasks cards link to the new pages.

---

## 7. Decisions to confirm

| # | Decision | Where it shows |
| --- | --- | --- |
| D1 | **Removing a member keeps their tasks assigned to them**, shown as "Former member" (API_DESIGN §35 notes), instead of unassigning them. | T22–T24 |
| D2 | **Archiving an event can't be undone** (no endpoint for it in API_DESIGN). The confirmation says so. | E20 |
| D3 | With **Ends on** empty, an end time earlier than the start means **the next day**; longer events set **Ends on**, which moves with the start date. | E10–E10d |
| D4 | **"All tasks" includes completed ones**; "Completed" is the completed subset. | T2, T4 |
| D5 | The tick toggles **Completed ↔ To Do**; "In Progress" is set in the form. | T13 |
| D6 | New events default to **6:00 PM on the wedding day**. | E6 |
| D7 | **Changing the wedding's time zone** (Settings → Wedding Details) keeps each event's moment in time, so its clock time is shown differently (a 6 PM IST event reads 12:30 PM in London time). Due dates likewise. Please confirm this is acceptable, or whether events should keep their clock time. | Try it once and note what you see |
| D8 | An event page shows up to **50** of its tasks, with a link to the full filtered list beyond that. | T26 |

---

## 8. Known limitations (not bugs)

- **Event cover images** (PRD §9.5) wait for Phase 5 uploads.
- **First page loads in `next dev`** can take several seconds while the page compiles; the API answers in about 200 ms. Judge speed on a production build.
- `docs/CODEBASE_ARCHITECTURE.md` §14 still lists the event and task endpoints as "501 stub" (that file is outside the editable set).

## 9. Reporting

Please use the Phase 1 format: P1/P2/P3 with the check number (e.g. "T19"), steps, expected, actual, and browser/size.
