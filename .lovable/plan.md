

## Plan: AI Voter Calculator, Move to Analytics, Gmail Compose for Press Releases

### 1. Move Calculator from Landing Page to Analytics

- Remove `<VoterContactsCalculator />` from `LandingPage.tsx` (remove import + the widget div)
- Add it to `Analytics.tsx` below the metrics grid

### 2. Redesign VoterContactsCalculator as AI-Optimized Results Display

Current design shows 4 input fields prominently. Redesign to be **results-focused**:

- Pre-populate with Huron County Commissioner defaults: 28,000 registered voters, 35% turnout, 51% vote share, 5x multiplier
- Primary display: large prominent result number (contacts needed) with a progress indicator showing contacts made vs needed (pulling from `door_knocking_logs` + `call_logs` counts)
- Add an "AI Insights" section: on load (or button press), call the `campaign-assistant` edge function with the calculator data + current campaign stats to generate a brief AI analysis (e.g., "You've contacted 12% of your target. Focus on increasing door-knocking in the northeast precincts.")
- Collapse the input fields into an expandable "Adjust Assumptions" accordion — most users will use the defaults
- Show key derived stats as metric cards: Expected Voters, Votes Needed, Contacts Needed, Contacts Made, % Complete

### 3. Replace Press Release Email Send with Gmail Compose

- Replace `handleSend` in `PressRelease.tsx`: instead of calling the `send-press-release` edge function, construct a Gmail compose URL
- Send dialog changes:
  - Keep the contact selection checkboxes
  - Replace "Send" button with a dropdown: **"Open in Gmail"** and **"Copy Emails to Clipboard"**
  - "Open in Gmail": `window.open(https://mail.google.com/mail/?view=cm&fs=1&bcc={emails}&su={subject}&body={plainText})`
  - "Copy Emails": copies comma-separated emails to clipboard for use in any email client
- No edge function needed for sending — remove the `send-press-release` invocation

### Files to Modify

| File | Change |
|------|--------|
| `src/components/VoterContactsCalculator.tsx` | Redesign: results-focused, AI insights, accordion for inputs, progress tracking |
| `src/pages/Analytics.tsx` | Add VoterContactsCalculator |
| `src/pages/LandingPage.tsx` | Remove VoterContactsCalculator import + render |
| `src/pages/PressRelease.tsx` | Replace handleSend with Gmail compose URL + copy emails option |

### Technical Details

**AI Insights call**: Reuse the existing `campaign-assistant` edge function, passing a prompt like "Given {stats}, provide 2-3 brief strategic insights about voter contact progress" — no new edge function needed.

**Gmail URL construction**:
```typescript
const emails = selectedRecipients.map(c => c.email).join(",");
const url = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(emails)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
window.open(url, "_blank");
```

**Progress tracking**: Query `door_knocking_logs` count + `call_logs` count for the user to show "contacts made" vs the calculated target.

