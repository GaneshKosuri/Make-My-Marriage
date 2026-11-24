# Dev hand-off: Phases 4–6 code review fixes (vendors, expenses, website, livestream, gallery)

**Date:** 24 November 2026 · **Branch:** `dev`

**Reviewed commits:**
- **Phase 4:** `474bb20`, `94781a9`, `eefda84`, `6e7f7a7`, `0178a41`
- **Phase 5:** `2e3f59a`, `ab37a64`, `28f0d96`, `9d0f85f`, `5225530`
- **Phase 6:** `1d4a3ff`, `1de8237`

**Not reviewed:** `febd9a5` (dropdowns), `4ee65e1`, `d1bbcf9` and `dbebafa` are outside the three phases.

**Overall:** no High findings. The server side is solid in all three phases:
- Tenant scoping and cross-wedding 404s.
- Integer paise and safe money parsing.
- `__v` checks.
- Google calls only through the discovery service, with the key never sent to the browser or logged.
- Public website data: no ids, contacts, guests or notes.
- YouTube links: host allow-list, ID regex, `youtube-nocookie` embeds only.
- Cover and photo uploads: server-made keys, type and size pinned in the signed PUT and re-checked with HEAD, ETag-pinned copy.
- Gallery token: never in a DTO or a log.
- QR code built from `NEXT_PUBLIC_APP_URL`.
- Thin routes with `.strict()` schemas.

The findings are mostly client-side state and error handling, plus a few rules the server should enforce.

**Checks on `5225530`:** typecheck and `npm test` pass (962 tests). `npm run lint` fails, but only because it lints the leftover worktree `.claude/worktrees/amazing-bhabha-860dc9` (see X1). The project's own code is lint-clean.

