# Homepage Hero Media (admin-controlled images/video)

Replaces the previously hardcoded homepage hero background
(`/assets/images/hubimage.jpg`, referenced directly in the frontend's
`HeroSection.tsx`) with an admin-managed system: multiple images and/or
videos, ordering, active/inactive state, a single default, and a public
API feeding an accessible, responsive carousel - with the static image
kept forever as the fallback, never removed.

## Architecture

```
Admin -> POST /api/admin/hero-media (multipart upload)
      -> multer (declared-Content-Type allowlist, 100MB cap)
      -> content-sniffing (file-type, real magic bytes - see below)
      -> Cloudinary upload
      -> HeroMedia row (Postgres)

Public -> GET /api/hero-media (active rows, default item first, then displayOrder)
       -> useHeroMedia (15s poll, mirrors useHeroMembers)
       -> HeroBackgroundMediaLayers / HeroBackgroundDots (HeroSection.tsx)
       -> falls back to the static image if empty or the fetch fails
```

## Why a new model, not an extension

Two existing models looked plausible and were ruled out by direct
inspection (independently re-confirmed by a Plan-agent review before any
code was written):

- **`HubIntroVideo`** is a deliberate, app-layer-enforced **singleton**
  (advisory-lock-guarded in its controller) powering a completely
  different, unrelated landing-page section
  (`pages/landing/HubIntroVideo.tsx`) - structurally wrong for a
  multi-row, ordered list.
- **`HeroFeaturedMember`** is a pivot table for the existing *team-member*
  photo carousel (the small card on the right of the hero) - it owns no
  media of its own, just a `memberId` FK + `order`, and always joins live
  to `Member` for the actual image. Repurposing it would mean bolting
  unrelated `type`/`cloudinaryPublicId`/`isDefault` columns onto a table
  whose whole design point is *not* owning media.

`HeroMedia` (table `hero_media`) is the new, dedicated entity: `id`,
`type` (`IMAGE`|`VIDEO`), `url`, `cloudinaryPublicId`, `thumbnailUrl`,
`title`/`altText`/`caption`, `isActive`, `isDefault`, `displayOrder`,
`uploadedBy`.

## RBAC

`protectRoute, restrictTo('Admin')` on every `/api/admin/hero-media/*`
route (upload, metadata edit, activate/deactivate, set default, reorder,
delete). `GET /api/hero-media` is public/unauthenticated - active rows
only, a narrow projection (see below).

## Real content-type validation

Every existing upload route in this codebase (`resource.routes.ts`,
`hubVideo.routes.ts`) only checks the client-declared multipart
`Content-Type` - trivially spoofable. This feature goes one step further:
after multer's first-pass declared-type filter, the controller sniffs the
**actual uploaded file's magic bytes** via the `file-type` package and
derives `type` (`IMAGE`/`VIDEO`) from that result, never from the
declared MIME or filename extension. A file that doesn't match a real,
allowed signature is rejected outright, regardless of what Content-Type
the request claimed.

`file-type` v17+ is ESM-only in this otherwise CommonJS project, so it's
loaded via a dynamic `await import('file-type')` inside the controller
(confirmed working at real runtime via a direct `ts-node` smoke test).
**Jest's own module runtime cannot execute that dynamic import** (a
known Jest+ESM limitation, not a bug in the controller) - the test suite
mocks `file-type` as the external boundary it is, the same way it already
mocks `cloudinary.utils`.

Limits: images (JPEG/PNG/WEBP) up to 10MB; video (MP4/WEBM/MOV) up to
100MB, matching `hubVideo.routes.ts`'s existing video limit for
consistency (an admin uploading a `.mov` file to the Hub Video page and
having the exact same file rejected here would be a pointless,
unexplained inconsistency).

## What `isDefault` actually does

The public carousel renders *every* active item, not just the default
one, so `isDefault` needs a real runtime effect or it's dead weight:

1. It's the slide shown first on initial page load.
2. It's the *only* slide shown to visitors with `prefers-reduced-motion`
   set (no automatic advancing is ever shown to them regardless).

Rather than exposing an `isDefault` field publicly (an internal
management concept, not something the carousel visibly labels), the
public endpoint simply **sorts the default row first**
(`ORDER BY isDefault DESC, displayOrder ASC`) - array position alone
carries the information the frontend needs, the same way `displayOrder`
itself is never exposed as a raw field either.

Setting a new default unsets the previous one inside a single
`sequelize.transaction` (never a window with zero or two defaults).
Deleting the current default does **not** auto-promote another row - the
public endpoint's own fallback (next item in order, or the static image
if none remain) already covers it, and auto-promotion would be a
surprising side effect of an unrelated delete.

## Public projection

`GET /api/hero-media` returns only what the carousel renders: `id`,
`type`, `url`, `thumbnailUrl`, `altText`. Never `cloudinaryPublicId` or
`uploadedBy` (public-boundary concern). `title`/`caption`/`displayOrder`
are also dropped - nothing in the homepage renders a per-media title or
caption over the hero (the headline text is deliberately independent of
whichever background media happens to be showing), so shipping them
publicly would be exposure with no consumer. The admin list endpoint
returns the full row, including `cloudinaryPublicId` - admin, unlike
public, is allowed internal fields for Cloudinary-dashboard
cross-reference, matching `getHubVideoAdmin`'s own existing precedent.

