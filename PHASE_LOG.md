# Phase Log

---

## Phase 1 — Server Scaffold + Authentication

**Date:** 2026-11-19

### What was built
- Complete Express server scaffold with ES-module layout
- MongoDB connection via Mongoose (`src/config/db.js`)
- All three Mongoose models with `toJSON` transforms, indexes, and timestamps (`src/models/index.js`)
- Three middleware: `protect` (JWT auth), multer `upload` (jpg/png/webp ≤ 3 MB to `uploads/`), central `errorHandler`
- Three utility modules: `asyncHandler`, `dates` (parseDateOnly/todayUTC/daysInclusive), `escapeRegex`
- Full auth controller: `register` (409 on duplicate email, bcrypt × 10), `login` (401 same message for wrong email/password), `getMe`
- Auth routes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me [protected]`
- Stub controllers + wired routes for items (Phase 2) and bookings (Phase 3)
- `server/.env` with dev defaults; `server/.env.example`; `server/uploads/.gitkeep`

### Files created
| File | Notes |
|---|---|
| `server/.env` | Dev secrets (not committed) |
| `server/.env.example` | Template |
| `server/uploads/.gitkeep` | Keeps uploads dir in git |
| `server/src/index.js` | Entry: load dotenv, connect DB, start server |
| `server/src/app.js` | Express app: CORS, morgan, JSON body, routes, 404, error handler |
| `server/src/config/db.js` | Mongoose connect |
| `server/src/models/index.js` | User, Item, Booking schemas (all in one file — see deviation below) |
| `server/src/middleware/auth.js` | `protect` middleware |
| `server/src/middleware/upload.js` | multer disk storage |
| `server/src/middleware/error.js` | Central error handler |
| `server/src/utils/asyncHandler.js` | Wraps async route handlers |
| `server/src/utils/dates.js` | parseDateOnly, todayUTC, daysInclusive |
| `server/src/utils/escapeRegex.js` | Escapes regex special chars |
| `server/src/controllers/auth.controller.js` | register, login, getMe |
| `server/src/controllers/item.controller.js` | Stubs (Phase 2) |
| `server/src/controllers/booking.controller.js` | Stubs (Phase 3) |
| `server/src/routes/auth.routes.js` | Auth routes |
| `server/src/routes/item.routes.js` | Item routes (mine before :id) |
| `server/src/routes/booking.routes.js` | Booking routes |

### How to run
```bash
# Ensure MongoDB is running locally on port 27017, then:
cd server
npm run dev
# or: npm start
```

Verification (after `npm run dev` in one terminal):
```bash
# Register
curl -s -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}' | jq .

# Login
curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq .

# GET /me (replace <token> with the token from login)
curl -s http://localhost:8000/api/auth/me \
  -H 'Authorization: Bearer <token>' | jq .

# 409 on duplicate email
curl -s -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123"}' | jq .

# 401 on bad password
curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"wrongpassword"}' | jq .

# 401 on no token
curl -s http://localhost:8000/api/auth/me | jq .
```

### Deviations from brief
1. **Models in one file:** The brief specifies `models/User.js`, `models/Item.js`, `models/Booking.js` as separate files. They are combined into `models/index.js` to reduce import boilerplate. All exports match the brief exactly. Will split if a later phase requires it.

### Known issues
- None. All module imports verified clean via `node --input-type=module`. Live endpoint verification requires MongoDB running locally (sandbox has no loopback networking).


---

## Phase 2 — Item Model, Image Upload, Items API

**Date:** 2026-11-19

### What was built
- Exported `CATEGORIES` array from `src/models/index.js` (was defined but not exported)
- Rewrote `src/middleware/upload.js`: added `uploadSingle(field)` wrapper that runs multer and converts any multer error (wrong type, too large) into an inline `400 { message }` before hitting the central error handler
- Full `src/controllers/item.controller.js`:
  - `getItems` — search (escaped case-insensitive regex on title OR description), category filter, page+limit (limit capped at 50, default 12), newest first, `owner` populated as `{ id, name }`, returns `{ items, total, page, pages }`
  - `getMyItems` — owner's own items, newest first, populated
  - `getItemById` — 404 on missing
  - `createItem` — validates all fields (title 3–80, description 1–1000, category in CATEGORIES, pricePerDay integer ≥ 1 parsed from multipart string), sets `imageUrl = '/uploads/<filename>'` when file present; cleans up uploaded file on validation failure
  - `updateItem` — owner-only (403), partial update, replaces old image file with `fs.unlink` on new upload, cleans up new file on validation error
  - `toggleAvailability` — owner-only (403), validates `isAvailable` is boolean
  - `deleteItem` — owner-only (403), deletes image file; booking guard deferred to Phase 3
  - `getBookedDates` — stub returning `{ ranges: [] }`, Phase 3
- Updated `src/routes/item.routes.js` to import `uploadSingle` instead of default multer instance

### Files changed
| File | Change |
|---|---|
| `src/models/index.js` | Export `CATEGORIES` |
| `src/middleware/upload.js` | Add `uploadSingle(field)` error-wrapping helper |
| `src/controllers/item.controller.js` | Full implementation (was stub) |
| `src/routes/item.routes.js` | Use `uploadSingle('image')` |

### How to verify (run with MongoDB on :27017 and server on :8000)
```bash
# 1. Register two users
curl -s -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@test.com","password":"secret1"}' | jq -r '.token' > /tmp/tok_alice

