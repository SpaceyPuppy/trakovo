# Task Brief: /book App Redesign — Native Mobile Experience

> **Context:** This spec is for Claude Code. Read `CLAUDE.md` at repo root first — it's the source of truth for current state. This task is a redesign of the public `/book` route into a native-app-feel mobile experience with a new ride-type picker, a taxi booking flow, and integration with the existing hire booking flow.
>
> **Companion spec:** `service-features-spec.md` covers the feature toggle system (ratings, share trip, etc.) that this app consumes. Implement that first or in parallel — this spec references `useServiceFeatures()` from it.

---

## Summary

Redesign `/book` from its current vehicle-hire-only flow into a multi-service launcher. The landing screen is a 4-pane "Choose your ride" picker. Two panes route to the **existing** hire booking flow. One is a **coming soon** placeholder (Rideshare). The fourth is a **new Taxi flow** — an Uber-style map → destination → confirm → ride → complete experience.

The entire app should feel like a native mobile app: smooth transitions, bottom sheets, tactile button depth, and a contained mobile viewport when accessed from desktop. It is primarily a mobile experience (QR code scan from CKB marketing materials) but must degrade gracefully on desktop.

---

## 1. App Shell & Splash Screen

### Splash (`/book` — initial load)

Full-screen dark splash (`#1e2330`) shown while the app initialises. Contents:

- CKB logo mark: 64×64px rounded-rect, `#d4570a` background, white "CKB" text in Syne 800
- "Passenger Transport" subtitle below in Syne 700, `rgba(255,255,255,0.8)`
- Spinner: 22px circle, 2px border, `rgba(255,255,255,0.1)` track, `#d4570a` spinning segment
- Glow shadow on the logo mark: `box-shadow: 0 4px 16px rgba(212,87,10,0.4)`

Auto-transition to the ride picker after data has loaded (or a minimum 1.5s to avoid flash). Use `opacity` + `transform` transition, not hard cuts.

### App Shell (persistent)

When viewed on desktop, contain the entire app in a phone-frame viewport (max-width ~390px, centred). On mobile, go full-screen edge-to-edge.

Status bar area (top 50px) should show time and signal indicators as visual dressing on desktop, and be transparent/hidden on real mobile (the real status bar is there).

Home indicator bar at the bottom (100×4px pill, rounded, subtle) as visual dressing.

### Navigation Pattern

This is a **stack navigator** — screens push on top of each other. Back buttons return to the previous screen. No tab bar, no hamburger menu. The ride picker is the root screen.

Transitions between screens: 200ms ease, slide-left for forward navigation, slide-right for back. Use CSS transitions or Framer Motion — check what's already in the project. If nothing, CSS transitions are fine to keep the bundle lean.

---

## 2. Screen 1: Ride Picker ("Choose your ride")

This is the home screen after splash. Route: `/book` (replaces current landing).

### Layout

```
┌──────────────────────────────┐
│ Good morning                 │  ← greeting (time-based)
│ Choose your ride             │  ← Syne 700, 19px
├──────────────────────────────┤
│ ┌────────┐  ┌────────┐      │
│ │  TAXI  │  │RIDESHRE│      │  ← 2×2 grid, equal-height
│ │        │  │ (soon) │      │     flexible cards
│ └────────┘  └────────┘      │
│ ┌────────┐  ┌────────┐      │
│ │SELF-DRV│  │CHAUFFRD│      │
│ │  HIRE  │  │        │      │
│ └────────┘  └────────┘      │
├──────────────────────────────┤
│ [CKB logo] CKB Passenger    │  ← footer branding
│            Cohuna & surrounds│
└──────────────────────────────┘
```

### Card Design (critical — this is the hero element)

Each card is a large touch target filling its grid cell. They need **depth and tactile feel** like a native app — not flat web buttons.

**Taxi card (primary, dark):**
- Background: `linear-gradient(160deg, #262d40 0%, #1a2030 50%, #1e2636 100%)`
- Border: `1px solid rgba(255,255,255,0.06)`
- Box shadow: `0 2px 4px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)`
- Subtle radial gradient overlay: `radial-gradient(circle at 30% 20%, rgba(212,87,10,0.08), transparent 60%)`
- Icon container: 48×48px, rounded-14px, gradient fill from accent at 22% to accent at 10% opacity, 1px accent border at 15% opacity, own shadow `0 2px 8px rgba(212,87,10,0.12)`
- Text: Syne 700, 13px, `rgba(255,255,255,0.92)` for name, 10px `rgba(255,255,255,0.38)` for subtitle
- Active/pressed state: `transform: scale(0.96)`, shadow collapses

