# Project: Renger Platform Bug Fixing & Quality Hardening

## Architecture
- **Stack**: HTML5, Vanilla JavaScript (ES2022), Tailwind CSS (CDN runtime config), Supabase JS Client v2
- **Structure**: Multi-Page Application (MPA) located in `Site web/`:
  - `index.html`: Landing page, search bar, trailer categories, value props, cookies/tracking
  - `remorques.html`: Catalog search, geolocation radius filtering, trailer cards
  - `remorque.html`: Trailer detail page, pricing calculator, review modal, booking CTA
  - `louer-ma-remorque.html`: Trailer publication & edit form, photo uploads, pricing rules
  - `profil.html`: User account, active rentals, owner fleet management, PRO dashboard statistics
  - `inspection.html`: Digital departure/return inspection camera and photo checklists
  - `pro.html`: Professional subscription presentation and upgrade flow
  - `cgu.html` & `politique-confidentialite.html`: Legal terms and privacy policies
  - `js/core.js`: Auth state, user session, Supabase initialization, theme, toast, analytics tracking
  - `js/trailers.js`: Ad publishing, geolocation geocoding, profile data loader, PRO metrics
  - `js/booking.js`: Booking calendar, Flatpickr integration, price/deposit math, trailer edit handling
  - `js/chat.js`: Real-time messaging, anti-scam phone/email filter, rental close modal triggers
  - `js/components.js`: Reusable UI components, header/footer/mobile nav, reviews, toasts
  - `js/tracking.js`: Cookie consent banner management, analytics tracking gating
- **Verification Engine**: Native Node.js 24 (`node:test`, `node:assert`, `node --check`) zero-dependency test suite under `tests/`.

---

## Feature Inventory
| # | Feature / Issue | Description | Milestone | Source |
|---|-----------------|-------------|-----------|--------|
| 1 | SyntaxError Fix `trailers.js` | Fix unquoted Nominatim URL at line 1574 in `trailers.js` | M2 | Survey Explorer 1, 2, 3 |
| 2 | ReferenceError Fix `loadProfileData` | Fix undeclared `profile` and `sellerTrailers` identifiers in `trailers.js:1027-1052` | M2 | Survey Explorer 2, 3 |
| 3 | PRO Dashboard DOM Injection | Insert missing `#stat-impressions`, `#stat-clicks`, `#stat-conversion`, `#stat-occupancy`, `#pro-stats-blur` into `profil.html` | M1 | Survey Explorer 1, 3 |
| 4 | Defensive DOM in `loadProfileData` | Guard all PRO stats element assignments against null in `trailers.js` | M2 | Survey Explorer 2 |
| 5 | Tailwind Dark Mode Fix | Correct `darkMode: 'c11lass'` typo to `'class'` in `index.html:26` | M1 | Survey Explorer 1 |
| 6 | Home Page Tracking & Cookies | Insert `<script src="js/tracking.js"></script>` into `index.html:229` | M1 | Survey Explorer 1, 2, 3 |
| 7 | Cleanup Literal `\n` in HTML | Remove raw `\n` text artifacts before `</body>` across 8 HTML files | M1 | Survey Explorer 1, 3 |
| 8 | Review Modal in `remorque.html` | Insert `#review-modal` markup in `remorque.html` to unblock "Laisser un avis" button | M1 | Survey Explorer 1 |
| 9 | Inspection Warning in `profil.html` | Insert `#inspection-warning-modal` in `profil.html` to unblock rental closing in chat | M1 | Survey Explorer 1 |
| 10 | Mobile Navigation Settings Link | Update `mobile-nav-settings` to point to `profil.html?p=settings-page` | M1 | Survey Explorer 1 |
| 11 | Empty `img` Tag Cleanup | Remove or add fallback for empty `<img src="">` in `remorque.html` | M1 | Survey Explorer 1 |
| 12 | Safe `settings-email` Assignment | Guard `document.getElementById('settings-email')` in `core.js:914` against null | M2 | Survey Explorer 2 |
| 13 | MPA Category Filter Fix | Fix `filterByCategory` -> `setFilter` invocation in `core.js:1057` | M2 | Survey Explorer 2 |
| 14 | Guarded `loadTrailers` on MPA | Guard `loadTrailers()` in `core.js:1062` so it only runs when `#trailers-grid` exists | M2 | Survey Explorer 2 |
| 15 | Ad Publishing `location` Field | Include `location: locationInput` in `newTrailer` payload in `trailers.js:468-484` | M2 | Survey Explorer 3 |
| 16 | Cookie Consent Gating in Analytics | Gate `logImpression()` and `logClick()` in `core.js` behind cookie consent check | M2 | Survey Explorer 2 |
| 17 | MPA Trailer Edit Flow | Update `editTrailer(id)` to redirect to `louer-ma-remorque.html?edit=${id}` and pre-fill form | M3 | Survey Explorer 2 |
| 18 | Booking Date DST Normalization | Normalize calendar day difference calculation in `booking.js` against daylight saving time shifts | M3 | Survey Explorer 2 |
| 19 | `trailer_booked_dates` Resiliency | Add query fallback in `booking.js` when `trailer_booked_dates` view is missing | M3 | Survey Explorer 2, 3 |
| 20 | Anti-Scam Filter Hardening | Ensure regex filters in `chat.js` mask IBANs/phones/emails and display alert banner | M3 | Survey Explorer 2 |
| 21 | E2E Automated Test Suite | Implement zero-dependency Node.js test suite (`node:test`) covering Tiers 1-4 | Test Track | Survey Explorer 3 |
| 22 | Final E2E Pass & Adversarial Hardening | Pass 100% of E2E tests, execute Tier 5 adversarial stress tests, and forensic audit | M4 | Project Pattern |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| Test-Track | E2E Test Suite Creation | Design & write automated test runner and test cases (Tiers 1-4) in `tests/`, publish `TEST_READY.md` | none | DONE |
| M1 | HTML, DOM & Asset Inconsistencies | Fix `index.html`, `profil.html`, `remorque.html`, mobile nav, `tracking.js`, modal markup, `\n` cleanup | none | DONE |
| M2 | Core JS Runtime, Syntax & Analytics | Fix `trailers.js:1574` syntax, `loadProfileData` variables, DOM guards, `location` in publish, `core.js` filters & cookie gating | M1 contract | DONE |
| M3 | MPA Edit Flow, Booking & Anti-Scam | Implement cross-page edit flow (`louer-ma-remorque.html?edit=...`), DST date math, Supabase booked dates fallback, chat anti-scam | M1, M2 | DONE |
| M4 | Final 100% E2E Pass & Hardening | Execute full test suite, resolve any remaining edge cases, adversarial challenge (Tier 5), forensic integrity audit | Test-Track, M1, M2, M3 | DONE |

