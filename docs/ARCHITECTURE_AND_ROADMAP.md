# DM Tiles — Technical Architecture, Database Schema, API Plan & Implementation Roadmap

## 1. System Architecture

**DM Tiles — Building Measurement & Work Management System** follows a clean, decoupled client–server architecture optimized for mobile construction-site use and desktop architectural work.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Frontend (React + Vite)                        │
│  Pages ──► Components ──► Hooks (TanStack Query) ──► Services (Axios)   │
│    │             │                                                      │
│    ▼             ▼                                                      │
│  Context      React Konva (Floor Plan Canvas) / React Hook Form + Zod   │
│  (Auth/UI)    Calculation Preview Utilities (server-validated)          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTPS / JSON (/api/v1) + JWT Bearer
┌──────────────────────────────────▼──────────────────────────────────────┐
│                       Backend (Node.js + Express)                       │
│  Routes ──► Validators (Zod) ──► Middleware (Auth/RBAC/RateLimit/Multer)│
│                                       │                                 │
│                                       ▼                                 │
│  Controllers ──► Services (Domain, Calc, Billing, PDF) ──► Repositories │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ Parameterized SQL (pg pool + Tx)
┌──────────────────────────────────▼──────────────────────────────────────┐
│              PostgreSQL (Supabase) + Supabase Storage (S3/Bucket)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Principles
1. **Server-Side Source of Truth**: Frontend calculators provide instant real-time previews, while the backend independently validates and computes all areas, deductions, staircase totals, billing amounts, and payment balances inside PostgreSQL transactions.
2. **Modular Separation**:
   - **Backend**: `config/`, `db/migrations/`, `middleware/`, `validators/`, `repositories/`, `services/`, `controllers/`, `routes/`, `utils/`.
   - **Frontend**: `pages/`, `components/`, `context/`, `hooks/`, `services/`, `utils/`, `styles/`.
3. **Security First**:
   - Passwords hashed with `bcryptjs` (cost 12).
   - Short-lived JWT tokens signed with `JWT_SECRET` (never exposed to browser).
   - Building ownership and `building_permissions` enforced on every backend route.
   - All SQL queries use `$1, $2...` parameterized bindings via `pg`.
   - Rate limiting, Helmet security headers, strict CORS, and Multer file size/MIME checks.

---

## 2. PostgreSQL Database Schema

All tables use `UUID` primary keys (`gen_random_uuid()`), `TIMESTAMPTZ` timestamps, `NUMERIC` types for measurements/currency, and `JSONB` for floor drawings and audit snapshots.

