

## Plan: Grandmother-Friendly UX + GoodParty Architecture Upgrade

### A. UX Polish (Approved Fixes)

**1. Onboarding Tour — Plain Language Rewrite** (`OnboardingTour.tsx`)
Rewrite all 7 step descriptions using simple analogies. Example: "Think of it like a phone book" for Voter Database, "click the gold button and the computer writes it for you" for Press Release.

**2. Press Release Email Labels** (`PressRelease.tsx`)
- "Open in Email Client" → "Open in Your Email (Gmail, Outlook, etc.)"
- "Copy Emails to Clipboard" → "Copy Email Addresses"
- Add helper text below recipients: "Your contacts will be hidden (BCC) so they can't see each other's addresses."
- Fix: `encodeURIComponent(emails)` in the mailto BCC parameter (line 174)

---

### B. Database Migration

Create 3 new tables in a single migration:

**`texting_campaigns`** — id, user_id, name, script_template (text with `{{first_name}}` placeholders), target_city, target_party, status (draft/sent), created_at. RLS: users manage own rows.

**`supporter_journeys`** — id, user_id, supporter_type (text: volunteer/donor), supporter_id (uuid), journey_step (text), completed (bool), triggered_at, created_at. RLS: users manage own rows.

**`automation_logs`** — id, user_id, automation_type (text), description (text), metadata (jsonb), created_at. RLS: users manage own rows.

---

### C. Backend Automation (Client-Side Logic)

**3. Volunteer Welcome Automation** (`Volunteers.tsx`)
After inserting a new volunteer, insert a row into `automation_logs` with type "welcome_email" and insert a `supporter_journeys` entry. Display a toast: "Welcome email queued for [name]."

**4. High-Value Donor Flagging** (`Fundraising.tsx`)
After inserting a donation with amount > 100, insert into `automation_logs` with type "high_value_donor" and insert a `chat_history` message as a task reminder: "Call [donor] to thank them for their $X donation."

---

### D. New Pages

**5. P2P Texting Campaign Builder** (`src/pages/Texting.tsx`)
- Sidebar entry with MessageCircle icon
- UI: Campaign name, target filters (city dropdown, party dropdown querying voters table), script editor textarea with `{{first_name}}` placeholder support
- Preview panel showing sample messages with real voter names from the filtered universe
- "Save Campaign" saves to `texting_campaigns` table
- Note at bottom: "When you're ready to send, export this list to ContactsHelper.com" with a link to https://contactshelper.com/
- "Export for ContactsHelper" button that downloads a CSV of filtered voters (name, phone) ready to upload

**6. Campaign Advisor** (`src/pages/CampaignAdvisor.tsx`)
- Sidebar entry with GraduationCap icon
- Full chat interface reusing the existing `campaign-assistant` edge function
- Specialized system prompt override sent from client: "You are an expert political consultant for local Ohio elections..."
- "Quick Help" section with 3 pre-fill buttons: "Filing Requirements", "Stump Speech Tips", "Door Knocking Etiquette"
- Each button sends a pre-written prompt to the chat

**7. Dashboard Automations Widget** (`LandingPage.tsx`)
- New section below hero: "Active Automations"
- Queries `automation_logs` for today's entries, grouped by type
- Shows cards like "3 Welcome Emails Sent Today", "2 High-Value Donors Flagged"
- If no automations yet, shows a friendly "No automations yet — they'll appear here as you add volunteers and donations"

---

### E. Routing & Sidebar

**8. Wire Everything Up** (`App.tsx`, `DashboardLayout.tsx`)
- Add routes: `/texting`, `/campaign-advisor`
- Add sidebar items: "Texting" (MessageCircle), "Campaign Advisor" (GraduationCap)
- Add cards to LandingPage sections array for Texting and Campaign Advisor

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/OnboardingTour.tsx` | Rewrite descriptions |
| `src/pages/PressRelease.tsx` | Fix labels, BCC encoding, helper text |
| `src/pages/Texting.tsx` | New — texting campaign builder with ContactsHelper export |
| `src/pages/CampaignAdvisor.tsx` | New — AI advisor with quick help |
| `src/pages/LandingPage.tsx` | Add automations widget + new section cards |
| `src/pages/Fundraising.tsx` | High-value donor automation |
| `src/pages/Volunteers.tsx` | Welcome automation logging |
| `src/components/DashboardLayout.tsx` | 2 new sidebar items |
| `src/App.tsx` | 2 new routes |
| Migration | 3 new tables |