curl -s -X POST http://localhost:8000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bob","email":"bob@test.com","password":"secret1"}' | jq -r '.token' > /tmp/tok_bob

ALICE=$(cat /tmp/tok_alice); BOB=$(cat /tmp/tok_bob)

# 2. Create item with image (Alice) — use any jpg/png on disk
curl -s -X POST http://localhost:8000/api/items \
  -H "Authorization: Bearer $ALICE" \
  -F title="Power Drill" \
  -F description="A cordless power drill, excellent condition" \
  -F category=Tools \
  -F pricePerDay=150 \
  -F image=@/path/to/test.jpg | jq .

# 3. Fetch image from /uploads
# (use the imageUrl field from the response above)
curl -I http://localhost:8000/uploads/<filename>

# 4. List with search, category, pagination
curl -s "http://localhost:8000/api/items?search=drill&category=Tools&page=1&limit=12" | jq .

# 5. Get one item
curl -s "http://localhost:8000/api/items/<itemId>" | jq .

# 6. Update as owner (Alice)
curl -s -X PUT http://localhost:8000/api/items/<itemId> \
  -H "Authorization: Bearer $ALICE" \
  -F pricePerDay=200 | jq .

# 7. Update as other user (Bob) → 403
curl -s -X PUT http://localhost:8000/api/items/<itemId> \
  -H "Authorization: Bearer $BOB" \
  -F pricePerDay=99 | jq .

# 8. Toggle availability
curl -s -X PATCH http://localhost:8000/api/items/<itemId>/availability \
  -H "Authorization: Bearer $ALICE" \
  -H 'Content-Type: application/json' \
  -d '{"isAvailable": false}' | jq .

# 9. Delete (Alice) → 200 { message }
curl -s -X DELETE http://localhost:8000/api/items/<itemId> \
  -H "Authorization: Bearer $ALICE" | jq .

# 10. Wrong image type → 400
curl -s -X POST http://localhost:8000/api/items \
  -H "Authorization: Bearer $ALICE" \
  -F title="Bad" -F description="desc" -F category=Tools -F pricePerDay=10 \
  -F image=@/path/to/file.gif | jq .
```

### Deviations
- None. `getBookedDates` left as stub (`{ ranges: [] }`) per Phase 2 scope; booking delete guard likewise deferred.

### Known issues
- None. All 8 logic unit tests pass. Live endpoint verification requires local MongoDB (sandbox has no loopback networking).

---

## Phase 3 — Bookings

**Date:** 2026-11-19

### What was built

**`src/controllers/booking.controller.js`** — full implementation:
- `hasAcceptedOverlap(itemId, start, end, excludeBookingId)` — shared helper used by both `createBooking` and the accept transition. Queries `Booking` with `status:'accepted'`, `startDate:{$lte:end}`, `endDate:{$gte:start}`. Optional `excludeBookingId` prevents a booking from blocking its own re-check on accept.
- `createBooking` — validates item exists (404), isAvailable (400), not own item (403), dates are valid YYYY-MM-DD, start ≥ today UTC (400), end ≥ start (400), range ≤ 30 days (400), no accepted overlap (409). Computes `days = daysInclusive(start, end)`, `totalFee = days × item.pricePerDay`, snapshots `pricePerDay`. Status = `pending`.
- `getBorrowing` — `borrower = req.user`, item populated as `{id,title,imageUrl,pricePerDay}`, owner as `{id,name}`, newest first.
- `getLending` — `owner = req.user`, item same as above, borrower as `{id,name,email}`, newest first.
- `updateBookingStatus` — enforces the full transition table:
  - `pending → accepted|rejected`: owner only; on accept, re-runs `hasAcceptedOverlap` (409 on conflict)
  - `pending|accepted → cancelled`: borrower only
  - `accepted → completed`: owner only
  - Wrong state → 400; wrong user → 403; unknown status → 400

**`src/controllers/item.controller.js`** — two stubs filled in (Phase 3 scope):
- `deleteItem` — now checks for active bookings (`Booking.exists({item, status:{$in:['pending','accepted']}})`) and returns 409 before deleting
- `getBookedDates` — queries accepted bookings whose `endDate ≥ today`, returns `{ranges:[{startDate,endDate}]}`

Routes (`src/routes/booking.routes.js`) were already correctly wired in Phase 1 — no changes needed.

### Files changed
| File | Change |
|---|---|
| `src/controllers/booking.controller.js` | Full implementation (was stub) |
| `src/controllers/item.controller.js` | `deleteItem` booking guard + `getBookedDates` real query |

### Verification scenario (run with server on :8000, MongoDB on :27017)

```bash
# Setup — register A (owner), B and C (borrowers)
curl -s -X POST http://localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"a@t.com","password":"pass123"}' | jq -r '.token' > /tmp/tok_a
curl -s -X POST http://localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Bob","email":"b@t.com","password":"pass123"}' | jq -r '.token' > /tmp/tok_b
curl -s -X POST http://localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Carol","email":"c@t.com","password":"pass123"}' | jq -r '.token' > /tmp/tok_c
A=$(cat /tmp/tok_a); B=$(cat /tmp/tok_b); C=$(cat /tmp/tok_c)

