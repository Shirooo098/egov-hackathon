# Issue #001: Add `react-router-dom` for Hospital Dashboard routing

> **Priority:** High  
> **Status:** Completed  
> **Decision Ref:** [grilling-decisions.md — Decision 8](../research/grilling-decisions.md)  
> **Created:** 2026-07-29

---

## Problem

The app currently has no client-side routing. The entire Donor/Recipient flow lives in a single `App.jsx` state machine (660+ lines). The new Hospital Dashboard needs its own entry point at `/hospital-dashboard`, directly bookmarkable by demo judges.

Cramming it into the existing state machine would bloat `App.jsx` further and couple unrelated concerns.

## Solution

Add `react-router-dom` with a **minimal 2-route** setup:

| Route | Component | Notes |
|---|---|---|
| `/` | `<App />` (current state machine) | Preserves all existing Donor/Recipient onboarding + dashboard behavior |
| `/hospital-dashboard` | `<HospitalDashboard />` | No auth, directly accessible by URL |

## Implementation Steps

- [x] `npm install react-router-dom` in `client/`
- [x] Wrap app in `<BrowserRouter>` in `main.jsx`
- [x] Define `<Routes>` with the 2 routes above
- [x] Extract current `App.jsx` content into a route-able component (or keep as `/` default)
- [x] Create `HospitalDashboard.jsx` page shell (replacing `DoctorConsole.jsx`)
- [x] Add navigation link/button in `Navbar.jsx` for Hospital Dashboard (optional — judges can also use URL directly)
- [x] Verify Vite dev server handles client-side routing (may need `historyApiFallback` or Vite equivalent)

## Acceptance Criteria

1. Navigating to `/` loads the existing Donor/Recipient onboarding flow — zero regression
2. Navigating to `/hospital-dashboard` loads the Hospital Dashboard directly
3. No authentication required for either route (demo app)
4. Browser back/forward buttons work correctly between the two routes
