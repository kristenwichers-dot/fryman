

## Implementation Plan: Events Overhaul + Press Release Email Distribution

### Part 1: Database Migration

Single migration to add all new schema:

- Add `end_time` text column (nullable) to `events` table
- Create `event_attachments` table (`id`, `event_id` FK to events, `user_id`, `file_name`, `file_path`, `created_at`) with RLS (users manage own)
- Create `event-attachments` private storage bucket with RLS for authenticated users
- Create `media_contacts` table (`id`, `user_id`, `name`, `email`, `outlet` text, `created_at`) with RLS (users manage own)

### Part 2: Events Scheduler Overhaul (`src/pages/EventsScheduler.tsx`)

**Fix date bug**: Replace `new Date(e.date)` with local parsing (`new Date(y, m-1, d)`) to prevent UTC off-by-one.

**Add delete**: Destructive "Delete" button in the event edit dialog. Deletes event + associated attachments from storage.

**Add end time**: New `end_time` field in the form. Display as "10:00 AM – 11:30 AM" in event cards. Update `eventForm` state and `CampaignEvent` interface.

**Daily planner view**: When a date is selected, the side panel shows a timeline with hourly slots (6 AM – 10 PM). Events rendered as blocks positioned by start/end time. Clicking empty slots pre-fills the time for a new event.

**File attachments**: File upload input in event form (docs, PDFs, images). Upload to `event-attachments` storage bucket. Save metadata to `event_attachments` table. Display as downloadable links in the event detail view. Support multiple files per event.

### Part 3: Press Release Media Contacts & Email (`src/pages/PressRelease.tsx`)

**Media contacts management**: New tab/section in the sidebar to add/edit/delete contacts (name, email, outlet). CSV import for bulk upload (reuse the CSV parser pattern from `CsvImport.tsx`).

**Send functionality**: New "Send" button in the editor toolbar. Opens a dialog to select recipients from saved media contacts (checkboxes). Auto-fills subject from topic. Preview of the email content. Sends via a new `send-press-release` edge function.

### Part 4: New Edge Function (`supabase/functions/send-press-release/index.ts`)

- Accepts `{ to: string[], subject: string, htmlContent: string, fromName: string }`
- Uses Lovable AI gateway to format and send (or Resend if available)
- Returns success/failure per recipient
- CORS headers, `verify_jwt = false` in config.toml

### Technical Details

**Files to create:**
- New database migration SQL
- `supabase/functions/send-press-release/index.ts`

**Files to modify:**
- `src/pages/EventsScheduler.tsx` — full overhaul
- `src/pages/PressRelease.tsx` — add contacts + send UI
- `supabase/config.toml` — add `send-press-release` function config

**Email sending note:** Since there's no email service configured yet, I'll need to check available options. The send-press-release function will need an email delivery mechanism. I'll check if an email domain is configured and set up the appropriate infrastructure, or use a simple approach with the Lovable platform capabilities.

### Execution Order

1. Run database migration (schema + storage bucket)
2. Update EventsScheduler.tsx with all fixes
3. Create send-press-release edge function
4. Update PressRelease.tsx with contacts + send UI
5. Update config.toml