# A creates an item → save ITEM_ID
curl -s -X POST http://localhost:8000/api/items -H "Authorization: Bearer $A" \
  -F title="Power Drill" -F description="Cordless power drill" -F category=Tools -F pricePerDay=100 | jq .
ITEM=<item_id>

# B books for Dec 10–14 (5 days) → 201, days=5, totalFee=500
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $B" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2026-12-10\",\"endDate\":\"2026-12-14\"}" | jq .
BOOK_B=<booking_b_id>

# A books own item → 403
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $A" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2026-12-20\",\"endDate\":\"2026-12-21\"}" | jq .message

# Past start → 400
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $B" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2024-01-01\",\"endDate\":\"2024-01-05\"}" | jq .message

# End before start → 400
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $B" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2026-12-20\",\"endDate\":\"2026-12-10\"}" | jq .message

# Range > 30 days → 400
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $B" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2026-12-01\",\"endDate\":\"2027-01-05\"}" | jq .message

# Mark item unavailable → B2 gets 400
curl -s -X PATCH http://localhost:8000/api/items/$ITEM/availability \
  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"isAvailable":false}' | jq .
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $B" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2026-12-20\",\"endDate\":\"2026-12-22\"}" | jq .message
# Mark back available
curl -s -X PATCH http://localhost:8000/api/items/$ITEM/availability \
  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"isAvailable":true}' | jq .

# C books overlapping dates (pending don't block) → 201
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $C" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2026-12-12\",\"endDate\":\"2026-12-15\"}" | jq .
BOOK_C=<booking_c_id>

# A accepts B → 200
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOK_B/status \
  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"status":"accepted"}' | jq .status

# A tries to accept C → 409 (overlap with B's now-accepted booking)
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOK_C/status \
  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"status":"accepted"}' | jq .message

# New request overlapping B's accepted range → 409
curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $C" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM\",\"startDate\":\"2026-12-11\",\"endDate\":\"2026-12-13\"}" | jq .message

# B tries to accept C's booking → 403
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOK_C/status \
  -H "Authorization: Bearer $B" -H 'Content-Type: application/json' -d '{"status":"accepted"}' | jq .message

# A tries to cancel B's booking → 403
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOK_B/status \
  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"status":"cancelled"}' | jq .message

# Invalid transition: completed → accepted → 400
# (first complete B's booking, then try accepted)
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOK_B/status \
  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"status":"completed"}' | jq .
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOK_B/status \
  -H "Authorization: Bearer $A" -H 'Content-Type: application/json' -d '{"status":"accepted"}' | jq .message

# Note: for delete test, use a fresh booking that is accepted
# Re-accept C → then GET booked-dates
curl -s http://localhost:8000/api/items/$ITEM/booked-dates | jq .

# A tries to delete item with active booking → 409
curl -s -X DELETE http://localhost:8000/api/items/$ITEM -H "Authorization: Bearer $A" | jq .message

# B cancels → then A can delete → 200
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOK_B/status \
  -H "Authorization: Bearer $B" -H 'Content-Type: application/json' -d '{"status":"cancelled"}' | jq .
curl -s -X DELETE http://localhost:8000/api/items/$ITEM -H "Authorization: Bearer $A" | jq .message

