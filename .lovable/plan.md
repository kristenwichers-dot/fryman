

## Plan: Test App Flow + Generate Feature Guide PDF

### Part 1: Generate PDF Feature Guide

Create and run a Python script using **reportlab** to produce a polished, branded PDF at `/mnt/documents/Fryman_Campaign_App_Guide.pdf`.

**Document structure:**
- **Cover page**: Title "Campaign App Feature Guide" with gold accent, overview table listing all 11 features
- **Feature pages** (one section per feature, kept together to avoid awkward page breaks):
  - Home Dashboard, Analytics, Voter Database, Door Knocking, Yard Signs, Events, Press Release Generator, Voter Outreach (Call Voters + Text Campaigns), Volunteers, Fundraising, Campaign Advisor, Sidebar Chat Assistant
  - Each feature includes: **How it works** (plain language), **Why it matters** (italic motivational context), **Tips** (bullet list)
- **Closing page**: Motivational sign-off with campaign branding
- **Styling**: Navy headers, gold accent lines, alternating row table, Helvetica throughout, gold top rule on every page, footer with campaign name

**Brand palette**: Navy `#1E2761`, Gold `#C5A55A`, Dark `#2D2D2D`

### Part 2: Visual QA

Convert PDF to images with `pdftoppm`, inspect every page for overlaps, cut-off text, spacing issues. Fix and re-render if needed.

### Part 3: Quick App Smoke Test

Review console logs and network requests for errors on the current `/voters` route to confirm the city-first loading is working. Check for any build errors across the app.

### Files

| Output | Location |
|--------|----------|
| PDF guide | `/mnt/documents/Fryman_Campaign_App_Guide.pdf` |