**Definition of done** (CLAUDE.md):
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration` and `npm run build` all pass.
- Every fix comes with a test that fails before the fix.
- Add a change-log row to `docs/PROJECT_STATUS.md`.

---

## Summary

| # | Priority | Area | Problem |
| --- | --- | --- | --- |
| C1 | Medium | All edit forms | After "Reload" on a CONFLICT, that reloaded copy sticks: every later edit of the same record opens stale values and conflicts again |
| G1 | Medium | Photo uploads | Server error messages are dropped; failed photos can't be removed; the guest thank-you never appears |
| G2 | Medium | Photo uploads | "Try again" re-uploads from scratch, so a lost confirm response creates a duplicate photo |
| G3 | Medium | Gallery settings | Turning the gallery off and on again silently re-opens guest uploads; the API allows uploads on while the gallery is off |
| G4 | Medium (decision) | Guest uploads | Per-IP limits (60 per 15 min) will block a whole venue on shared Wi-Fi or mobile CGNAT |
| W1 | Medium | `/w/[slug]` | Unknown and unpublished sites answer HTTP 200, not 404 |
| W2 | Medium | Website screen | Settings never re-sync after a refetch; another member's change can't be seen or undone without a reload |
| V1 | Medium | Vendors | Editing a vendor someone else archived loops on "someone saved a newer copy — Reload" |
| V2 | Low | Vendors → expenses | Renaming or archiving a vendor doesn't refresh expense lists or discovery results |
| V3 | Low | Expenses | With more than 100 vendors, active vendors show as "(archived)" and "Add expense" from a vendor page loses the vendor |
| W3 | Low | Livestream | Toggling "Show on website" wipes a pasted, unsaved link |
| W4 | Low | Cover photo | Saving the same cover twice errors; concurrent saves leave orphaned storage objects |
| G5 | Low | Gallery | Signed image URLs expire after 15 minutes on an open page; every refetch re-downloads all previews |
| G6 | Low | Gallery | The chosen album doesn't follow the address while the route stays mounted |
| CL | Clean-up | Several | Small items listed at the end |
| D1, D2 | Product calls | Vendors, website | Archived Google vendors can't be restored; guessable slugs reveal the guest gallery link |
| X1 | Tooling | Lint | ESLint lints `.claude/worktrees/**` |

---

## C1: The reloaded copy sticks to later edits (Medium, all edit forms)

**Where:**
- `src/features/expenses/components/expense-form-dialog.tsx:69-71`
- `src/features/vendors/components/vendor-form-dialog.tsx:74-75`
- The same pattern, from Phases 2–3: `event-form-dialog.tsx`, `task-form-dialog.tsx`, `guest-form-dialog.tsx:58`

**Problem:**
- `reloaded` (the copy fetched by "Reload" after a CONFLICT) lives in the outer `*FormDialog`. That component stays mounted, because the screens always render it; only the inner form unmounts when `Dialog` is closed.
- Nothing ever clears `reloaded`, so the next time the same record is edited, `current` is the old reloaded copy rather than the fresh `expense`/`vendor`/`guest` prop.
- The form opens with old values and an old `version`, so saving gives CONFLICT again.
- After yet another reload, it can also write old values over newer edits.

**Reproduce:**
1. Open expense X in tab A. Edit and save X in tab B.
2. Save in tab A: CONFLICT. Click **Reload expense**, change something and save (v2).
3. Edit and save X in tab B again (v3).
4. Reopen X in tab A: the form shows the v2 copy, and saving gives CONFLICT again.

**Suggested fix:** clear `reloaded` when the dialog closes and after a successful save. For example, reset it when `open` turns false, using the "previous prop in state" pattern. Do it in all five dialogs, ideally with one small shared hook (`useReloadedCopy`).

**Done when:** a component test per dialog, or one test of the shared hook, shows that reopening after close uses the latest prop.

---

## G1: Upload errors are dropped, and failed photos can't be removed (Medium)

**Where:**
- `src/features/photos/use-upload-queue.ts:97-101`: the catch always sets `problem: null`.
- `src/features/photos/components/upload-queue-list.tsx:104-125`.
- The guest sheet's `allDone`.

**Problem:**
- The server's specific messages never reach the user:
  - "The family has turned off uploads." (`FORBIDDEN`)
  - "This file isn't a JPEG, PNG or WebP photo." (`UPLOAD_ERROR`)
  - closed gallery or archived event (`NOT_FOUND`)
- A failed item with `problem === null` shows only **Try again**, with no **Remove** button. A photo that will always fail can't be explained or removed.
- On the guest sheet, `allDone` needs every item to be `done`, so the thank-you screen never appears.

**Reproduce:**
1. Open `/gallery/<token>` and choose photos.
2. Turn guest uploads off in `/app/photos/qr`, then press **Upload**.
3. Every item shows "Couldn't upload", retries fail forever, and nothing can be removed.

You see the same with a `.txt` file renamed to `.jpg`.

**Suggested fix:**
- For codes that won't succeed on retry (`FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, and `UPLOAD_ERROR` with a message), put `ApiError.message` into `problem` and hide **Try again**.
- Always show **Remove** on failed items.
- Let the guest thank-you count "done or removed".

**Done when:** a hook or component test with a `FORBIDDEN` confirm shows the server message and a working Remove button, and the guest sheet reaches the thank-you once the rest are done.

---

## G2: Retry re-uploads and can duplicate a photo (Medium)

**Where:**
- `src/features/photos/upload.ts:91-121` (`uploadPhoto` keeps nothing between attempts).
- `use-upload-queue.ts:103-109` (`retry`).

**Problem:**
- Every retry asks for a new upload URL, uploads the whole file again and confirms again.
- Suppose the upload and confirm succeeded but the confirm response was lost (timeout, network drop, or a 5xx after the publish committed). The retry then creates a second READY photo and spends quota again.
- The server's confirm is idempotent, as required by the 2026-09-18 notes, but the client never uses that.

**Reproduce:** in DevTools, block the response of the confirm POST (`/api/photos`, or the guest `/photos`) after the server has handled it. Press **Try again**, and the gallery shows the photo twice.

**Suggested fix:**
- Store the issued `objectKey` and `expiresAt`, and a flag for "upload finished", on the `UploadItem`.
- On retry, if the upload finished, repeat only the confirm with the same body.
- Restart from scratch only after `UPLOAD_ERROR`, `NOT_FOUND` or an expired key.

**Done when:** a test where the first confirm rejects with a network error and the retry succeeds shows exactly one upload-URL call, one PUT and two confirm calls with the same `objectKey`.

---

## G3: Gallery off and on re-opens guest uploads (Medium)

**Where:**
- `src/modules/weddings/gallery-settings.service.ts:64`
- `src/modules/weddings/wedding.repository.ts:153-170`
- `src/features/photos/components/gallery-share-screen.tsx:157-161`

**Problem:**
- Turning the gallery off leaves `gallery.guestUploadsEnabled: true` stored.
- While the gallery is off, the UI shows the uploads switch as off (`on && guestUploadsEnabled`). Turning the gallery back on re-opens uploads to anyone with the link, without the family seeing that it will.
- The API also accepts `PATCH /api/gallery/settings {"guestUploadsEnabled":true}` while the gallery is off. That breaks the 2026-11-20 decision ("uploads can only be switched on while the gallery is on"), which only the UI enforces.

**Reproduce:**
1. Gallery on, uploads on.
2. Turn the gallery off.
3. Turn it on again: guests can upload straight away.

**Suggested fix:**
- In `updateSettings`, set `gallery.guestUploadsEnabled: false` whenever `isEnabled` becomes false.
- Refuse `guestUploadsEnabled: true` with a field `VALIDATION_ERROR` when the gallery is (or stays) off.
- Do both in one conditional update, so a concurrent toggle can't slip past.

**Done when:** integration tests cover two cases:
- Off then on leaves uploads off.
- Uploads on while the gallery is off returns 400.

---

## G4: Guest upload limits per IP are too low for a venue (Medium, decide the numbers)

**Where:** `src/server/security/rate-limit.ts`, all marked "placeholder":
- `galleryUploadUrl`: 60 per IP per 15 min
- `galleryPhotoConfirm`: 60 per IP per 15 min
- `publicGalleryView`: 120 per IP per minute

**Problem:**
- The main use is guests at the venue scanning the QR code. On the venue's Wi-Fi or on mobile carrier CGNAT (common in India) they share one IP, so the whole venue gets about 60 photos per 15 minutes.
- The `/gallery/[token]` page render (`page.tsx:57`) and the client's GET of the photo list both spend the same `publicGalleryView` counter.
- The real storage guard is already `guestPhotoUploadPerWedding` (500 a day).

**Reproduce:** about 10 guests on one network each upload 7 photos within 15 minutes. From roughly the 61st photo, everyone gets "That's a lot of photos".

**Suggested fix:**
- Key the per-IP upload and confirm limits on IP plus token and raise them a lot, for example 300 per 15 minutes. Keep the per-wedding daily cap as the real limit.
- Give the page render its own policy.
- Agree the numbers with the product owner and record them in the decision log.

**Done when:** the policies are changed, a unit test covers the new keys, and the decision row is written.

---

## W1: `/w/[slug]` answers 200 for unknown and unpublished sites (Medium)

**Where:** `src/app/(public)/w/[slug]/page.tsx:33-47`.

**Problem:**
- Both `notFound()` calls run inside `<Suspense>`.
- In Next 16, once the fallback streams, the status is already committed as `200 OK`. A later `notFound()` only injects `noindex` (`node_modules/next/dist/docs/01-app/02-guides/streaming.md`, "The HTTP contract").
- The page comment and API §69 promise 404. Link checkers, monitoring and any status-code test see 200, and the "busy" state is 200 too.
- Nothing leaks, because unpublished and unknown sites look the same.

**Reproduce:** `npm run build && npm start`, then `curl -I http://localhost:<port>/w/does-not-exist`. It returns `200`.

**Suggested fix:**
- Settle the status before streaming. For example, move the slug pattern check and a cheap "published slug exists" lookup into the page component, outside `<Suspense>`, wrapped in `connection()` per the Cache Components rules. Alternatively, rewrite to a 404 in `src/proxy.ts`.
- If you decide to accept 200 with noindex instead, change the comment and record the decision.

**Done when:** a Playwright check on the built app gets 404 for an unknown slug and an unpublished wedding, and 200 for a published one.

---

## W2: Website settings never re-sync (Medium)

**Where:** `src/features/website/components/website-screen.tsx:89-90`. `saved` and `form` are seeded once with `useState`.

**Problem:**
- The query refetches on focus or after another member saves, and `/app/website` stays mounted under `<Activity>`. The theme picker, welcome message and "Show the gallery" switch still keep their old values.
- The dirty check compares against the stale `saved`. If another member changed the theme to MODERN, clicking CLASSIC (shown as already selected) changes nothing and can't be saved without a reload.

**Reproduce:**
1. Open `/app/website` in tab A.
2. In tab B, change the theme to MODERN and save.
3. Focus tab A: CLASSIC is still selected, and choosing it can't be saved.

**Suggested fix:** when the server copy changes and the form isn't dirty, reset `saved` and `form` from it. Keep the user's typing while it is dirty, the same rule as Phase 2 R4. The simplest way is to key `WebsiteSettings` on the server values when not dirty, or use a "previous settings" check during render.

**Done when:** a component test refetches new settings into a clean form and sees the new values, and a dirty form keeps the typed text.

---

## V1: Editing a vendor someone else archived loops on CONFLICT (Medium)

**Where:**
- `src/modules/vendors/vendor.service.ts:34-38` (`updateRefused` returns `CONFLICT` with the "archived" message).
- `src/components/ui/save-problem.tsx:53` (shows the generic conflict text and **Reload**).
- `src/features/vendors/components/vendor-form-dialog.tsx`.

**Problem:**
- The server says "This vendor is archived…", but the banner says someone saved a newer copy.
- **Reload** fetches the now-archived vendor and opens it as editable. On `/app/vendors` with "Show archived" off, every save gives CONFLICT again, forever.
- The vendor detail page happens to recover.

**Reproduce:**
1. Member A opens **Edit** on vendor V at `/app/vendors`.
2. Member B archives V.
3. A saves: CONFLICT. A clicks **Reload** and saves: CONFLICT again, forever.

**Suggested fix:** pick one:
- When the reloaded copy has `archivedAt`, show the "gone" banner and disable the form.
- Or mark the archived case on the wire (`details.reason: "ARCHIVED"`) and show its message instead of **Reload**.

**Done when:** a component test with a reloaded archived vendor shows the archived message and no save button.

---

## V2: Vendor changes don't refresh expenses or discovery (Low)

**Where:** `src/features/vendors/api.ts:52-56` (`useInvalidateVendors`).

**Problem:**
- Expenses embed the vendor's name and `archivedAt`.
- Renaming or archiving a vendor doesn't invalidate `expensesKeys`. Because `/app/expenses` stays mounted, going back shows the old name and no "(archived)" tag for up to 30 seconds.
- Cached discovery results keep `myVendor.archived: false` for up to 30 minutes.

**Suggested fix:**
- Also invalidate `expensesKeys.all` on vendor update and archive.
- On archive, patch the discovery cache with `setQueriesData`, the way `useAddVendorFromPlace` does.

**Done when:** a test shows that a vendor rename invalidates the expenses queries.

---

## V3: More than 100 vendors breaks labels and the preset (Low)

**Where:**
- `src/features/expenses/components/expense-form-dialog.tsx:44,66,147,187-193`
- `expenses-screen.tsx:35,251`

**Problem:**
- The vendor dropdown loads only page 1 (100 vendors by name).
- An expense linked to vendor number 101 or later is labelled "(archived)", because the code treats a vendor missing from the list as archived.
- **Add expense** from that vendor's page loses the preset vendor and category.

**Reproduce:**
1. Create 101 active vendors.
2. Open "Zz…"'s page and click **Add expense**: no vendor is preselected.
3. Edit an existing expense for that vendor: the option reads "Zz… (archived)".

**Suggested fix:**
- Decide "(archived)" from `expense.vendor.archivedAt`.
- When the preset vendor isn't in the list, seed it from `useVendor(presetVendorId)`.
- Later, a searchable vendor picker.

**Done when:** a component test with a vendor missing from the options keeps its preset and shows no "(archived)" tag.

---

## W3: Livestream toggle wipes an unsaved link (Low)

**Where:** `src/features/livestream/components/livestream-screen.tsx:94-96, 159-163`.

**Problem:** every successful save runs `setLink(saved.youtubeUrl ?? "")`, including the "Show on website" switch. A link pasted but not yet saved is replaced by the stored one.

**Suggested fix:** reset `link` only after a link save or a removal, not after a switch toggle.

**Done when:** a component test pastes a link, toggles the switch and keeps the pasted text.

---

## W4: Cover save isn't idempotent or atomic (Low)

**Where:**
- `src/modules/weddings/website.service.ts:93-109`
- `src/modules/weddings/cover.ts:80-82`

**Problem:**
- `publishCover` deletes the staging object after copying it. A retried PATCH with the same `coverImageObjectKey` (a lost response, or a second tab) gets `UPLOAD_ERROR` "We couldn't find the uploaded photo", although the cover was saved.
- Two concurrent saves both read the same previous cover, so one new final object is never referenced or deleted.
- A failed `setCover` after the copy also leaves an orphan.

This costs storage only; no live cover is ever deleted.

**Suggested fix:**
- If the wedding already holds the cover produced from this staged key, return success. To make that check possible, record the source key, or derive the final key from the staging key.
- Make `setCover` conditional on the expected previous key, and delete the new final object when it loses.

**Done when:** integration tests cover two cases:
- The same PATCH twice succeeds both times.
- Two parallel saves leave exactly one cover object.

---

## G5: Signed image URLs expire on an open page (Low)

**Where:**
- `src/features/photos/api.ts:20,44,138` (`PHOTO_LIST_STALE_MS`)
- `photo-grid.tsx:45`
- `photo-viewer.tsx:99`

**Problem:**
- Read URLs live for 15 minutes, and nothing refetches before they expire. Focus refetch only runs when the user switches back to the tab.
- On a page kept open and in use for more than 15 minutes, lazy tiles that scroll into view and originals opened in the viewer return 403, and there is no `onError` recovery.
- The reverse cost: every invalidation (each delete, each closed upload dialog) re-signs every loaded page. The new query strings make the browser download every preview again.

**Suggested fix:**
- Add a `refetchInterval` of about 12 minutes, only while the page is visible, or refetch on image error.
- Remove deleted photos with `setQueryData` instead of invalidating.
- Optionally, sign URLs for fixed time buckets so they stay the same between refetches.

**Done when:** a hook test checks the refetch interval and that a delete doesn't refetch the list.

---

## G6: The album doesn't follow the address (Low)

**Where:** `src/features/photos/components/gallery-screen.tsx:64-84`.

**Problem:** `album` is read from `searchParams` only once. The `lastSearch` block handles only `?new=1`. Because the route stays mounted, the nav link to `/app/photos` keeps showing the last album, and an `?album=<id>` link doesn't switch to that album.

**Reproduce:**
1. Pick the "Mehendi" chip.
2. Go to Events.
3. Click **Gallery** in the nav: Mehendi is still shown at `/app/photos`.

**Suggested fix:** in the `lastSearch` branch, also call `setAlbum(readAlbum(searchParams))`.

**Done when:** a component test changes the search params on the mounted screen and the album follows.

---

## CL: Clean-ups (do with the related fix)

- **`gallery-screen.tsx:347`:** `remove.isError` lingers into the next delete dialog. Call `remove.reset()` when the dialog opens.
- **`guest-gallery-screen.tsx:47-48`:** guests' events exclude archived ones, so photos of an archived event are labelled "Wedding Memories".
- **`gallery-share-screen.tsx:128-133`:** `URL.revokeObjectURL` runs straight after `click()`, which can cancel the QR SVG download in Safari and Firefox. Revoke in a `setTimeout`.
- **`website-screen.tsx:115, 138-141`:**
  - Cover upload errors collapse to a generic "Try again". Show `ApiError.message` for `UPLOAD_ERROR` and `RATE_LIMITED`.
  - Send remove-cover errors to `coverProblem`, not the save bar.
- **`src/app/api/vendors/from-place/route.ts:14`:** the `vendorDiscoveryPlace` limit is spent before the duplicate and event checks. Enforce it in the service just before `getPlaceDetails`, or note that it is accepted.

---

## Product decisions (record in `docs/PROJECT_STATUS.md`)

- **D1: archived Google vendors can't be restored.** `from-place` refuses a place already saved, archived ones included, and PATCH refuses archived vendors. Once archived, a place from Discover can only come back as a hand-typed duplicate with no place link. Options:
  - an unarchive action;
  - letting `from-place` restore the archived record;
  - keeping it as is, on purpose.
- **D2: guessable slugs reveal the gallery link.** Slugs are `groom-bride-DDMMYYYY` (or `wedding-DDMMYYYY`). A published site with "Show the gallery" on carries the gallery link, which can accept guest uploads. This follows the 2026-11-24 decision, but confirm it's acceptable. If not, add a random suffix to new slugs.

---

## X1: Lint picks up the leftover worktree (tooling)

`npm run lint` reports 1,391 errors, all in `.claude/worktrees/amazing-bhabha-860dc9`, a leftover git worktree. `npx eslint . --ignore-pattern ".claude/**"` passes.

Fix:
- Add `.claude/**` to the ignores in `eslint.config.*`.
- If you no longer need the worktree, remove it with `git worktree remove`.

---

## Not in scope

- EXIF data kept in original photos: an explicit 2026-11-20 decision.
- Orphaned PENDING photo rows when signing fails: already covered by the "abandoned uploads" open item.
- The vendor expenses card total only when all expenses fit in one 100-item response: documented.
