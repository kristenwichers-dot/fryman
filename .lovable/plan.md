

## Plan: Voter Contact Calculator, Campaign Assistant, Anedot Integration, and Email Sending

Four features to add based on the screenshots and requirements.

---

### Feature 1: Voter Contacts Needed Calculator

A new page/widget (or section on the landing page) that calculates how many voter contacts are needed to win, matching the screenshot:

- Inputs: total voters in district, expected turnout %, vote share needed to win %, contact multiplier (default 5x)
- Output: calculated number showing voter contacts needed with the breakdown explanation
- Save these campaign settings to a new `campaign_settings` table so they persist
- Display on the landing page as a prominent card or as a dedicated section

**Database**: `campaign_settings` table (`id`, `user_id`, `total_voters` int, `expected_turnout` numeric, `vote_share_needed` numeric, `contact_multiplier` int, `created_at`)

---

### Feature 2: Campaign Assistant Chatbot

A floating chatbot accessible from any page (like the screenshot describes — "answer any questions about your campaign"):

- Floating action button in bottom-right corner
- Opens a chat panel/dialog
- Uses the existing Debate Prep pattern (AI chat via Lovable AI gateway) but with a campaign-focused system prompt
- New edge function `campaign-assistant` that has context about the campaign (Huron County Commissioner race)
- Stores chat history in the existing `chat_history` table

---

### Feature 3: Anedot Fundraising Integration

Anedot uses **webhooks** (no public REST API for pulling data). The integration will:

- Create a `donations` table (`id`, `user_id`, `donor_name`, `donor_email`, `amount`, `frequency`, `status`, `anedot_donation_id`, `raw_payload` jsonb, `created_at`)
- Create an edge function `anedot-webhook` that receives POST requests from Anedot when donations occur
- Build a **Fundraising** page showing donation totals, recent donations, and donor list
- Add a settings section explaining how to configure the webhook URL in Anedot's dashboard (point it to the edge function URL)
- Add Fundraising to the nav and landing page

---

### Feature 4: Email Sending from Logged-in User's Gmail

For press release distribution, the user wants emails sent "from" their logged-in email (Gmail). True Gmail sending requires Google OAuth with Gmail API scope. The approach:

- Use a **Google connector** (if available) or set up Gmail SMTP via an App Password
- Alternative simpler approach: use Lovable's email infrastructure with the user's email as the reply-to address, so recipients see it comes from the campaign
- Update the `send-press-release` edge function to actually send emails

I'll check available connectors, but the most practical approach for a campaign tool is to set up Lovable's email infrastructure (requires an email domain) so emails actually get delivered, with the logged-in user's email as the reply-to.

---

### Files to Create/Modify

| File | Action |
|------|--------|
| New migration | `campaign_settings` table, `donations` table |
| `src/pages/Fundraising.tsx` | New fundraising dashboard page |
| `src/components/CampaignAssistant.tsx` | Floating chatbot component |
| `src/components/VoterContactsCalculator.tsx` | Calculator widget |
| `supabase/functions/anedot-webhook/index.ts` | Webhook receiver for Anedot |
| `supabase/functions/campaign-assistant/index.ts` | AI chatbot edge function |
| `src/pages/LandingPage.tsx` | Add calculator widget + fundraising card |
| `src/components/DashboardLayout.tsx` | Add Fundraising nav item + chatbot |
| `src/App.tsx` | Add Fundraising route |
| `src/pages/PressRelease.tsx` | Update send to use email infrastructure |
| `supabase/functions/send-press-release/index.ts` | Update to actually send emails |
| `supabase/config.toml` | Register new edge functions |

### Email Approach

Since the user wants to send from their Gmail, the simplest working approach is:
1. Set up Lovable's email infrastructure with a sender domain
2. Set the reply-to as the logged-in user's email so recipients can reply directly
3. Alternative: ask user for a Gmail App Password to send via SMTP directly from their Gmail (more complex but truly sends "from" their Gmail)

I'll confirm the email approach before proceeding — setting up a sender domain first is the recommended path.

### Execution Order

1. Database migration (campaign_settings, donations tables)
2. Voter Contacts Calculator component + add to landing page
3. Campaign Assistant chatbot (component + edge function)
4. Anedot webhook edge function + Fundraising page
5. Email infrastructure setup for press release sending
6. Update nav, routes, and config