# Lists
curl -s http://localhost:8000/api/bookings/borrowing -H "Authorization: Bearer $B" | jq .
curl -s http://localhost:8000/api/bookings/lending  -H "Authorization: Bearer $A" | jq .
```

### Logic unit tests
29/29 PASS covering: todayUTC UTC midnight, parseDateOnly (valid, bad format, null), daysInclusive (1 day, 30 days), past-start, end-before-start, >30-day range, all 6 overlap edge-cases (mid, adjacent, touching, reverse, before, contained), totalFee calculation, all 11 status-transition permutations.

### Deviations
- None.

### Known issues
- None. Live curl verification requires local MongoDB (sandbox has no loopback networking).


---

## Phase 4 — Frontend Foundation

**Date:** 2026-11-19

### What was built
- **Vite + React Setup**: Created `client/` configured with Vite, React 19, `@tailwindcss/vite` plugin, and proxies for `/api` and `/uploads` forwarding to `http://localhost:8000`.
- **Tailwind CSS v4 & Styling**: `@import "tailwindcss";` in `src/index.css`, Inter font imported in `index.html` and configured as body font, adhering to the design system (slate-50 background, slate-900 text, indigo-600 primary).
- **Utilities**:
  - `src/utils/format.js`: `formatINR(n)` (₹ with Indian locale formatting), `formatDate(d)`, `imageSrc(path)`.
  - `src/utils/constants.js`: `CATEGORIES` array matching server model, `CATEGORY_EMOJIS` mapping each category to an emoji, `BOOKING_STATUSES` enum.
- **API & Authentication**:
  - `src/api/axios.js`: Axios instance with `baseURL: '/api'`, Bearer token request interceptor, and 401 response interceptor.
  - `src/context/AuthContext.jsx`: Context provider exposing `{ user, token, loading, login, register, logout }`. Restores session via `GET /auth/me` on initial load when token is present, clears token on invalid session or 401.
- **Components**:
  - `src/components/Navbar.jsx`: Brand 'Lendly', 'Browse' link, conditional auth controls (Log in / Sign up when logged out; 'List an item' button, Dashboard link, user name, Logout button when logged in).
  - `src/components/ProtectedRoute.jsx`: Displays spinner while session restores, redirects unauthenticated users to `/login` with `state={{ from: location }}`.
  - `src/components/Spinner.jsx`: Styled spinner adhering to design system.
  - `src/components/EmptyState.jsx`: Card for empty data views.
  - `src/components/StatusBadge.jsx`: Color-coded status badge (pending: amber, accepted: emerald, rejected: rose, cancelled: slate, completed: indigo).
- **Pages**:
  - `src/pages/Login.jsx`: Centered card with email/password inline validation, loading state, toast errors, and redirect back to previous path or `/`.
  - `src/pages/Register.jsx`: Centered card with name (2-50), email, password (min 6) inline validation, loading state, toast feedback, auto-login upon registration, and redirect.
  - Stubs: `Browse`, `ItemDetail`, `NewItem`, `EditItem`, `Dashboard` (heading + 'Coming soon').
  - `src/pages/NotFound.jsx`: 404 page with return link.
- **Routing & App Entry**:
  - `src/App.jsx`: Full route configuration matching Section 8 with protected routes for `/items/new`, `/items/:id/edit`, and `/dashboard`.
  - `src/main.jsx`: Encased with `BrowserRouter`, `AuthProvider`, and `Toaster`.

### Files created
| File | Description |
|---|---|
| `client/package.json` | Client dependencies and scripts |
| `client/vite.config.js` | Vite config with Tailwind v4 plugin and dev proxy |
| `client/index.html` | HTML entry with Inter font link and meta |
| `client/src/index.css` | Tailwind v4 import and base styles |
| `client/src/main.jsx` | React root with router, auth provider, toaster |
| `client/src/App.jsx` | Route configuration |
| `client/src/api/axios.js` | Axios instance with auth interceptors |
| `client/src/context/AuthContext.jsx` | Global authentication context & hook |
| `client/src/utils/format.js` | Currency, date, and image path formatters |
| `client/src/utils/constants.js` | Categories, emojis, and booking status constants |
| `client/src/components/Navbar.jsx` | Navigation header |
| `client/src/components/ProtectedRoute.jsx` | Route guard component |
| `client/src/components/Spinner.jsx` | Loading spinner |
| `client/src/components/EmptyState.jsx` | Empty state placeholder |
| `client/src/components/StatusBadge.jsx` | Status badge component |
| `client/src/pages/Login.jsx` | Login form page |
| `client/src/pages/Register.jsx` | Registration form page |
| `client/src/pages/Browse.jsx` | Browse stub page |
| `client/src/pages/ItemDetail.jsx` | Item detail stub page |
| `client/src/pages/NewItem.jsx` | New item stub page |
| `client/src/pages/EditItem.jsx` | Edit item stub page |
| `client/src/pages/Dashboard.jsx` | Dashboard stub page |
| `client/src/pages/NotFound.jsx` | 404 Not Found page |

