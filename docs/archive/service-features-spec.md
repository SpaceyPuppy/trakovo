# Archived Task Brief: Service Feature Toggles & Rating Infrastructure

> Historical implementation brief. Do not treat its SQL or implementation sequence as a
> current migration. See `../ARCHITECTURE.md`, `../PRODUCT-STATUS.md`, and the root
> `PENDING-DEPLOY.md` for current guidance.

> **Context:** This spec is for Claude Code. Read `CLAUDE.md` at repo root first — it's the source of truth for current state. This task adds a feature-flag system for service-level UI components (ratings, comments, share-trip, etc.) controlled from the admin dispatch settings.

---

## Summary

Build the infrastructure for per-service-type feature toggles, controlled from a new "Dispatch" section in the admin settings panel. The immediate use case is a **post-trip rating & comment system** — designed and ready to render, but **shipped disabled by default** for Taxi. Rideshare will use it when that service goes live.

This is infrastructure-first: build the toggle system, the admin UI, the data layer, and the frontend conditional rendering. The rating component itself is included but behind the flag.

---

## 1. Database: `ServiceFeature` table

Add a new MySQL table. Use the same migration pattern as existing tables (raw SQL via `prisma/migrations/` or `init.sql` depending on current approach — check `CLAUDE.md`).

```sql
CREATE TABLE ServiceFeature (
  id          VARCHAR(36) PRIMARY KEY,
  service_type VARCHAR(32) NOT NULL,        -- 'taxi', 'rideshare', 'self_drive', 'chauffeured'
  feature_key  VARCHAR(64) NOT NULL,         -- e.g. 'rating', 'rating_comment', 'share_trip', 'live_tracking'
  is_enabled   BOOLEAN NOT NULL DEFAULT 0,
  config       JSON DEFAULT NULL,            -- future: { min_stars: 1, max_stars: 5, mandatory: false }
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_feature (service_type, feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Seed data (all disabled by default)

```sql
INSERT INTO ServiceFeature (id, service_type, feature_key, is_enabled, config) VALUES
-- Taxi features
(UUID(), 'taxi', 'rating',          0, '{"max_stars":5,"mandatory":false}'),
(UUID(), 'taxi', 'rating_comment',  0, '{"max_length":500}'),
(UUID(), 'taxi', 'share_trip',      0, NULL),
(UUID(), 'taxi', 'live_tracking',   0, NULL),
-- Rideshare features (pre-seeded for when it launches)
(UUID(), 'rideshare', 'rating',          0, '{"max_stars":5,"mandatory":true}'),
(UUID(), 'rideshare', 'rating_comment',  0, '{"max_length":500}'),
(UUID(), 'rideshare', 'share_trip',      0, NULL),
(UUID(), 'rideshare', 'live_tracking',   0, NULL),
-- Hire features (minimal — expand later)
(UUID(), 'self_drive',   'rating',  0, '{"max_stars":5,"mandatory":false}'),
(UUID(), 'chauffeured',  'rating',  0, '{"max_stars":5,"mandatory":false}');
```

Use the project's existing `newId()` helper instead of `UUID()` if that's the pattern — check `CLAUDE.md`.

---

## 2. API Routes

### `GET /api/admin/service-features`

Returns all features grouped by service type. Admin-authenticated.

```ts
// Response shape
{
  features: {
    taxi: [
      { id, feature_key: 'rating', is_enabled: false, config: { max_stars: 5, mandatory: false } },
      { id, feature_key: 'rating_comment', is_enabled: false, config: { max_length: 500 } },
      ...
    ],
    rideshare: [ ... ],
    self_drive: [ ... ],
    chauffeured: [ ... ]
  }
}
```

### `PATCH /api/admin/service-features/[id]`

Toggle a single feature or update its config. Admin-authenticated.

```ts
// Request body
{ is_enabled?: boolean, config?: Record<string, unknown> }
```

### `GET /api/service-features?service_type=taxi`

**Public endpoint** (no auth). Returns only enabled features for the given service type. This is what the customer-facing app reads.

```ts
// Response shape
{
  features: {
    rating: { enabled: true, config: { max_stars: 5, mandatory: false } },
    share_trip: { enabled: true, config: null },
    // only enabled features returned
  }
}
```

Cache-friendly: add `Cache-Control: public, max-age=60` header so it's not hammered on every page load.

---

## 3. Admin UI: Dispatch Settings

### Location

Add a new tab or section to `/admin/settings`. Could be:
- A new "Dispatch" tab in the existing settings layout, OR
- A new sidebar item under settings if that fits better

Check the current `AdminSidebar.tsx` and `src/app/admin/settings/` structure in `CLAUDE.md` to decide.

### Design

Follow the existing admin UI patterns exactly (the toggle cards in `VendorDetailTabs.tsx` are a good reference for the toggle + description pattern).

```
┌─────────────────────────────────────────────────┐
│ Dispatch Settings                                │
│ Configure service-level features for each         │
│ transport type.                                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  ── Taxi ──────────────────────────────────────  │
│                                                   │
│  ┌──────────────────────────────────┐  ┌─────┐  │
│  │ Post-trip rating                 │  │ OFF │  │
│  │ Passengers rate their driver     │  └─────┘  │
│  │ after a completed trip.          │            │
│  └──────────────────────────────────┘            │
│                                                   │
│  ┌──────────────────────────────────┐  ┌─────┐  │
│  │ Rating comment                   │  │ OFF │  │
│  │ Text feedback with the star      │  └─────┘  │
│  │ rating. Requires rating.         │            │
│  └──────────────────────────────────┘            │
│                                                   │
│  ┌──────────────────────────────────┐  ┌─────┐  │
│  │ Share trip                       │  │ OFF │  │
│  │ Passengers can share live trip   │  └─────┘  │
│  │ status with contacts.            │            │
│  └──────────────────────────────────┘            │
│                                                   │
│  ── Rideshare ─────────────────────────────────  │
│  (same cards, independent toggles)               │
│                                                   │
│  ── Self-Drive Hire ───────────────────────────  │
│  ── Chauffeured Hire ──────────────────────────  │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Behaviour

