# Dev hand-off — Phase 2 code review fixes (events and tasks)

**Date:** 4 November 2026 · **Branch:** `dev` · **Reviewed commits:** `25b2f4d` (events API), `fb9192f` (events screens), `60d2fb1` (tasks API), `d513e0f` (tasks screen)
**Scope:** `480697c..d513e0f`. The server side (events and tasks modules, routes, tenant scoping, `__v` conflict checks, references to removed members and archived events) had no findings. Everything below is in the client screens and forms.

Fix R1–R7 in this round. R8 and R9 are clean-ups to do at the start of Phase 3, before guests copies the same patterns.

**Definition of done** (CLAUDE.md): `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration` and `npm run build` all pass. Every fix comes with a component or unit test that fails before the fix. Add a change-log row to `docs/PROJECT_STATUS.md`.

---

## Summary

| # | Priority | Area | Problem |
| --- | --- | --- | --- |
| R1 | High | Tasks screen | Links into `/app/tasks` with a view or filters are ignored once the screen has been visited |
| R2 | High | Tasks screen | Emptying the last page shows an empty card and "21–20 of 20" |
| R3 | High | Event form | Events longer than a day can't be edited correctly |
| R4 | Medium | Event and task forms | A background refetch resets an open edit form and loses typing |
| R5 | Medium | Events client API | Renaming or archiving an event leaves task lists stale |
| R6 | Medium | Task form | If members or events fail to load, the form shows the wrong assignee or event |
| R7 | Low | Events screen | The Upcoming / Past split never moves without a reload |
| R8 | Clean-up (Phase 3) | Events, tasks | Form banners, skeletons and button styles copied across files |
| R9 | Clean-up (Phase 3) | Events, tasks | Shared Dialog and date helpers live inside other features |

---

## R1 — Task links ignored after the first visit (High)

**Where:** `src/features/tasks/components/tasks-screen.tsx:101`. Also the `?new=1` effect just below it, and `src/app/(dashboard)/app/tasks/page.tsx`.

**Problem:** `TasksScreen` copies `initialView` and `initialFilters` into `useState` once. Dashboard routes stay mounted (Next 16 keeps them under `<Activity>`), and a navigation to the same route with different search params reuses the same instance, so new props are ignored. Only `startAdding` is re-read. The `?new=1` effect then calls `router.replace(urlFor(initialView, initialFilters))`, so the URL shows the link's filters while the list shows the old ones.

**Reproduce:**
1. Open `/app/tasks` (All).
2. Open an event and click **All tasks for this event** (`/app/tasks?eventId=…`). The list still shows all tasks with no event filter.
3. Same with the dashboard's **My tasks** link (`/app/tasks?mine=true`).

**Suggested fix:** when the URL-derived props change, reset `view`, `filters` and `page` from them. Use the same "previous props in state" pattern the file already uses for `startAdding`, comparing a stable key such as `urlFor(initialView, initialFilters)`. Make the `?new=1` effect write the URL from the current state, not the initial props.

**Done when:** a test renders `TasksScreen`, re-renders it with `initialFilters={{ eventId }}` and `initialView="mine"`, and the request and the selected view follow the new props.

---

## R2 — Empty last page after delete or complete (High)

**Where:** `src/features/tasks/components/tasks-screen.tsx:402` (`TaskList`).

**Problem:** when the current page loses its last item (deleted, ticked done in a To Do filter, reopened in Completed), the refetch returns `total > 0` with no items. `TaskList` then renders an empty card with a backwards count ("21–20 of 20"), and only **Previous** gets you out.

**Reproduce:** with 21 tasks, go to page 2 (one task) and delete it, or filter Status = To Do and tick the only task on page 2.

**Suggested fix:** in `TasksScreen`, when `tasks.data.pagination.page > totalPages` and `totalPages > 0`, set `page` to `totalPages` (adjust during render or in an effect). Never render the count when `tasks.length === 0`.

**Done when:** a test where page 2 comes back empty with `total: 20` requests page 1 and shows "1–20 of 20".

---

## R3 — Events longer than a day (High)

**Where:** `src/features/events/event-form.ts:99` (`eventToForm`) and `formInstants`.

**Problem:** the form keeps only the end *time*. It puts the end on the start day, or on the next day when the end time is earlier than the start. The API accepts any end after the start, and `eventSchedule` already displays multi-day events ("8:00 PM – 14 Feb, 1:00 AM").
- An event from 12 Feb 18:00 to 14 Feb 01:00, edited to change only its date, is silently cut to 13 Feb 01:00.
- An event ending exactly 24 hours after it starts loads with end time = start time, so the form refuses to save *any* edit, even a name change ("End the event after it starts").