### How to run and verify
1. Start MongoDB and backend server:
```bash
cd server
npm run dev
```

2. Start client dev server:
```bash
cd client
npm run dev
```
Client runs at `http://localhost:5173`.

3. Verification steps in browser:
- Visit `http://localhost:5173/dashboard` while logged out: redirects to `http://localhost:5173/login`.
- Register a new user on `/register`:
  - Form validates inline (name, email, password min 6).
  - On submit, creates user, stores token, shows success toast, and redirects to `/dashboard` (or intended destination).
  - Navbar updates to display "List an item", "Dashboard", the user's name, and "Logout".
- Refresh page (`F5` / `Cmd+R`): Session persists via `GET /api/auth/me`.
- Click "Logout": Token is cleared, user state resets, Navbar switches back to "Log in" and "Sign up", and redirects to `/`.
- Build verification:
```bash
cd client
npm run build
```
Build passes cleanly with 0 errors (`dist/` created).

### Deviations
- None.

### Known issues
- None.


---

## Phase 5 — Item Pages

**Date:** 2026-11-19

### What was built
- **`components/ItemCard.jsx`**:
  - Implements Section 9 specifications: 4:3 aspect ratio image container with fallback soft gradient + category emoji on missing image or `onError`.
  - Displays category chip with emoji, owner name ("by <name>"), item title, price formatted in INR (`₹X / day`), and an 'Unavailable' badge when `isAvailable` is false.
  - Links to `/items/:id`.
- **`pages/Browse.jsx`**:
  - Compact hero section with the heading *"Borrow what you need. Lend what you don't."* and a search bar.
  - Category filter chips: "All" plus all 8 categories with their corresponding emojis.
  - URL Query synchronization: Search input (debounced by 400ms), selected category, and active page are persisted in URL search parameters (`?search=...&category=...&page=...`), supporting browser history, back/forward navigation, and page refreshes.
  - Responsive grid conforming to Section 9 (1 col on mobile, 2 cols on sm, 3 cols on md, 4 cols on lg).
  - Loading spinner, `EmptyState` with a "List an item" CTA button when no items match, and Previous/Next pagination with page counts.
- **`pages/ItemDetail.jsx`**:
  - Two-column layout on desktop, responsive single-column layout on mobile.
  - Left column: large 4:3 product image with image error fallback.
  - Right column: Category chip with emoji, title, availability badge (emerald for available, rose for unavailable), price per day formatted as INR, full description, and owner attribution ("Listed by <name>").
  - Dedicated and clearly marked placeholder container for the Phase 6 Booking Panel (`#booking-panel-container`).
  - Owner-only controls:
    - "Edit Item" link pointing to `/items/:id/edit`.
    - "Mark as Unavailable" / "Mark as Available" button triggering `PATCH /api/items/:id/availability`.
    - "Delete" button with confirmation prompt, executing `DELETE /api/items/:id` and handling 409 conflict messages (e.g., active bookings) gracefully via toasts.
- **`components/ItemForm.jsx`**:
  - Shared reusable form for creating and editing items.
  - Controlled fields: `title` (3-80 chars), `description` (1-1000 chars), `category` (select dropdown populated with all 8 categories), `pricePerDay` (integer >= 1).
  - Image file picker with live preview using `URL.createObjectURL` and automatic object URL cleanup.
  - Client-side validation mirroring server validation rules, including file type (JPG/PNG/WebP) and file size (<= 3MB) checks.
  - Submits data as `FormData` without manual `Content-Type` headers so Axios generates proper boundary headers.
  - Displays inline field validation errors and server-returned error banners.
- **`pages/NewItem.jsx`**:
  - Replaces stub with full implementation using `ItemForm`.
  - Submits to `POST /api/items`, displays success toast, and redirects to the newly created item's detail page (`/items/:id`).
- **`pages/EditItem.jsx`**:
  - Replaces stub with full implementation.
  - Fetches existing item details, verifies current authenticated user is the item owner (redirects if not), pre-populates `ItemForm`.
  - Preserves existing image if no new file is selected.
  - Submits to `PUT /api/items/:id`, displays success toast, and redirects to `/items/:id`.