- Toggles save immediately on click (PATCH to API, flash confirmation like existing vendor toggles)
- `rating_comment` should be visually greyed out / disabled if `rating` is OFF for that service type (dependent feature)
- Group by service type with clear section headers
- Show a subtle "(coming soon)" label next to the Rideshare header since that service isn't live yet

---

## 4. Frontend Hook: `useServiceFeatures`

Create a hook (or server-side utility for RSC) that the customer-facing booking app consumes.

```ts
// src/lib/hooks/useServiceFeatures.ts
// or src/lib/service-features.ts for server components

type FeatureFlags = {
  rating: boolean
  rating_comment: boolean
  share_trip: boolean
  live_tracking: boolean
}

// Client hook
function useServiceFeatures(serviceType: string): FeatureFlags

// Server fetch
async function getServiceFeatures(serviceType: string): Promise<FeatureFlags>
```

This reads from `GET /api/service-features?service_type=xxx` and returns a flat boolean map. Default all to `false` if the fetch fails (fail closed).

---

## 5. Rating Component (Built but Disabled)

Build the actual component so it's ready to switch on. Place it at:

```
src/components/booking/TripRating.tsx
```

### Props

```ts
interface TripRatingProps {
  bookingId: string
  driverName: string
  driverInitials: string
  vehicleName: string
  maxStars?: number        // from feature config, default 5
  showComment?: boolean    // from rating_comment feature flag
  commentMaxLength?: number // from feature config, default 500
  onSubmit: (rating: { stars: number, comment?: string }) => void
}
```

### Design reference

Use the trip-complete screen from the mockup (this conversation) as the design reference:
- Inline star rating (tap to fill, not separate buttons)
- Driver card with initials avatar
- Optional textarea for comment
- "Submit & done" button
- Stars use the CKB accent colour (#d4570a) when filled

### Data storage

Add a `TripRating` table for when ratings are submitted:

```sql
CREATE TABLE TripRating (
  id          VARCHAR(36) PRIMARY KEY,
  booking_id  VARCHAR(36) NOT NULL,
  stars       TINYINT NOT NULL,
  comment     TEXT DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES Booking(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

API endpoint: `POST /api/booking/[id]/rating` — accepts `{ stars, comment? }`, validates the booking exists and hasn't already been rated.

---

## 6. Conditional Rendering Pattern

Wherever a feature-flagged component appears in the customer flow, wrap it:

```tsx
// Example: trip completion screen
const features = useServiceFeatures('taxi')

return (
  <div>
    <TripSummaryCard ... />
    
    {features.rating && (
      <TripRating
        bookingId={booking.id}
        driverName={booking.driver_name}
        driverInitials={initials(booking.driver_name)}
        vehicleName={booking.vehicle_name}
        showComment={features.rating_comment}
        onSubmit={handleRatingSubmit}
      />
    )}
    
    {features.share_trip && (
      <ShareTripButton bookingId={booking.id} />
    )}
  </div>
)
```

The key principle: **components exist in the codebase, imports exist, but they render nothing when the flag is off.** No dead code removal — the code ships, it just doesn't execute.

---

## 7. Implementation Order

1. Database migration — `ServiceFeature` + `TripRating` tables + seed data
2. API routes — admin CRUD + public read endpoint
3. Admin UI — dispatch settings with toggle cards
4. `useServiceFeatures` hook / server utility
5. `TripRating` component + `POST /api/booking/[id]/rating` endpoint
6. Wire conditional rendering into the booking completion flow

---

## 8. Out of Scope (for now)

- Admin view of submitted ratings (build when ratings are switched on)
- Rating aggregation / driver score calculation
- Push notification to driver when rated
- Rideshare service implementation
- Live tracking infrastructure
- Share trip deep-link generation

---

## 9. Testing Checklist

- [ ] All features default to OFF after migration + seed
- [ ] Toggling a feature in admin immediately reflects on next public API call
- [ ] `rating_comment` toggle is disabled in admin when `rating` is OFF
- [ ] Customer app renders NO rating UI when flag is off (verify with taxi)
- [ ] Customer app renders full rating UI when flag is toggled on
- [ ] Rating submission works: valid star count saved, comment optional, duplicate submission blocked
- [ ] Public feature endpoint returns only enabled features (no data leak of disabled features)
- [ ] Feature fetch failure = all flags false (fail closed)