**Self-Drive and Chauffeured cards (light):**
- Background: `var(--color-background-primary)` (or `#ffffff`)
- Border: `1px solid var(--border)` (project token `#e2e0db`)
- Box shadow: `0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)`
- Subtle radial glow from each card's accent colour at ~5% opacity
- Icon containers: same 48×48 pattern, but using each card's own accent (green `#1D9E75` for self-drive, purple `#6B62C7` for chauffeured)
- Active state: same scale-down pattern

**Rideshare card (disabled):**
- Same as light cards but with `opacity: 0.65` on the entire card
- "SOON" badge in top-right: `background: linear-gradient(135deg, #faeeda, #fac775)`, colour `#854F0B`, 8px font, bold, `box-shadow: 0 1px 3px rgba(186,117,23,0.15)`

**All cards:** `border-radius: 16px`, centred content (icon → name → subtitle, vertical stack, 8px gap).

### SVG Icons

Use inline SVGs, not emoji, not icon fonts. Consistent 22×22 viewBox, stroke-width 2, `stroke-linecap: round`. Colours from each card's accent.

- Taxi: car icon (roof light, two wheels, divider line)
- Rideshare: van/minibus icon
- Self-drive hire: key card / licence icon
- Chauffeured: person with checkmark icon

### Greeting Logic

Time-based greeting in the subtitle above "Choose your ride":
- 5am–12pm: "Good morning"
- 12pm–5pm: "Good afternoon"
- 5pm–9pm: "Good evening"
- 9pm–5am: "Good evening"

### Navigation

- **Taxi** → pushes to Taxi Map screen (Screen 2)
- **Rideshare** → pushes to Coming Soon placeholder screen
- **Self-Drive Hire** → routes to the **existing** `/book` hire flow (the current vehicle grid → detail → booking panel). This should be preserved as a sub-route like `/book/hire` or rendered as a child view within the new app shell
- **Chauffeured** → routes to the **same existing hire flow**, possibly with `?mode=chauffeured` preset or similar to pre-filter

### Footer Branding

- CKB circle logo (30×30, `#d4570a` background, white "CKB" in Syne 800 9px)
- "CKB Passenger Transport" + "Cohuna & surrounds" text beside it
- Logo has subtle shadow: `0 2px 6px rgba(212,87,10,0.25)`

---

## 3. Screen 2: Taxi — Map Home

Full-screen map with overlay controls. This is the "idle" state before the user has picked a destination.

### Map

Use a real map if feasible (Mapbox GL JS, Google Maps, or Leaflet with OSM tiles). If map integration is deferred/out of budget, use a **styled SVG placeholder** that looks like a real map — grid lines representing streets, building footprint rectangles, street name labels ("Murray St", "King George St"). The placeholder should still look polished and intentional, not like a wireframe.

The map should be centred on the user's location (or Cohuna town centre as default: `-35.8729, 144.3194`).

### User Location Pin

- 16px circle, `#d4570a`, 3px white border
- `box-shadow: 0 2px 8px rgba(212,87,10,0.4), 0 0 0 2px rgba(212,87,10,0.15)`
- Concentric pulse rings around the pin (two rings at different sizes/opacities) to indicate "you are here"

### Nearby Drivers (visual only, data not real yet)

2–3 small car markers scattered on the map at different opacities (0.45–0.6) to give the feel of an active network. These are decorative for now — placeholder data.

- 20×20px dark circles (`#1e2330`), white border, white car SVG icon inside
- Varying opacity to suggest distance

### Floating Controls

**Back button:** top-left, 32px circle, white background, subtle shadow, left-arrow SVG. Goes back to ride picker.

**"Where to?" search bar:** below the back button, full-width with horizontal padding. White background, rounded-14px, subtle shadow, search icon + "Where to?" placeholder text. Tapping it pushes to the Destination screen (Screen 3).

### Bottom Sheet