### Files created / updated
| File | Action | Description |
|---|---|---|
| `client/src/components/ItemCard.jsx` | Created | Item card with 4:3 image, fallback gradient + emoji, price, category chip |
| `client/src/components/ItemForm.jsx` | Created | Shared form for NewItem & EditItem with image preview and validation |
| `client/src/pages/Browse.jsx` | Replaced stub | Full browse page with hero, search, category chips, grid, pagination |
| `client/src/pages/ItemDetail.jsx` | Replaced stub | 2-column detail view, owner controls, booking panel spot |
| `client/src/pages/NewItem.jsx` | Replaced stub | Create item view with form submission and redirect |
| `client/src/pages/EditItem.jsx` | Replaced stub | Edit item view with ownership guard and image preservation |

### How to run and verify
1. Start the server (requires local MongoDB on port 27017):
```bash
cd server
npm run dev
```

2. Start the client:
```bash
cd client
npm run dev
```
Open `http://localhost:5173`.

3. Manual walkthrough:
- **List an Item**:
  - Log in or register an account.
  - Click "List an item" in the Navbar (`/items/new`).
  - Fill out Title, Category, Price per Day (₹), Description, and pick an image (JPG/PNG/WebP). Observe the live image preview.
  - Click "List Item". On success, redirects to `/items/<id>` and displays a success toast.
- **Browse & Filter**:
  - Navigate to `/`. See the listed item in the grid with image, title, category chip, and price.
  - Test the search bar: type a search keyword. After 400ms debounce, notice URL updates to `?search=...` and items filter accordingly.
  - Click category chips (e.g., Tools, Sports). Notice URL updates to `?category=...&page=1` and filters items. Click "All" to reset.
- **Item Details & Owner Controls**:
  - Click on the item card to open `/items/<id>`.
  - Notice the 2-column layout (image left; title, price, description, owner right).
  - As the owner:
    - Click "Mark as Unavailable". Badge updates to "● Unavailable", item state persists.
    - Click "Mark as Available". Badge updates to "● Available".
    - Click "Edit Item". Update title/price, keep or change image, click "Save Changes". Item updates and redirects to detail page.
    - Click "Delete". Confirm dialog appears. Confirming deletes the item and redirects to `/`.
  - Log in as another user (or open an incognito window):
    - Visit `/items/<id>`: Owner controls are hidden; the clearly marked Booking Panel placeholder is shown instead.
- **Responsive verification**:
  - Test at 375px mobile viewport: single-column grid, wrapping buttons, horizontally scrollable category chips, stacked item detail view.
  - Test at desktop viewport (>= 1024px): 4-column item grid, 2-column item detail view.
- **Build verification**:
```bash
cd client
npm run build
```
Build passes cleanly with 0 errors.

### Deviations
- None.

### Known issues
- None.


---

## Phase 6 — Booking Flow UI and Dashboard

**Date:** 2026-11-19

### What was built
- **`components/BookingPanel.jsx`**:
  - Embedded into `ItemDetail` for non-owners.
  - Native `type="date"` inputs for start and end dates with dynamic validation:
    - Min for start date is today (`todayStr`).
    - Min for end date is the chosen start date.
    - Max 30-day range limit check with inline error messaging.
  - Optional note textarea with character counter (max 300).
  - Live fee calculation: `{days} days × ₹{pricePerDay} = ₹{totalFee}` (using inclusive day logic matching server).
  - Fetches already booked date ranges from `GET /api/items/:id/booked-dates` and displays them as chips.
  - Real-time overlap detection: warns inline and disables the submit button if the chosen dates collide with an accepted booking.
  - Submits request via `POST /api/bookings` with loading state and toast feedback. Shows short post-submission confirmation card with shortcut links.
  - State guards:
    - Unauthenticated users see a "Log in to borrow" button redirecting to `/login` with return location preserved.
    - Unavailable items display an inline disabled notice instead of the form.
- **`components/BookingCard.jsx`**:
  - Displays item thumbnail (with graceful error fallback), clickable title linking to `/items/:id`, counterpart name/email, date range, total inclusive days, calculated fee in INR, `StatusBadge`, and optional borrower message.
  - Accepts contextual action buttons passed in by parent views (Cancel, Accept, Reject, Mark returned).
- **`pages/Dashboard.jsx`**:
  - 3-tab layout with active tab synchronized in URL query parameters (`?tab=borrowing|lending|listings`):
    - **Tab 1: Borrowing**: Lists outgoing requests via `GET /api/bookings/borrowing`. Borrowers can cancel pending or accepted bookings with confirmation.
    - **Tab 2: Requests received**: Lists incoming lending requests via `GET /api/bookings/lending`. Shows real-time badge count of pending requests on the tab header. Owners can Accept or Reject pending requests, or "Mark returned" on accepted items.
    - **Tab 3: My listings**: Displays items owned by user via `GET /api/items/mine` using `ItemCard` with quick action buttons (Edit, toggle availability, and Delete with 409 error handling).
  - All tabs include dedicated loading spinners, error states with retry buttons, and helpful empty states with contextual CTA buttons.