**Suggested fix (pick one):**
- **Preferred:** add an optional **End date** to the form, filled from the stored end, and build `endsAt` from end date + end time. Keep the "next day" shortcut when the end date is left as the start date and the end time is earlier.
- **Smaller:** when only the date or start time changes, keep the stored duration (`endsAt − startsAt`) instead of recomputing the end from the time of day. Allow end time = start time when the stored end is a later day.

**Done when:** unit tests in `event-form.test.ts` cover (a) a 2-day event whose date moves by one day keeps its duration, (b) a 24-hour event can be renamed, and (c) the existing next-day case (8 PM–1 AM) is unchanged.

---

## R4 — Open edit form reset by a background refetch (Medium)

**Where:** `src/features/tasks/components/task-form-dialog.tsx:79` and `src/features/events/components/event-form-dialog.tsx:79`. Also the "form follows the latest copy" lookups in `tasks-screen.tsx` and `event-tasks.tsx`.

**Problem:** the forms are keyed by `id:version`, and the screens pass the latest cached copy of the task or event. Any refetch that brings a newer version remounts the form and silently drops what the user typed, instead of showing the CONFLICT banner when they save. That includes a window-focus refetch after another member's change.

**Reproduce:**
1. Manager B opens a task's edit form and starts typing a description.
2. Admin A ticks the same task done in another browser.
3. Manager B switches tabs and back. The form resets and the typing is gone.

**Suggested fix:** key the form by `id` only, and keep the version that was current when the dialog opened. The save then sends that version and gets CONFLICT, the existing banner shows, and its **Reload** button remounts the form with the new copy (for example by bumping a local `reloadCount` that is part of the key). Apply the same change to events and tasks.

**Done when:** a component test opens the edit form, types, re-renders with a newer `version`, and the typed text is still there. Saving shows the conflict banner, and **Reload** loads the new values.

---

## R5 — Event changes don't refresh tasks (Medium)

**Where:** `src/features/events/api.ts:62` (`useInvalidateEvents`, used by create, update and archive).

**Problem:** task DTOs embed the event's `name` and `archivedAt`, but event mutations invalidate only events and dashboard queries. For up to 30 seconds (`staleTime`) after renaming or archiving an event, task lists show the old name with no "(archived)" label. The task form also has no option for the now-archived event, so its select shows "No event" for a task that still has one.

**Suggested fix:** also invalidate `tasksKeys.all` in `useInvalidateEvents`.

**Done when:** a hook or component test shows that archiving an event refetches an open task list.

---

## R6 — Task form opens with empty selects when lists fail (Medium)

**Where:** `src/features/tasks/components/task-form-dialog.tsx:73`.

**Problem:** `ready = !members.isPending && !events.isPending` is also true when a query has *failed*. The form then renders with no members or events in the selects, so an assigned task shows "Unassigned" (and its event shows "No event") with no error.

**Suggested fix:** if either query is in error, show a short error with a **Try again** button (refetch both) instead of the form.

**Done when:** a test where `GET /api/members` returns 500 shows the error and retry, not the form.

---

## R7 — Upcoming / Past frozen at request time (Low)

**Where:** `src/features/events/components/events-screen.tsx:37` (`now` prop from the server page).

**Problem:** `now` is taken when the server rendered the page, and the screen stays mounted, so an event that ends during the session stays under **Upcoming** until a full reload.

**Suggested fix:** keep the server value for the first render (no hydration mismatch), then update it on the client, for example once a minute and when the window regains focus.

**Done when:** a test with fake timers moves an ended event from Upcoming to Past without remounting.

---

## R8 — Duplicated form pieces (clean-up, start of Phase 3)

**Where:** `SaveProblem` in `event-form-dialog.tsx:261` and `task-form-dialog.tsx`; `ListSkeleton` in the events and tasks screens; the `secondaryButton` class string in `event-detail-screen.tsx`, `event-form-dialog.tsx`, `events-screen.tsx`, `task-form-dialog.tsx` and `tasks-screen.tsx`.

**Suggested fix:** move `secondaryButton` (and `dangerButton`) next to `primaryButton` in `dashboard-card.tsx`, or into a shared button module. Make one `SaveProblem` that takes the copy as props, and one list skeleton. Guests, expenses and vendors will need all of them.

---

## R9 — Shared UI living inside other features (clean-up, start of Phase 3)

**Where:** events and tasks import `Dialog` from `src/features/members/components/dialog.tsx`, and `isOverdue`, `eventTimeRange`, `formatShortDate` and `taskDueDay` from `src/features/dashboard/format.ts`.

**Suggested fix:** move `Dialog` (and its test) to `src/components/`, and the date and time formatters to `src/lib/` (or `src/features/shared/`). Update the imports. No behaviour change.

---

## Not in scope

- The PRD warning before archiving an event that guests were invited to (PRD §14) belongs to Phase 3, when invitations exist.
- These four commits are not pushed yet, and `qa-handoff-phase-2.md` and `.claude/` are untracked. Decide whether `qa-handoff-phase-2.md` should be committed alongside this file.