Pulled up from the bottom with a drag handle (32×3.5px pill, `border-secondary` colour). Contains:

**Saved Places section:**
- "SAVED PLACES" label (9px, 600 weight, 0.08em tracking, secondary colour)
- Two horizontal cards: "Home" and "Work", each with:
  - 28×28 rounded-8px icon container with gradient fill from the place's accent colour
  - Place name (11px, 500 weight) and address (9px, secondary)
  - Border, subtle inset highlight, micro-shadow for depth
  - Tapping either goes to the Destination screen with that place pre-filled

**Recent section:**
- "RECENT" label (same style)
- List items: 30×30 rounded-8px icon container (clock icon), destination name + address, right chevron
- Tapping a recent destination goes directly to the Confirm screen (Screen 4) with that destination pre-selected

---

## 4. Screen 3: Taxi — Set Destination

Standard ride-hailing destination picker. Stack navigator — back button returns to Map Home.

### Header

Back button (30px circle, secondary background) + "Set destination" in Syne 700, 15px.

### Pickup / Drop-off Fields

Vertical pair connected by a line:

- Left rail: orange circle (10px, pickup) → gradient connecting line (orange → neutral → dark) → dark square (10px, dropoff)
- Pickup field: secondary background, rounded-10px, 0.5px border. Shows "Current location" in 500 weight
- Drop-off field: primary background, rounded-10px, **1.5px `#d4570a` border** with glow ring `box-shadow: 0 0 0 3px rgba(212,87,10,0.08)`. Search icon on right. This is the active/focused field

A horizontal divider separates the input area from the results list.

### Recent Destinations List

- "RECENT DESTINATIONS" section header (9px, 600 weight, caps, tracking)
- Each item: 30×30 rounded-8px icon container (clock icon, secondary bg, 0.5px border) → destination name (12px, 500) + address (10px, secondary) → right chevron (12px, 0.35 opacity)
- Items separated by 0.5px border-tertiary
- Tapping a destination goes to Confirm Ride screen (Screen 4)

### Future: Live Search

When address search is wired up, this field should hit a geocoding API (Google Places Autocomplete or Mapbox) and show live results. For MVP, the recent destinations list is sufficient. Structure the component so the search input can be wired to an API later without restructuring.

---

## 5. Screen 4: Taxi — Confirm Ride

Split screen: map on top showing the route, bottom sheet with ride details.

### Map Area

- Shows pickup pin (orange circle) and destination pin (dark square)
- Dashed route line between them: `stroke: #d4570a`, `stroke-width: 3.5`, `stroke-dasharray: 6,5`, `opacity: 0.8`
- Route glow: same path but `stroke-width: 8`, `opacity: 0.06` (ambient glow behind the dashes)

### Bottom Sheet (rounded top corners, shadow upward)

**Drag handle** at top (32×3.5px pill).

**Destination & Fare row:**
- Left: destination name (Syne 700, 14px) + distance/ETA (10px, secondary)
- Right: fare chip — secondary background, rounded-10px, 0.5px border, padding 6px 12px. Fare in Syne 700 18px, "est. fare" in 8px below

**Driver card:**
- Secondary background, rounded-12px, 0.5px border
- Driver avatar: 36×36 circle, dark gradient background, white initials (11px, 600 weight), own shadow
- Driver name (12px, 500) with inline rating pill beside it: `rgba(212,87,10,0.08)` background, star SVG + "4.8" in 10px accent colour
- Vehicle details below: "White Toyota Camry · ABC-123" in 10px secondary
- Phone button on the right edge: 32×32 rounded-10px, primary background, 0.5px border, phone SVG icon

**Action buttons:**
- Cancel: flex-1, primary background, 1px border-secondary, rounded-12px, 12px text. Depth styling: `inset 0 1px 0 rgba(255,255,255,0.5)`, micro-shadow
- Confirm ride: flex-2, dark gradient `linear-gradient(180deg, #252c3e, #1a2030)`, 1px `rgba(255,255,255,0.06)` border, white text 600 weight. Shadow: `0 2px 4px rgba(0,0,0,0.15), 0 6px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)`

All buttons: active state `transform: scale(0.97)`.

---

## 6. Screen 5: Taxi — Ride in Progress