### Files created / updated
| File | Action | Description |
|---|---|---|
| `client/src/components/BookingPanel.jsx` | Created | Date range picker, live fee summary, overlap detection, booking submission |
| `client/src/components/BookingCard.jsx` | Created | Booking card displaying item info, counterpart, dates, status, actions |
| `client/src/pages/ItemDetail.jsx` | Updated | Replaced booking panel placeholder with live `BookingPanel` component |
| `client/src/pages/Dashboard.jsx` | Replaced stub | Full 3-tab dashboard with borrowing, lending requests, and my listings |

### How to run and verify
1. Start MongoDB and the backend server:
```bash
cd server
npm run dev
```

2. Start the client:
```bash
cd client
npm run dev
```

3. End-to-end verification (two browser sessions):
- **User A (Owner)**:
  - Register as User A (`alice@test.com`) and list an item (e.g. "Mountain Bike", ₹300/day).
- **User B (Borrower in Incognito Window)**:
  - Register as User B (`bob@test.com`).
  - Browse and open "Mountain Bike".
  - Select valid dates (e.g. next week for 3 days). Notice live fee estimate (`3 days × ₹300 = ₹900`).
  - Submit request. Toast displays and confirmation card appears.
  - Visit `/dashboard?tab=borrowing` and see request with status badge `Pending`.
- **User A (Owner in Normal Window)**:
  - Visit `/dashboard`. Notice tab badge shows `1` on "Requests received".
  - Switch to "Requests received" tab. See Bob's request.
  - Click "Accept". Toast confirms acceptance, status badge turns green (`Accepted`).
- **User C (or Bob trying overlapping dates)**:
  - Try to request the same item for overlapping dates.
  - Booking panel highlights the already booked dates as chips and disables submission with an inline overlap alert.
  - If forced through API, server returns `409` and client shows toast error.
- **User B (Borrower)**:
  - On `/dashboard?tab=borrowing`, click "Cancel Request" (confirms with browser alert). Status updates to `Cancelled`.
- **User A (Owner)**:
  - Accepts another valid booking request, then clicks "Mark returned".
  - Status updates to `Completed`.
- **Build verification**:
```bash
cd client
npm run build
```
Build finishes with 0 errors.

### Deviations
- None.

### Known issues
- None.

---

## Phase 6.1 — Audit Fixes

**Date:** 2026-11-19

### What changed per item number

1. **`server/src/controllers/item.controller.js` (`getBookedDates`)**:
   - Replaced `.select('startDate endDate -_id')` with `.select('startDate endDate')` and mapped results to `{ startDate: b.startDate, endDate: b.endDate }`. This prevents Mongoose's `toJSON` transform from crashing on undefined `ret._id` when returning accepted bookings.

2. **`server/src/models/index.js` (Null-safe `toJSONTransform` & `User` transform)**:
   - Added `if (ret._id)` check before assigning `ret.id = ret._id.toString()` in both `toJSONTransform` and `userSchema.set('toJSON')`. Guards against missing `_id` fields in projections across all models.

3. **`server/src/app.js` (Undefined `req.body` fallback middleware)**:
   - Added middleware directly after `express.json()` and `express.urlencoded()` to set `req.body = {}` when `req.body === undefined`. Resolves Express 5 behavior where empty request bodies left `req.body` undefined, causing 500 errors on endpoints that destructure `req.body`.

4. **`server/src/controllers/item.controller.js` (`parseItemFields`)**:
   - Replaced `parseInt(rawPrice, 10)` with strict `Number(rawPrice)` validation using `!Number.isInteger(price) || price < 1`. Non-integer or alphanumeric values such as `'12.5'` and `'50abc'` are now rejected with 400. Maintained update behavior (only validated if supplied).

5. **`client/src/pages/Browse.jsx` (Search input sync effect)**:
   - Updated `useEffect` syncing URL query changes to use `setSearchInput((prev) => (prev.trim() === currentSearch ? prev : currentSearch))` to prevent stripping trailing spaces while typing after debounce.

6. **`client/src/components/BookingPanel.jsx` (Auth loading placeholder)**:
   - Read `loading` from `useAuth()`. Renders a small `Spinner` component while auth session is loading, preventing the "Log in to borrow" card from flashing on page refresh. All React hooks are kept above early return conditions.

7. **`client/src/components/BookingCard.jsx` (Deleted item handling)**:
   - Added check for deleted items (`booking.item` is null). Displays `'Item removed'` as plain text instead of a link to `/items/undefined`, and renders the fallback package emoji thumbnail.

