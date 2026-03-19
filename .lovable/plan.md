

## Plan: Onboarding Tour, Simplified Anedot Setup, Fix Gmail Send

### 1. Fix Gmail "Blocked" Issue

The Gmail compose URL (`mail.google.com/mail/?view=cm`) is blocked when opened from within the Lovable preview iframe due to `X-Frame-Options`. Fix: use `mailto:` as the primary method instead, which opens the user's default email client (including Gmail desktop app or webmail). Keep "Copy Emails" as a fallback.

**Changes to `PressRelease.tsx`:**
- Replace `window.open(gmail URL)` with a `mailto:` link: `mailto:?bcc=${emails}&subject=${subject}&body=${body}`
- `mailto:` works universally and won't be blocked by iframe restrictions
- Keep the dropdown with "Open in Email Client" (mailto) and "Copy Emails to Clipboard"

### 2. Onboarding Tour for First-Time Users

Create a lightweight guided tour component that highlights key dashboard features on first login.

**New file: `src/components/OnboardingTour.tsx`**
- Step-by-step overlay tour using a simple state machine (no heavy library)
- Steps: Welcome → Sidebar Navigation → Analytics (voter calculator) → Voter Database → Press Release → Fundraising → Campaign Assistant chatbot
- Each step shows a tooltip-style popover pointing at the relevant UI element with a brief description
- Track completion in `localStorage` (`onboarding_complete`) so it only shows once
- "Skip Tour" and "Next" buttons on each step
- Render inside `DashboardLayout.tsx`

### 3. Simplified Anedot Webhook Setup

Replace the raw technical URL display with a friendly step-by-step accordion guide.

**Changes to `Fundraising.tsx`:**
- Replace the current "Anedot Integration" card with a collapsible step-by-step guide:
  1. "Log in to your Anedot account"
  2. "Go to Settings → Webhooks"
  3. "Click 'Add Webhook' and paste the URL below"
  4. "Save — donations will appear here automatically"
- Hide the webhook URL behind a "Show URL" button or reveal on step 3
- Add a "Test Connection" note explaining they can make a test donation to verify
- Use numbered steps with checkmark icons for clarity

### Files to Modify

| File | Change |
|------|--------|
| `src/components/OnboardingTour.tsx` | New — guided tour component |
| `src/components/DashboardLayout.tsx` | Add OnboardingTour |
| `src/pages/Fundraising.tsx` | Simplify Anedot setup into step-by-step guide |
| `src/pages/PressRelease.tsx` | Replace Gmail URL with `mailto:` link |

