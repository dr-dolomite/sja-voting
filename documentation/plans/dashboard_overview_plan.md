# Goal Description

The objective is to build a modern, intuitive, and highly functional Admin Dashboard Overview page (`app/dashboard/page.tsx`). Currently, the page is just a basic placeholder. We need to replace it with a comprehensive control center that gives the admin a bird's-eye view of the system's status at a glance, incorporating data from elections, voters, candidates, and the newly implemented audit logging system.

## Proposed Changes

The entire redesign will focus on `app/dashboard/page.tsx` and adding a new action file `actions/dashboard.ts` to fetch aggregated data efficiently.

### 1. Data Aggregation Action (`actions/dashboard.ts`)

Instead of making the frontend fetch from multiple different action files, we will create a dedicated `getDashboardStats()` function to run parallel database queries for the overview. This will include:

- Total Voters and Sections count.
- Total Candidates and Partylists count.
- The currently Active Election (if any).
- A quick summary of recent audit logs (e.g., last 5 actions) and error counts for the day.

### 2. High-Level Statistic Cards (Hero Section)

- Design a row of premium-looking summary cards at the top of the dashboard.
- **Active Election Status:** A prominent card showing the current running election. If none is active, display a subtle warning with a quick-link to manage elections.
- **Voter Pool:** Total registered voters, perhaps with a micro-chart or simple progress bar showing how many have voted (if an election is active).
- **Candidates & Partylists:** Total counts linking to their respective management pages.
- **System Health (Logs):** A card showing the count of today's errors/warnings pulled from the logging system.

### 3. Quick Actions / Shortcuts Panel

- Below the stats, include a grid of Quick Action buttons for common tasks:
  - "Import Voters"
  - "Add Candidate"
  - "View Live Results"
- These buttons will emphasize usability, using Shadcn Button components with appropriate Lucide icons and hover effects.

### 4. Recent Activity Feed (Integration with Logging System)

- Add a dedicated section on the dashboard to display the **Recent Activity Feed**.
- This will pull the 5 to 10 most recent entries from the `AuditLog` table using the existing logging system.
- Design it as a sleek, vertical timeline or a minimalist mini-table.
- Highlight severe actions (Errors/Warnings) in red/yellow respectively to immediately draw the admin's attention to potential issues.

### 5. Overall UI/UX Polish

- Use consistent Shadcn `Card` components with subtle shadows and elegant padding.
- Ensure the layout is fully responsive: single column on mobile, transitioning to a responsive grid on larger screens.
- Use a refined color palette (subtle borders, muted foregrounds for secondary text, and brand colors for primary metrics).

## Verification Plan

### Automated Tests

- N/A

### Manual Verification

- Navigate to `/dashboard` and verify that all statistic cards populate correctly.
- Trigger a mock error or warning in the system (e.g., delete a voter) and verify it appears immediately in the Recent Activity Feed on the dashboard.
- Verify that Quick Action links correctly route to their respective pages.