Split screen: map tracking the driver, bottom sheet with driver info and actions.

### Map Area

- Destination pin at top of map
- Car marker moving along the route: 30×30 dark circle, white border, white car SVG, `box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(30,35,48,0.1)`
- Route line: solid (not dashed), `#d4570a`, stroke-width 4, with ambient glow (stroke-width 12, opacity 0.04)

**ETA chip** floating top-left on the map:
- White background, rounded-14px, padding 10px 14px
- Shadow: `0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)`, 0.5px border
- "Arriving in" (9px, secondary, 500 weight) above the time
- Time display: large number (Syne 700, 22px) + "min" unit (11px, secondary, 500 weight) on the same baseline

### Bottom Sheet

**Drag handle.**

**Progress bar:** full-width, 3px tall, secondary background, with a gradient-filled portion showing trip completion (`linear-gradient(90deg, #d4570a, #e87a3a)`).

**Driver info row:** Same avatar + name + vehicle as confirm screen, but text says "Barry is on the way" (12px, 500).

**Action buttons (3-wide):**
- Call: flex-1, same light depth-button styling, phone icon + "Call" text
- Msg: flex-1, same styling, chat bubble icon + "Msg" text
- Share trip: flex-1.3, accent gradient `linear-gradient(180deg, #e06520, #c4540e)`, white text. Shadow: `0 2px 4px rgba(212,87,10,0.2), 0 6px 14px rgba(212,87,10,0.12), inset 0 1px 0 rgba(255,255,255,0.15)`

**Feature flag:** The "Share trip" button is **conditionally rendered** based on `useServiceFeatures('taxi').share_trip`. If disabled, show only Call + Msg (flex-1 each).

---

## 7. Screen 6: Taxi — Trip Complete

Full-screen (no map), centred content. Shown after the ride ends.

### Success State

- Check circle: 60×60, gradient green background `linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.06))`, 1px green border at 0.1 opacity, green checkmark SVG inside
- "Trip complete" heading (Syne 700, 18px)
- Destination name below (11px, secondary)

### Trip Summary Card

White card, rounded-14px, 0.5px border, micro-shadow.

**Stats row** (top of card, horizontal, separated by 0.5px vertical dividers):
- Distance: label (9px, secondary) + value (13px, 500)
- Duration: same layout
- Total fare: label (9px) + value (Syne 700, 16px) — the prominent number

Separated by a 0.5px border from:

**Driver row** (bottom of card):
- Avatar (32px circle, dark gradient, initials)
- Driver name (11px, 500) + vehicle name (9px, secondary)
- Interactive star rating: 5 stars, 22×22 each, tap to set rating. Filled stars use `#d4570a`, unfilled use `border-tertiary` colour. Tapping a star fills it and all stars before it.

### Comment Field

**Feature flag:** Only rendered when `useServiceFeatures('taxi').rating` is enabled. The rating stars in the driver row above are also gated on this flag.

Textarea: secondary background, 0.5px border, rounded-10px, placeholder "Leave a comment for Barry...", 11px font, 48px height, no resize.

**Gated on** `useServiceFeatures('taxi').rating_comment` — only shows if both `rating` AND `rating_comment` are enabled.

### Submit Button

"Submit & done" (if rating is enabled) or just "Done" (if rating is disabled).

Dark gradient button, full width. Same depth styling as the Confirm ride button. Returns to the Ride Picker.

If rating is enabled, this button submits to `POST /api/booking/[id]/rating` with `{ stars, comment? }` before navigating back.

---

## 8. Placeholder Screens

### Coming Soon (Rideshare)

Centred layout:
- 56×56 circle, warning background, clock SVG icon in warning colour
- "Coming soon" (Syne 700, 16px)
- "Rideshare is in development.\nCheck back soon!" (12px, secondary, centred)
- Back button: light depth-button, "← Back to ride picker"

### Hire Flow Handoff (Self-Drive / Chauffeured)

When the user taps Self-Drive Hire or Chauffeured, they should enter the **existing** hire booking flow. Implementation options (choose the cleanest based on current code):

**Option A — Sub-route:** Move existing `/book` pages to `/book/hire/` and mount the new ride picker at `/book`. The hire flow keeps its own internal navigation (vehicle grid → detail → booking panel → confirmation).

