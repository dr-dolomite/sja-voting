# Goal Description

The objective is to create a new, publicly accessible "Live Count" page. This page will allow anyone (students, teachers, stakeholders) to view the real-time election results without needing an admin or voter account. It should be visually distinct from the admin dashboard—designed to look like a modern, dynamic, public-facing presentation screen.

## Proposed Changes

We will create a new route, `app/live/page.tsx`, and a corresponding component, `components/live/live-results.tsx`. The data fetching strategy can reuse the existing `actions/results.ts` logic but must ensure no sensitive data (like voter LRNs) is exposed.

### 1. New Route: `app/live/page.tsx`

- **Path:** `/live` (completely unauthenticated).
- **Layout:** It should not use the admin sidebar or standard dashboard layout. It needs a clean, full-screen (or deeply immersive) layout suitable for projecting on a big screen or viewing on mobile devices.

### 2. Frontend Design: `components/live/live-results.tsx`

This will be a variant of the existing `ResultsDashboard` but tailored for a public audience. It should feature:

- **Hero Header:** A massive, premium header displaying the active election title.
- **"Live" Indicator:** A highly visible pulsing red dot and "LIVE" badge to emphasize real-time data.
- **Auto-Scrolling / Carousel (Optional but recommended):** If there are many positions, a carousel that slowly cycles through the positions automatically so it can be left unattended on a display screen.
- **Leaderboards:**
  - Instead of standard progress bars, we will use large typography, candidate photos, and vibrant partylist colors.
  - The leading candidate for each position gets a distinct "Crown" icon or a glowing border effect.
- **Turnout Statistics:** A simplified overview of the total turnout percentage (using a massive circular progress indicator).

### 3. Data Fetching & Security

- Reuse `getElectionResults` from `actions/results.ts`.
- **CRITICAL:** Ensure that only the _currently active_ election is displayed on the `/live` page. If no election is active, show a beautifully designed "No Active Election" placeholder screen.
- Ensure the data refreshes automatically every 5-10 seconds to keep the numbers accurate.

## Verification Plan

### Automated Tests

- N/A

### Manual Verification

- Navigate to `/live` in a private browsing window (not logged in).
- Verify that only the currently active election is displayed.
- Verify that the layout is full-screen, clean, and responsive (looks great on mobile and massive desktop monitors).
- Cast a test vote using another window and verify the numbers on the `/live` page auto-update within 10 seconds.