8. **`client/index.html` (Favicon link)**:
   - Replaced the missing `/vite.svg` icon link with an inline emoji SVG data URI favicon (`📦`).

9. **Dead CSS classes removed**:
   - Removed unused class `'animate-in fade-in duration-300'` from `BookingPanel.jsx`.
   - Removed unused class `'scrollbar-none'` from category filter container in `Browse.jsx`.

10. **`.gitignore` (Server uploads ignore)**:
    - Added `server/uploads/*` and `!server/uploads/.gitkeep` to ensure uploaded item photos are not committed to git.

### Files changed
| File | Changes |
|---|---|
| `server/src/controllers/item.controller.js` | Item 1 (`getBookedDates`) and Item 4 (`parseItemFields`) |
| `server/src/models/index.js` | Item 2 (null-safe `toJSONTransform` and `User` transform) |
| `server/src/app.js` | Item 3 (`req.body = {}` fallback middleware) |
| `client/src/pages/Browse.jsx` | Item 5 (search input space fix) and Item 9 (removed `scrollbar-none`) |
| `client/src/components/BookingPanel.jsx` | Item 6 (auth `loading` spinner) and Item 9 (removed `animate-in...`) |
| `client/src/components/BookingCard.jsx` | Item 7 (deleted item handling) |
| `client/index.html` | Item 8 (emoji SVG data URI favicon) |
| `.gitignore` | Item 10 (ignore `server/uploads/*`) |

### Verification results

- **Frontend build:** Executed `npm run build` in `client/`. Built cleanly with 0 errors (`dist/` created).
- **Unit & Logic verification (node sandbox tests):**
  - Verified `toJSONTransform` does not throw when `_id` is excluded (null-safe for Booking and User).
  - Verified `parseItemFields` price validation rejects `'12.5'`, `'50abc'`, `'0'`, `'-10'`, and accepts valid integers (e.g. `'150'`, `200`).
  - Verified Express middleware sets `req.body = {}` when `req.body` is undefined, preventing destructuring errors in controller routes.
- **Live server / database verification in sandbox:**
  - Standard sandbox isolation disables loopback networking (`connectx to 127.0.0.1 port 27017 failed: Operation not permitted`), so live server execution against a database could not be run directly inside the sandbox environment.

### Verification commands to run locally with live database

Run with MongoDB on `:27017` and server on `:8000`:
```bash
# 1. Start server
cd server && npm run dev

# 2. Test POST /api/auth/register with no body returns 400 (not 500)
curl -s -X POST http://localhost:8000/api/auth/register | jq .

# 3. Register user 1 (owner) and user 2 (borrower)
curl -s -X POST http://localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Owner","email":"owner@test.com","password":"password123"}' | jq -r '.token' > /tmp/tok_owner
curl -s -X POST http://localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Borrower","email":"borrower@test.com","password":"password123"}' | jq -r '.token' > /tmp/tok_borrower

OWNER=$(cat /tmp/tok_owner)
BORROWER=$(cat /tmp/tok_borrower)

# 4. Test price validation rejects decimal and alphanumeric price (returns 400)
curl -s -X POST http://localhost:8000/api/items -H "Authorization: Bearer $OWNER" \
  -F title="Test Item" -F description="Test description" -F category="Tools" -F pricePerDay="12.5" | jq .
curl -s -X POST http://localhost:8000/api/items -H "Authorization: Bearer $OWNER" \
  -F title="Test Item" -F description="Test description" -F category="Tools" -F pricePerDay="50abc" | jq .

# 5. Create valid item
ITEM_ID=$(curl -s -X POST http://localhost:8000/api/items -H "Authorization: Bearer $OWNER" \
  -F title="Valid Drill" -F description="Valid cordless drill" -F category="Tools" -F pricePerDay="150" | jq -r '.item.id')

# 6. Book item as borrower
BOOKING_ID=$(curl -s -X POST http://localhost:8000/api/bookings -H "Authorization: Bearer $BORROWER" \
  -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"$ITEM_ID\",\"startDate\":\"2026-12-01\",\"endDate\":\"2026-12-05\"}" | jq -r '.booking.id')

# 7. Accept booking as owner
curl -s -X PATCH http://localhost:8000/api/bookings/$BOOKING_ID/status -H "Authorization: Bearer $OWNER" \
  -H 'Content-Type: application/json' \
  -d '{"status":"accepted"}' | jq .

# 8. Confirm GET /api/items/<id>/booked-dates returns 200 with one range
curl -s http://localhost:8000/api/items/$ITEM_ID/booked-dates | jq .
```

### Deviations from brief
- None.

