# Lendly: Project Brief (single source of truth)

## 1. Product
Peer-to-peer lending of everyday items. An owner lists a spare item with a per-day fee. A borrower requests it for a date range. The owner accepts or rejects. Prototype only: NO payments and NO delivery. Fees are calculated and displayed, never charged.

## 2. Stack (fixed, do not substitute)
- Node 20+, JavaScript only (no TypeScript), ES modules everywhere.
- Server: express, mongoose, jsonwebtoken, bcryptjs, multer, cors, dotenv, morgan.
- Client: Vite + React, Tailwind CSS v4 (via the @tailwindcss/vite plugin, no tailwind.config.js), react-router-dom, axios, react-hot-toast.
- DB: MongoDB via Mongoose.
- Images: multer disk storage in server/uploads, served at /uploads. No Cloudinary.
- Auth: JWT (7 day expiry) sent as 'Authorization: Bearer <token>', stored in localStorage on the client.
- Currency: INR, shown with the rupee symbol. Dev ports: server 8000, client 5173. Vite proxies /api and /uploads to http://localhost:8000, so the client uses relative URLs.

## 3. Repo layout
lendly/
  PROJECT_BRIEF.md, PHASE_LOG.md, README.md, .gitignore
  server/
    package.json, .env, .env.example, uploads/.gitkeep
    src/
      index.js            (connect DB, start server)
      app.js              (express app, middleware, routes, 404, error handler)
      config/db.js
      models/User.js, Item.js, Booking.js
      middleware/auth.js, upload.js, error.js
      utils/asyncHandler.js, dates.js, escapeRegex.js
      controllers/auth.controller.js, item.controller.js, booking.controller.js
      routes/auth.routes.js, item.routes.js, booking.routes.js
      seed.js
  client/
    vite.config.js (with proxy)
    src/
      main.jsx, App.jsx, index.css
      api/axios.js
      context/AuthContext.jsx
      components/ Navbar, ItemCard, ItemForm, BookingPanel, BookingCard, StatusBadge, ProtectedRoute, Spinner, EmptyState
      pages/ Browse, ItemDetail, Login, Register, NewItem, EditItem, Dashboard, NotFound
      utils/format.js, constants.js

server/.env keys: PORT=8000, MONGO_URI, JWT_SECRET, CLIENT_URL=http://localhost:5173

## 4. Data models
All models: timestamps on, and a toJSON transform that exposes id (string) instead of _id and removes __v.

User: name (String, required, trimmed, 2-50), email (String, required, unique, lowercase, trimmed), passwordHash (String, required, select:false). toJSON also hides passwordHash.

Item: owner (ObjectId ref User, required), title (String, required, 3-80), description (String, required, max 1000), category (enum), imageUrl (String, default '', relative path such as /uploads/abc.jpg), pricePerDay (Number, required, integer >= 1), isAvailable (Boolean, default true). Indexes on owner, category, createdAt desc.
Categories enum (same list in server model and client/src/utils/constants.js, client also maps each to an emoji): Sports, Electronics, Tools, Books, Clothing, Kitchen, Outdoor, Other.

Booking: item (ref Item), borrower (ref User), owner (ref User), startDate (Date), endDate (Date), days (Number), pricePerDay (Number, snapshot at booking time), totalFee (Number), message (String, max 300, default ''), status (enum pending | accepted | rejected | cancelled | completed, default pending). Dates are stored at UTC midnight and are inclusive. Index on { item: 1, status: 1 }.

## 5. API contract (do not rename anything)
Errors always look like { message } (optionally { message, errors }) with status 400, 401, 403, 404, 409 or 500. Success bodies are exactly as below.

AUTH
- POST /api/auth/register  body { name, email, password (min 6) }  ->  201 { token, user }. 409 if email exists.
- POST /api/auth/login  body { email, password }  ->  200 { token, user }. 401 on bad credentials (same message for wrong email or password).
- GET /api/auth/me  [auth]  ->  200 { user }

ITEMS
- GET /api/items?search=&category=&page=1&limit=12  (public)  ->  { items, total, page, pages }. Each item has owner populated as { id, name }. Newest first. search = case-insensitive escaped regex on title OR description. Returns available and unavailable items.
- GET /api/items/mine  [auth]  ->  { items }   (define this route BEFORE /:id)
- GET /api/items/:id  (public)  ->  { item }  (owner populated as { id, name })
- POST /api/items  [auth]  multipart/form-data: title, description, category, pricePerDay, optional file field 'image' (jpg/png/webp, max 3MB)  ->  201 { item }
- PUT /api/items/:id  [auth, owner only]  same fields, image optional  ->  { item }
- PATCH /api/items/:id/availability  [auth, owner only]  body { isAvailable: boolean }  ->  { item }
- DELETE /api/items/:id  [auth, owner only]  ->  { message }. 409 if the item has pending or accepted bookings.
- GET /api/items/:id/booked-dates  (public)  ->  { ranges: [{ startDate, endDate }] }  accepted bookings whose endDate >= today.

