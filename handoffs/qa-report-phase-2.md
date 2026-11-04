# QA report: Phase 2 (events and tasks)

**Tested:** 4 November 2026 · **Build:** `dev` at `3f61c3b` (code-review fixes R1–R7) · **Plan:** `handoffs/qa-handoff-phase-2.md`

## Result

**Ready for Phase 3, with one P3 polish item.** 257 checks run (API, browser and regression): 256 pass and 1 fails (P3).
No P1 or P2 issues. No cross-wedding leaks. Every R1–R7 fix was verified in the browser.

| Area | Checks | Result |
|---|---|---|
| Events API (create, list, get, update, conflicts, archive) | 41 | all pass |
| Tasks API (create, views, filters, pagination, tick, conflicts, delete, former member) | 41 | all pass |
| Security S1–S10 + CSRF | 26 | all pass |
| Events UI E1–E26 (incl. new E5a, E10a–d, E18a) | 34 | 1 fail (P3-1) |
| Tasks UI T1–T29 (incl. new T5a, T6a, T19a, T19b) | 33 | all pass |
| Phone (E15, E26, T21, T29) | 5 | all pass |
| Home page H1 | 1 | pass |
| Phase 1 regression (API 64 + UI) | 65 | all pass |

## Environment

- **Database:** local `db:dev` replica set, database `make-my-marriage-dev`, emails printed to the `next dev` console.
- **Setup override:** `.env.local` was not changed. `MONGODB_URI` and an empty `RESEND_API_KEY` were set only in the test server's process.
- **Browsers:** headless Chromium (Playwright 1.64) at 1280×860 desktop, plus a Pixel 7 phone profile. Times use the IST browser time zone.
- **Two users at once:** the "B saves first" conflict checks (E18, E18a, E23, T14, T19) used a second, independent signed-in session through the API as the other person.
- **Accounts:** Admin A (wedding 12 Feb 2027, India), Manager B (joined through the UI join page), Admin C (a separate wedding). Removed member: B (T22–T24).

---

## Findings

### P3-1 · E5: list rows don't say when an event ends the next day
- **Check:** E5 (row content), related to E10/E10a.
- **Steps:**
  1. Add an event from 8:00 PM to 1:00 AM.
  2. Add a second event from 6:00 PM to 6:00 PM the next day.
  3. Open `/app/events`.
- **Expected:** the rows say the event ends the next day, as the event page does ("8:00 PM – 1:00 AM (next day)").
- **Actual:**
  - The overnight row reads **"8:00 PM – 1:00 AM"**.
  - The 24-hour row reads **"6:00 PM – 6:00 PM"**, which looks like a zero-length event.
  - The event pages are correct ("(next day)", "6:00 PM – 14 Feb, 1:00 AM").
- **Browser/size:** Chromium, desktop 1280×860 (same component on phones).
- **Suggested fix:** use the event page's time-range formatter for list rows too.

---

## Notes (not bugs)

- **`.env.local` doesn't match §1 step 2.** `MONGODB_URI` points at Atlas with the database name **`test`**, not the local `db:dev` database. The `npm run dev` running before testing was writing to Atlas `test`. The plan's note about an Atlas `make-my-marriage-dev` database with `preview@example.test` doesn't match the URI either. Worth aligning before the next round.
- **Malformed ids return 400.** `GET/PATCH/DELETE /api/events/abc` and `/api/tasks/abc` answer `400 VALIDATION_ERROR` (`params.eventId: Invalid id`), not 404. That's consistent with the members endpoints, and the event page shows "We couldn't find this event" either way (E24).
- **`PATCH` without `version` is accepted** (the service still checks atomically between its read and write). So an API client that leaves `version` out gets last-write-wins. The UI always sends it.
- **Header refresh after Wedding Details save** takes a second or two (it re-fetches). Fine.
- **Task filter labels:** each filter `<select>` is wrapped in its `<label>`, so its accessible name includes the selected value ("Status Any status"). Optional polish: label it with `htmlFor`/`id` instead.
- **Phase 1 hand-off item fixed:** after sign-in, users now return to the page they asked for (S10: `/app/tasks?view=mine` → sign in → My tasks).
- **First loads in `next dev`** take 1–4 s while pages compile (the API answers in about 200 ms), as the plan says.

## Decisions (§7): what we saw

| # | Observed |
|---|---|
| D1 | Works as described: the removed member's tasks stay assigned and show **Former member** (italic). The assignee is kept on other edits, can be replaced, and isn't offered for new tasks (T22–T24). |
| D2 | Archiving is final. The confirmation says "This can't be undone yet." Editing an archived event is refused (`409 "This event is archived…"`). Archiving twice is harmless. |
| D3 | An end before the start means the next day. With **Ends on** (R3), multi-day events also work, and Ends on moves with the start date (E10a–E10d). The API allows longer events. |
| D4 | "All tasks" includes completed tasks (struck through); "Completed" is the subset. |
| D5 | The tick toggles Completed ↔ To Do; In Progress is set in the form. |
| D6 | New events default to 6:00 PM on the wedding day (E6). |
| D7 | **Needs your decision.** After switching the wedding to London time, the 6:00 PM IST Sangeet reads **12:30 PM**: events keep their moment in time, not their clock time. Fine for a wedding that really moves time zones. Surprising if someone just corrects a wrong time zone after adding events. |
| D8 | Not tested (needs 51+ tasks on one event). |

## Not covered

- **D8:** the 50-task cap and the "All tasks for this event" link on event pages. T5a was covered through the direct `?eventId=` link instead.
- **T3 as Manager B in the browser.** It was covered through the API (`mine=true` returns only the Manager's tasks).
- **Real second browser windows for conflicts:** a second signed-in API session stood in for "B".

## Clean-up

- **Local database:** all test data (9 users, 4 weddings, 13 events, 7 tasks, plus sessions, memberships and invitations) was deleted from `make-my-marriage-dev`, which is back to empty. Rate-limit counters expire on their own.
- **Atlas `test`:** one probe user, created while checking which database the running server used, was deleted.
- **Your servers:** your `next dev` (PID 32144) was stopped for the test, as agreed, and needs restarting. Your `db:dev` was left running.