## Frontend rendering (`HeroSection.tsx` / `HeroBackgroundMedia.tsx`)

Only the background media *source* layer changed - the rest of the hero
(rotating headline, Join Us CTA, the team-member carousel, navigation)
is untouched. Split into a hook (`useHeroBackgroundCarousel`) plus two
presentational pieces because of where each has to live in the existing
DOM: the media layers stay exactly where the old `<img>` was (before the
two gradient overlay divs, so the overlay still tints the photo/video for
text contrast), but the dot controls are real interactive elements that
have to render visually and hit-test *above* those same overlay divs -
solved by rendering the dots as a later DOM sibling of the whole
background wrapper rather than fighting z-index across stacking contexts
the overlays didn't previously need to care about.

- Empty list or a failed fetch -> the same static
  `/assets/images/hubimage.jpg` as before. This stays hardcoded forever;
  it is **not** seeded into the database.
- `prefers-reduced-motion`: no automatic advancing, ever; manual dot
  navigation still works (WCAG 2.2.2 is about not forcing automatically
  moving content on someone who opted out, not about removing
  user-initiated navigation).
- Otherwise: auto-advances every 6s, pauses on hover and on
  `document.hidden`.
- Only the current slide and the next one are actually mounted (video
  elements especially) - loading the homepage never fetches every
  configured video's stream at once.
- An individual image/video load error removes just that item from the
  active set; if every item ends up failing, the static fallback renders.

## Cache invalidation

15s polling (`useHeroMedia`, mirroring the existing `useHeroMembers`
pattern exactly - pauses while the tab is hidden) rather than any new
real-time infrastructure. An admin's changes reach the public homepage
within that window without a manual refresh.

## Required environment variables

None beyond what Cloudinary already needs (`CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) - already configured for
every other media feature in this app.

## Deliberate v1 scope trims

1. No drag-and-drop reordering - up/down buttons only (no existing
   pattern/dependency anywhere in this frontend for it).
2. No pixel-matched admin preview surface - the admin checks the real
   homepage.
3. File *replace* on an existing item is out of scope - metadata-only
   PATCH; replacing the underlying file is delete + re-upload.
4. No Socket.IO/real-time push - 15s polling reuses the existing pattern.
5. The reorder endpoint has the same unguarded-concurrent-request
   exposure `HeroFeaturedMember`'s own reorder already accepts in
   production (two overlapping reorder submissions could interleave) -
   wrapping the updates in one transaction (an improvement over the
   copied pattern) closes the within-request half of that.

## Tests

- `__tests__/admin.heroMedia.test.ts` - RBAC (401/403 on every mutation),
  upload validation (declared-type rejection, content-sniffing rejection
  of a spoofed file, 10MB image / 100MB overall limits), successful image
  and video uploads (type/thumbnailUrl/displayOrder derivation),
  metadata PATCH, activate/deactivate, default-flip transaction (unsets
  the old default, sets the new one), reorder (exact-set validation),
  delete (Cloudinary best-effort cleanup, row always removed).
- `__tests__/heroMedia.public.test.ts` - active-only, default-first
  ordering, exact public projection (nothing internal leaks).
- Frontend `HeroBackgroundMedia.test.tsx` - empty/error fallback to the
  static image, single-item rendering (image alt text, video
  autoplay/muted/loop/playsInline + poster), dot controls for 2+ items,
  auto-advance timing, reduced-motion disabling auto-advance while
  keeping manual navigation.
- `HeroSection.test.tsx` - updated to mock the new `useHeroMedia` hook
  (it previously had nothing to mock here, and would otherwise have
  started making real network calls during this file's existing,
  unrelated tests) and still passes unmodified otherwise, confirming the
  rest of the hero composition is intact.
- Full existing suites (backend and frontend) re-run for regression.

## How to run/test locally

```bash
# Backend
cd npc-innovation-hub-bn
npm install
npx tsc --noEmit
npx eslint src/models/heroMedia.model.ts src/controllers/heroMedia.controller.ts src/controllers/admin/heroMedia.controller.ts src/routes/heroMedia.routes.ts src/routes/admin/heroMedia.routes.ts src/validations/heroMedia.validation.ts

docker run -d --name npc-hero-media-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=npc_test -p 5443:5432 postgres:14-alpine
NODE_ENV=test DB_HOST=localhost DB_PORT=5443 DB_NAME=npc_test DB_USER=postgres DB_PASSWORD=postgres npx jest heroMedia

# Frontend
cd npc-innovation-hub
npm install
npx eslint src/pages/landing/HeroBackgroundMedia.tsx src/pages/landing/HeroSection.tsx src/components/admin-components/HeroMediaManagement.tsx
npx jest src/pages/landing/HeroBackgroundMedia.test.tsx src/pages/landing/HeroSection.test.tsx
npm run build
```

Manual: log in as Admin, visit `/Admin-hero-media`, upload an image and a
video, reorder, set default, deactivate one - confirm the public homepage
reflects each change within ~15s without a manual refresh. Confirm a
Member token gets 403 on every admin mutation via direct API request, not
just a hidden frontend route.