BOOKINGS (all [auth])
- POST /api/bookings  body { itemId, startDate, endDate, message? }  dates as 'YYYY-MM-DD'  ->  201 { booking }
- GET /api/bookings/borrowing  ->  { bookings }  where borrower = me. item populated as { id, title, imageUrl, pricePerDay }, owner populated as { id, name }. Newest first.
- GET /api/bookings/lending  ->  { bookings }  where owner = me. item populated as above, borrower populated as { id, name, email }.
- PATCH /api/bookings/:id/status  body { status }  ->  { booking }

## 6. Business rules
Create booking:
- Item must exist (404). Item must be isAvailable (400 'Item is not available'). Borrower must not be the owner (403).
- Dates must be valid, start >= today (UTC), end >= start, and the range at most 30 days (400).
- Reject with 409 if the range overlaps any ACCEPTED booking of the same item. Overlap test: existing.startDate <= new.endDate AND existing.endDate >= new.startDate. Pending bookings never block.
- days = whole days between start and end + 1 (inclusive). totalFee = days x item.pricePerDay (computed on the server only). Save the pricePerDay snapshot. Status starts as pending.
Status transitions (only these are allowed):
- pending -> accepted or rejected: item owner only. On accept, re-run the overlap check (409 on conflict).
- pending or accepted -> cancelled: borrower only.
- accepted -> completed: item owner only (item was returned).
- Anything else: 403 for the wrong user, 400 for the wrong current state.
Only the item owner may edit, delete or toggle availability of an item.

## 7. Backend conventions
- Routes only wire paths to controllers. Controllers hold the logic. Wrap async handlers in utils/asyncHandler.js.
- One central error middleware. Map Mongoose ValidationError to 400, CastError on an id to 404, duplicate key (11000) to 409, JWT errors to 401, everything else to 500. Never leak stack traces or secrets.
- middleware/auth.js exports protect: verifies the JWT, loads the user, sets req.user = { id, name, email }.
- bcryptjs with 10 salt rounds. Validate request bodies manually (trim strings, check types) and return 400 with a clear message.
- utils/dates.js: parseDateOnly('YYYY-MM-DD') returns a Date at UTC midnight or null. Also todayUTC() and daysInclusive(a, b).

## 8. Frontend conventions
- Functional components and hooks only. No Redux. No TypeScript.
- AuthContext exposes { user, token, loading, login, register, logout }. On load, if a token exists, call GET /auth/me and clear the token on failure.
- api/axios.js: instance with baseURL '/api', a request interceptor that adds the Bearer token, and a response interceptor that clears the token on 401.
- Every data view handles loading, error and empty states. Disable submit buttons while a request is in flight. Use react-hot-toast for success and error feedback.
- utils/format.js: formatINR(n), formatDate(d), imageSrc(path) (returns the path or null).
- Routes: / (Browse), /items/:id, /login, /register, /items/new [protected], /items/:id/edit [protected, owner only], /dashboard [protected], * (NotFound).

## 9. UI design system (clean, minimal, consistent)
- Font Inter. Page background slate-50, text slate-900. Primary indigo-600 (hover indigo-700). Success emerald, warning amber, danger rose.
- Container: max-w-6xl mx-auto px-4. Cards: rounded-2xl border border-slate-200 bg-white shadow-sm, hover:shadow-md with a transition. Buttons: rounded-lg px-4 py-2 font-medium. Inputs: rounded-lg border-slate-300 with focus ring-2 ring-indigo-500.
- ItemCard: 4:3 image area (fallback is a soft gradient with the category emoji), title, category chip, price as 'X/day' with the rupee symbol, and an 'Unavailable' badge when relevant.
- StatusBadge colors: pending amber, accepted emerald, rejected rose, cancelled slate, completed indigo.
- Responsive grid: 1 / 2 / 3 / 4 columns. Navbar stays a simple wrapping flex row (no hamburger).

## 10. Guardrails for the AI agent
1. Read PROJECT_BRIEF.md and PHASE_LOG.md fully before writing code.
2. Implement ONLY the current phase. Do not build later phases. Do not refactor earlier phases except to fix a bug, and log any such fix.
3. Never change names, routes, field names, status codes or response shapes from this brief. If something looks wrong, pick the least invasive fix and record it under 'Deviations' in PHASE_LOG.md.
4. Do not ask clarifying questions. Make a reasonable assumption and log it.
5. No new dependencies beyond section 2 unless unavoidable (log why).
6. Small single-purpose files. No dead code. No TODO placeholders for work that belongs to the current phase.
7. Actually run the phase's verification (start the servers, curl the endpoints, run npm run build) and fix failures before finishing.
8. Finish by appending to PHASE_LOG.md: phase name, what was built, files created or changed, how to run it, deviations, known issues.