### Core Tables (21 Tables)
1. `users` — Accounts (`ADMIN`, `STAFF`), bcrypt hashes, password reset token hashes.
2. `buildings` — Building master records, customer details, status (`DRAFT`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`), soft-delete (`is_deleted`), completion metadata.
3. `building_permissions` — Granular per-building staff permissions (`can_view_measurements`, `can_edit_measurements`, `can_update_progress`, `can_view_payments`, `can_manage_payments`).
4. `floors` — Unlimited floors per building with `floor_number`, `display_order`, soft-delete.
5. `room_types` — Seeded default room categories (Master Bedroom, Master Bathroom, Kitchen, Hall, Staircase, Elevation, Custom Area, etc.).
6. `rooms` — Unlimited rooms/areas per floor with `room_type_id`, `display_order`, soft-delete.
7. `work_types` — Seeded work categories (`FLOOR_TILES`, `WALL_TILES`, `SKIRTING`, `KITCHEN_GRANITE_PLATFORM`, `GRANITE_BACKSPLASH`, `GRANITE_STAIRCASE`, `WINDOW_SILL`, `DOOR_THRESHOLD`, `PARKING_TILES`, `ELEVATION_TILES`, `GRANITE_CLADDING`, `CUSTOM_WORK`) with default units & rates.
8. `measurements` — Stores input mode (`DIMENSIONS`, `DIRECT_AREA`, `SEGMENTS`), explicit unit mode (`FEET_INCHES`, `DECIMAL_FEET`, `INCHES`), normalized feet values, `gross_area`, `deduction_area`, `net_area`, `billable_quantity`, `surface_role`.
9. `measurement_segments` — Rectangular sub-sections for multi-segment measurements (e.g., L-shaped kitchen granite platforms).
10. `measurement_deductions` — Door/window/opening/cutout deductions validated not to exceed gross area.
11. `measurement_history` — Audit snapshots (`previous_data`, `new_data`) when measurements are modified.
12. `staircases` — Dedicated uniform or step-by-step staircase measurements (`tread_area_sqft`, `riser_area_sqft`, `landing_area_sqft`, `total_area_sqft`, `steps_data` JSONB).
13. `floor_drawings` — Konva floor-plan scene graphs stored as `JSONB` (`drawing_data`), scale (`scale_px_per_ft`), version counter.
14. `drawing_versions` — Version history snapshots of floor drawings.
15. `building_rates` — Per-building overrides for work-type rates.
16. `work_items` — Trackable installation items linked to rooms/measurements with status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD`, `CANCELLED`), rate, quantity, and amount.
17. `invoices` — Building bills with subtotal, additional charges, taxes, discounts, and `final_amount`.
18. `invoice_items` — Line items linking work items to invoices.
19. `payments` — Advance, partial, settlement, and refund transactions (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`, `OTHER`) with `SUCCESS` / `REVERSED` status.
20. `attachments` — Metadata for uploaded receipts, work progress photos, and completion photos stored in Supabase Storage.
21. `activity_logs` — Chronological audit trail powering the dashboard activity feed and building history.

---

## 3. Frontend Page Structure

```
/login, /register, /forgot-password, /reset-password   (Public Auth Pages)
/                                                       (Protected AppLayout)
 ├── /dashboard                     DashboardPage (KPIs, charts, building list, activity)
 ├── /buildings                     BuildingsPage (Search, filter, sort, create)
 ├── /buildings/:id                 BuildingDetailPage (Tabs: Overview, Floors, Measurements,
 │                                                      Drawings, Work Progress, Payments, Reports)
 ├── /buildings/:id/floors/:floorId FloorDetailPage (Rooms, quick measurements, duplicate floor)
 ├── /measurements                  MeasurementsPage (Cross-building measurement explorer & quick entry)
 ├── /drawings                      DrawingsPage (Select building/floor -> Launch React Konva Editor)
 ├── /drawings/:floorId             DrawingEditorPage (Full 6-mode architectural CAD-lite editor)
 ├── /work-progress                 WorkProgressPage (Kanban/list status tracking & completion %)
 ├── /payments                      PaymentsPage (Payment ledger, balances, recording payments)
 ├── /reports                       ReportsPage (PDF measurement, payment, completion reports + WhatsApp)
 └── /settings                      SettingsPage (Profile, password, default rates, PWA status)
```

---

## 4. Backend REST API Plan (`/api/v1`)

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- **Dashboard**: `GET /dashboard/summary`, `GET /dashboard/charts`, `GET /dashboard/activity`
- **Buildings**: `GET /buildings`, `POST /buildings`, `GET /buildings/:id`, `PATCH /buildings/:id`, `DELETE /buildings/:id`, `POST /buildings/:id/complete`, `POST /buildings/:id/reopen`
- **Floors**: `GET /buildings/:buildingId/floors`, `POST /buildings/:buildingId/floors`, `PATCH /floors/:id`, `DELETE /floors/:id`, `POST /floors/:id/duplicate`, `PATCH /buildings/:buildingId/floors/reorder`
- **Rooms & Room Types**: `GET /room-types`, `GET /floors/:floorId/rooms`, `POST /floors/:floorId/rooms`, `PATCH /rooms/:id`, `DELETE /rooms/:id`, `PATCH /floors/:floorId/rooms/reorder`
- **Work Types & Measurements**: `GET /work-types`, `GET /measurements`, `GET /rooms/:roomId/measurements`, `POST /rooms/:roomId/measurements`, `PATCH /measurements/:id`, `DELETE /measurements/:id`, `POST /measurements/:id/duplicate`, `GET /measurements/:id/history`
- **Segments & Deductions**: `POST /measurements/:id/segments`, `DELETE /measurement-segments/:id`, `POST /measurements/:id/deductions`, `DELETE /measurement-deductions/:id`
- **Staircases**: `GET /rooms/:roomId/staircases`, `POST /rooms/:roomId/staircases`, `PATCH /staircases/:id`, `DELETE /staircases/:id`
- **Drawings**: `GET /floors/:floorId/drawing`, `PUT /floors/:floorId/drawing`, `GET /floors/:floorId/drawing/versions`
- **Work Items & Rates**: `GET /buildings/:buildingId/rates`, `PUT /buildings/:buildingId/rates`, `GET /buildings/:buildingId/work-items`, `POST /buildings/:buildingId/work-items`, `PATCH /work-items/:id`, `DELETE /work-items/:id`
- **Invoices & Payments**: `GET /buildings/:buildingId/invoices`, `POST /buildings/:buildingId/invoices`, `PATCH /invoices/:id`, `GET /buildings/:buildingId/payments`, `POST /buildings/:buildingId/payments`, `PATCH /payments/:id`
- **Attachments & Reports**: `POST /attachments`, `DELETE /attachments/:id`, `GET /reports/buildings/:buildingId/measurement`, `GET /reports/buildings/:buildingId/payment`, `GET /reports/buildings/:buildingId/completion`

---

## 5. Step-by-Step Implementation Roadmap

1. **Phase 1 — Project Foundation**: Backend + Frontend scaffolding, PostgreSQL schema migrations & seed data, JWT auth + RBAC middleware, security baseline, shared desktop/mobile layout, auth pages, Settings page.
2. **Phase 2 — Building & Floor Management**: Full CRUD for buildings (soft delete, archive), floors (reorder, duplicate with rooms/measurements), and rooms (categories, reorder).
3. **Phase 3 — Measurement Engine**: Unit parser (`13'6"` vs `13.6` decimal ft), Dimensions/Direct/Segments modes, Deductions with validation, Bathroom & Kitchen workflows, Staircase calculator, measurement history, and unit tests.
4. **Phase 4 — Dashboard**: Real SQL aggregation APIs, KPI cards, searchable/sortable building list, area/payment/status charts, recent activity feed.
5. **Phase 5 — Work Progress, Rates, Billing & Payments**: Work items with quantity-weighted progress, per-building rates, server-side invoice totals, advance/partial/refund payments, overpayment/pending logic.
6. **Phase 6 — Realistic Architectural Drawing Editor**: React Konva floor plan editor with walls, doors with swing arcs, windows, stairs, fixtures, tile/granite textures, 6 view modes, measurement sync & mismatch warnings, JSONB save/restore, PNG/PDF export.
7. **Phase 7 — Reports & Building Completion**: Server-generated PDF measurement/payment/completion reports, CSV export, WhatsApp Web Share API / download fallback, Mark as Done & Reopen workflows.
8. **Phase 8 — Testing, Offline Queue & Production Readiness**: Comprehensive backend integration & frontend component tests, IndexedDB offline measurement queue, PWA service worker, performance & deployment checklist.