**Option B — State-based:** Keep everything at `/book` and use a top-level state machine: `mode = 'picker' | 'hire' | 'taxi' | 'rideshare'`. When mode is `'hire'`, render the existing hire components. When `'taxi'`, render the taxi flow.

**Option C — Wrapper:** Wrap the existing hire flow as a child component of the new app shell. The ride picker is the parent; selecting hire renders the existing flow inside the same viewport, with a way to get back to the picker.

Whichever option is chosen: the existing hire flow must continue to work exactly as it does now. Do not break or refactor the existing booking components — just re-parent them.

---

## 9. Routing & URL Structure

```
/book                    → Splash → Ride Picker
/book/taxi               → Taxi Map Home
/book/taxi/destination   → Destination Picker
/book/taxi/confirm       → Confirm Ride
/book/taxi/ride          → Ride in Progress
/book/taxi/complete      → Trip Complete
/book/hire               → Existing hire flow (vehicle grid)
/book/hire/[slug]        → Existing vehicle detail + booking panel
/book/rideshare          → Coming Soon placeholder
/book/confirmation       → Existing booking confirmation (shared)
```

These can be actual Next.js routes OR virtual routes managed by client-side state — whatever keeps the existing hire flow intact with least disruption.

If using client-side state, still update `window.history` so the browser back button works naturally and URLs are shareable/bookmarkable.

---

## 10. Design System & Polish

### Typography

- **Display / headings:** Syne (already in the project), weights 700–800
- **Body:** Epilogue (already in the project), weights 400–500
- Font sizes should feel native-app scale: slightly larger than web convention, generous line-height

### Colour Tokens

Use the existing project tokens from the CSS variables (`--accent`, `--slate`, `--ink`, etc.):
- Primary accent: `#d4570a` (CKB orange)
- Dark surface: `#1e2330` (slate)
- Backgrounds/borders: existing `--bg`, `--border`, `--white` tokens
- Service accents: green `#1D9E75` (self-drive), purple `#6B62C7` (chauffeured), amber/warning for rideshare coming-soon

### Button Depth System

Every tappable element in the app should have tactile depth. This is the core visual differentiator from the current flat web design.

**Primary buttons (dark):**
```css
background: linear-gradient(180deg, #252c3e 0%, #1a2030 100%);
border: 1px solid rgba(255,255,255,0.06);
box-shadow: 0 2px 4px rgba(0,0,0,0.15),
            0 6px 16px rgba(0,0,0,0.1),
            inset 0 1px 0 rgba(255,255,255,0.08);
```

**Accent buttons (orange):**
```css
background: linear-gradient(180deg, #e06520 0%, #c4540e 100%);
border: 1px solid rgba(255,255,255,0.1);
box-shadow: 0 2px 4px rgba(212,87,10,0.2),
            0 6px 14px rgba(212,87,10,0.12),
            inset 0 1px 0 rgba(255,255,255,0.15);
```

**Secondary buttons (light):**
```css
background: var(--white);
border: 1px solid var(--border);
box-shadow: 0 1px 2px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.5);
```

**All buttons on press:**
```css
transform: scale(0.97);
box-shadow: /* collapsed shadow - less spread, less offset */;
transition: transform 0.12s, box-shadow 0.12s;
```

### Bottom Sheets

Every overlay bottom sheet (map screens) has:
- Rounded top corners: `border-radius: 18px 18px 0 0`
- Upward shadow: `box-shadow: 0 -4px 20px rgba(0,0,0,0.05)`
- Drag handle: 32×3.5px pill, centred, `border-secondary` colour
- `0.5px` top border (`border-tertiary`)

### Cards & Containers

- Border radius: 12–14px for cards, 10px for inner elements, 8px for icon containers
- Borders: 0.5px `border-tertiary` (default), 1px `border-secondary` (emphasis)
- Icon containers: always have their own gradient fill, subtle border, and micro-shadow to feel like raised tokens

### Transitions

- Screen changes: 200ms ease, opacity + translateX (20px)
- Button presses: 120ms, scale
- Bottom sheet reveal: 250ms, translateY from below
- Splash → Picker: 300ms, opacity fade

---

## 11. Desktop Viewport

When the viewport is wider than 430px, contain the app in a centred phone frame:

