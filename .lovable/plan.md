

## Plan: Outreach Merge, Voter DB Performance, Sidebar Cleanup, Daily Briefing

None of these changes have been implemented yet. Here is the full plan:

### 1. Merge Phone Banking + Texting into Voter Outreach Hub

Create `src/pages/Outreach.tsx` with a tabbed interface (using existing Tabs component):
- **Tab 1 "Call Voters"**: Contains all current PhoneBanking.tsx logic (scripts, call queue, outcome logging)
- **Tab 2 "Text Campaigns"**: Contains all current Texting.tsx logic (script builder, voter universe filter, ContactsHelper export)

Delete `src/pages/PhoneBanking.tsx` and `src/pages/Texting.tsx` after merging.

### 2. Voter Database — City-First Loading

Refactor `VoterDatabase.tsx` to stop loading all 35k voters on mount:
- Add `selectedCity` state (null = city overview, string = voter table)
- On mount, run a lightweight query: `SELECT city, count(*) FROM voters GROUP BY city` (reuse the `get_door_knocking_cities` RPC or a simple grouped query)
- Show city cards with voter counts (same pattern as DoorKnocking)
- Only fetch voters when a city is clicked, filtered by that city
- Add "Back to All Cities" button
- Keep all existing CRUD, search, filter, CSV import — scoped to selected city

### 3. Sidebar & Landing Page Cleanup

**DashboardLayout.tsx** sidebar changes:
- "Events & AI" → "Events"
- Remove "Debate Prep" entry
- Remove "Phone Banking" and "Texting" entries
- Add "Voter Outreach" pointing to `/outreach` (Phone icon)

**LandingPage.tsx** sections changes:
- "Events & AI Scheduler" → "Events"
- Remove "Debate Prep Bot" card
- Remove "Phone Banking" and "P2P Texting" cards
- Add single "Voter Outreach" card

**App.tsx** route changes:
- Remove `/phone-banking`, `/texting`, `/debate-prep` routes
- Add `/outreach` route

### 4. Daily Briefing Widget

Add a "Daily Briefing — Top 3 Tasks" section at the top of `LandingPage.tsx`:
- Query `automation_logs` for today (already fetched) and `events` table for today's events
- Build a prioritized task list combining: upcoming events, high-value donor calls, welcome emails
- Display as a numbered list with icons
- Friendly fallback: "No tasks for today — enjoy the day!"

### Files Summary

| File | Action |
|------|--------|
| `src/pages/Outreach.tsx` | New — tabbed Phone Banking + Texting |
| `src/pages/PhoneBanking.tsx` | Delete |
| `src/pages/Texting.tsx` | Delete |
| `src/pages/VoterDatabase.tsx` | Rewrite with city-first loading |
| `src/pages/LandingPage.tsx` | Daily Briefing widget, update section cards |
| `src/components/DashboardLayout.tsx` | Update sidebar entries |
| `src/App.tsx` | Update routes |

