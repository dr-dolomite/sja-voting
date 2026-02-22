# Goal Description

The objective is to redesign the Results Summary dashboard, elevating it from a basic data display to a premium, modern, and professional interface. The current design relies heavily on default Shadcn UI charting and generic cards, which results in a clunky appearance (especially the section turnout chart where labels get truncated) and an uninspired color palette.

## Proposed Changes

The entire redesign will focus on `components/dashboard/results/results-dashboard.tsx` with a few CSS utility enhancements if needed.

### 1. Header & Controls

- Make the header feel like a unified control panel.
- Add a pulsing, animated "Live" dot indicator instead of a static button to give a real-time dashboard feel.
- Group the election selector and refresh controls into a sleek, slightly separated toolbar with minimal borders.

### 2. Key Statistics Cards

- Upgrade the four main summary cards (Total Voters, Votes Cast, Positions, Overall Turnout).
- Apply a subtle glassmorphism effect or very soft gradients to the backgrounds to make the numbers pop.
- Add soft, colored background circles behind the icons (e.g., a soft blue for Users, soft green for Votes).
- **Turnout Ring:** Replace the Recharts `RadialBarChart` with a custom SVG circular progress ring. This allows for smoother animations, better stroke casing (rounded caps), and a much cleaner visual without the overhead of a charting library for a simple ring.

### 3. Position Leaderboards

- Redesign the position cards to look like elegant leaderboards rather than generic statistic panels.
- **Progress Bars:** Replace the primitive solid-color `div` bars with smooth, vibrant gradient bars. We will use tailored color palettes (e.g., indigo-to-purple, or using the partylist colors if available, but enhanced with gradients).
- **Winner/Leader Highlight:** Add a distinct visual cue for the leading candidate (e.g., a subtle gold glow, a heavier font weight, or a prominent crown/badge) to make the results instantly readable.
- Implement subtle entry animations for the progress bars when the data refreshes.

### 4. Turnout by Section (List-based UI)

- **Remove the Recharts BarChart:** The current Recharts implementation is squished and cuts off long section names like "Pope Benedict XVI".
- **New Approach:** Build a custom, highly responsive HTML/Tailwind list-based visualizer.
- Each section will be a row containing:
  - The section name (fully visible, wrapping if necessary).
  - A beautiful, two-tone inline progress bar (e.g., solid primary color for "Voted", subtle gray for "Not Voted").
  - The exact percentage and ratio (e.g., `80% (16/20)`) aligned neatly to the right.

## Verification Plan

### Automated Tests

- N/A (UI visual changes)

### Manual Verification

- Render the Results page locally (`/dashboard/results`).
- Ensure the selected election's data correctly populates the new UI.
- Verify that long section names no longer break or truncate awkwardly.
- Confirm that the animations (progress bars, live pulse) trigger correctly on load and during the 10-second auto-refresh intervals.