- Max-width: 390px for the content area
- Dark aluminium bezel around it (8px border-radius 42px, gradient dark background)
- Side buttons (volume, power) as visual details
- Dynamic island notch at top (90×24px, black, centred)
- Home indicator bar at bottom

This is purely cosmetic for desktop preview — on mobile, the app goes edge-to-edge and none of this is rendered.

---

## 12. Data Layer — Taxi

### For MVP (no live driver network)

The taxi flow is a **booking request**, not a real-time dispatch. When the user "confirms a ride", it creates a booking record with `service_type: 'taxi'` and `hire_type: 'chauffeured'` — the same as the existing vendor taxi booking flow.

Use the existing `POST /api/booking` endpoint (or `POST /api/vendor/bookings` adapted for public use). The driver assignment, ETA, and fare are **presentational placeholders** in MVP:

- Driver name, vehicle, rego: hardcoded or pulled from a pool of active drivers
- Fare: calculated from a simple distance × rate formula, or hardcoded per-zone
- ETA: hardcoded (e.g. "4 min")

The "Ride in Progress" screen is a **simulated experience** for MVP — it doesn't need real WebSocket tracking. Show the driver card and ETA, with a "Complete ride" action that marks the booking as completed and transitions to the Trip Complete screen.

### Future (live dispatch)

The component architecture should support swapping in real data later:
- Driver data from an API response after booking creation
- Live location from WebSocket or polling
- Dynamic fare from a metering/calculation service
- Real ETA from a routing API

Structure components with clear props interfaces so the data source can change without UI restructuring.

---

## 13. What NOT to Change

- **Existing hire flow** — vehicle grid, detail page, booking panel, calendar, form validation, confirmation page. Do not refactor these. Re-parent them under the new routing structure but leave the components intact.
- **Admin portal** — untouched by this task.
- **Vendor portal** — untouched.
- **Driver portal** — untouched.
- **API routes** — don't break existing endpoints. New taxi endpoints can be added.
- **Database schema** — only add, don't modify existing tables. (The `ServiceFeature` and `TripRating` tables from the companion spec are the only DB additions.)

---

## 14. Implementation Order

1. **App shell + splash** — new `/book` layout with splash screen and transition
2. **Ride picker** — 4-pane grid with full button polish, greeting logic, branding footer
3. **Hire flow integration** — existing flow mounted at `/book/hire` (or equivalent), navigable from picker
4. **Coming soon screen** — rideshare placeholder
5. **Taxi map home** — map (placeholder or real), search bar, saved places, recent, bottom sheet
6. **Taxi destination picker** — pickup/dropoff fields, recent list, search architecture
7. **Taxi confirm ride** — route preview, fare, driver card, confirm/cancel
8. **Taxi ride in progress** — tracking view, progress bar, call/msg/share actions
9. **Taxi trip complete** — summary, conditional rating (from service features), done action
10. **Desktop phone frame** — responsive container for wide viewports
11. **Feature flag integration** — wire `useServiceFeatures()` into conditional rendering
12. **Polish pass** — transitions, active states, loading states, error handling

---

## 15. Testing Checklist

- [ ] Splash displays CKB logo + spinner, auto-transitions to picker
- [ ] Greeting changes based on time of day
- [ ] Taxi card navigates to map screen
- [ ] Self-Drive and Chauffeured cards navigate to existing hire flow
- [ ] Rideshare card shows Coming Soon screen
- [ ] All existing hire flow functionality works unchanged (vehicle browse, detail, book, confirm)
- [ ] Taxi flow: map → destination → confirm → ride → complete is navigable end-to-end
- [ ] Back navigation works on every screen (button + browser back)
- [ ] All buttons have depth styling and press feedback
- [ ] Bottom sheets have drag handles, rounded corners, upward shadows
- [ ] Rating component only appears when `rating` feature flag is enabled for taxi
- [ ] Comment textarea only appears when `rating_comment` feature flag is enabled
- [ ] Share trip button only appears when `share_trip` feature flag is enabled
- [ ] Desktop viewport shows phone frame container
- [ ] Mobile viewport is edge-to-edge, no phone frame
- [ ] No regressions to admin, vendor, or driver portals
- [ ] Booking submission from taxi flow creates a valid booking record