---

## Interface Contracts

### 1. `profil.html` ↔ `trailers.js` (PRO Dashboard DOM Contract)
- `profil.html` MUST contain element IDs:
  - `pro-stats-blur`: Container wrapper for blur overlay when user is not PRO
  - `stat-impressions`: Text node receiving count of trailer views
  - `stat-clicks`: Text node receiving count of trailer clicks
  - `stat-conversion`: Text node receiving conversion percentage (e.g. `12.5%`)
  - `stat-occupancy`: Text node receiving monthly occupancy percentage (e.g. `45%`)
- `trailers.js` MUST use optional chaining or null guards on all these elements.

### 2. `profil.html` ↔ `louer-ma-remorque.html` (Trailer Edit Contract)
- In `profil.html` (or `booking.js`), clicking "Modifier" on an ad MUST navigate to: `louer-ma-remorque.html?edit=${trailerId}`.
- In `louer-ma-remorque.html`, `trailers.js` (or inline init) MUST inspect `new URLSearchParams(window.location.search).get('edit')`.
- If present, it fetches trailer details by ID and populates all form fields (`#ad-title`, `#ad-category`, `#ad-price`, `#ad-location`, `#ad-description`, etc.), changing submit button text to "Mettre à jour l'annonce".

### 3. `index.html` ↔ `js/tracking.js` ↔ `core.js` (Cookie Consent & Analytics Contract)
- `index.html` MUST include `<script src="js/tracking.js"></script>` before `</body>`.
- `tracking.js` manages `localStorage.getItem('renger_cookie_consent')` ('accepted' | 'declined').
- `core.js` functions `logImpression(trailerId)` and `logClick(trailerId)` MUST verify `localStorage.getItem('renger_cookie_consent') === 'accepted'` before executing Supabase insertion.

### 4. `remorque.html` ↔ `components.js` (Review Modal Contract)
- `remorque.html` MUST contain `#review-modal` container matching the structure in `profil.html` so `openReviewModal(bookingId, trailerId, title)` can open it seamlessly.

### 5. `profil.html` ↔ `chat.js` (Inspection Warning Modal Contract)
- `profil.html` MUST contain `#inspection-warning-modal` so that attempting to close a rental without sufficient inspection photos alerts the user.

---

## Code Layout
- `Site web/`
  - `*.html` (Owned by M1, M3)
  - `js/core.js` (Owned by M2)
  - `js/trailers.js` (Owned by M2)
  - `js/booking.js` (Owned by M3)
  - `js/chat.js` (Owned by M3)
  - `js/components.js` (Owned by M1, M3)
  - `js/tracking.js` (Owned by M2)
- `tests/` (Owned exclusively by E2E Testing Track)
  - `run-tests.mjs`: Test suite runner
  - `tier1-syntax-html.test.mjs`: Tier 1 Syntax & HTML validation tests
  - `tier2-dom-elements.test.mjs`: Tier 2 DOM ID & Modal integrity tests
  - `tier3-business-logic.test.mjs`: Tier 3 Logic & Calculation unit tests
  - `tier4-mpa-journeys.test.mjs`: Tier 4 End-to-end MPA workflows
