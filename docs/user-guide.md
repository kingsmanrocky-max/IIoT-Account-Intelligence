# IIoT Account Intelligence - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Reports](#creating-reports)
3. [Using Podcasts](#using-podcasts)
4. [Managing Templates](#managing-templates)
5. [Setting Up Schedules](#setting-up-schedules)
6. [Webex Delivery](#webex-delivery)
7. [FAQ](#faq)

---

## Getting Started

### Logging In

1. Navigate to the application URL
2. Enter your email and password
3. Click "Sign In"

### First Time Setup

After your first login:

1. Update your profile (name, timezone)
2. Review available workflow types
3. Test creating a simple report

---

## Creating Reports

### Account Intelligence Reports

**Purpose**: Generate comprehensive intelligence about a specific company or account.

**Steps**:

1. Click **"New Report"** → **"Account Intelligence"**
2. **Enter Company Name**: Type the company name (e.g., "Cisco Systems")
3. **Select Sections** (choose one or more):
   - Account Overview: Company background, industry, size
   - Financial Health: Revenue, growth, financial metrics
   - Security Events: Cyber incidents, breaches, vulnerabilities
   - Current Events: Recent news and developments
4. **Choose Depth**: Brief / Standard / Detailed
5. **Select Format**: PDF, Word, or Podcast
6. Click **"Generate Report"**

**Report Generation Time**: 1-3 minutes depending on depth and sections

---

### Competitive Intelligence Reports

**Purpose**: Analyze competitors from Cisco's IIoT perspective.

**Steps**:

1. Click **"New Report"** → **"Competitive Intelligence"**
2. **Enter Competitor Name** (e.g., "Rockwell Automation")
3. **Select Cisco Products** to compare against:
   - Industrial routers (IR1101, etc.)
   - Industrial switches
   - IoT gateways
4. **Choose Focus Areas**:
   - Manufacturing
   - Energy/Utilities
   - Transportation
   - Smart Cities
5. **Select Sections**:
   - Competitor Overview
   - Product Comparison
   - Market Position
   - Cisco Analysis
   - Strategic Recommendations
6. **Choose Format**: PDF, Word, or Podcast
7. Click **"Generate Report"**

---

### News Digest Reports

**Purpose**: Aggregate and summarize news about multiple companies.

**Steps**:

1. Click **"New Report"** → **"News Digest"**
2. **Enter Companies** (multiple):
   - Type company name and press Enter
   - Add up to 10 companies
3. **Select Time Period**:
   - Last Week
   - Last Month
   - Last Quarter
4. **Choose News Focus**:
   - All News
   - Product Launches
   - Partnerships
   - Financial News
   - M&A Activity
   - Executive Changes
5. **Select Output Style**:
   - Executive Brief (concise)
   - Narrative (detailed storytelling)
   - Podcast-Ready (conversational)
6. **Choose Format**: PDF, Word, or Podcast
7. Click **"Generate Report"**

---

## Using Podcasts

### What are Virtual Podcasts?

Virtual Podcasts transform your reports into engaging, multi-person audio conversations using AI-generated voices.

### Podcast Templates

1. **Executive Brief** (10-15 min)
   - Professional interview format
   - Host + Expert analyst
   - Best for: Account Intelligence

2. **Strategic Debate** (10-15 min)
   - Multiple perspectives
   - Cisco analyst + Industry expert
   - Best for: Competitive Intelligence

3. **Industry Pulse** (5-10 min)
   - News roundtable format
   - 3-4 virtual hosts
   - Best for: News Digest

### Creating a Podcast

1. When creating a report, check **"Podcast"** format
2. Select a **Podcast Template**
3. Choose **Duration**:
   - Short (5 min)
   - Standard (10-15 min)
   - Long (15-20 min)
4. Generate report
5. Podcast generation starts automatically after report completion

### Listening to Podcasts

1. Go to **Reports** page
2. Find report with podcast icon
3. Click to open report details
4. Use the podcast player:
   - Play/Pause
   - Seek to any position
   - Adjust playback speed (0.75x - 2x)
   - Download MP3

### Podcast Generation Time

- Short: 3-5 minutes
- Standard: 5-8 minutes
- Long: 8-12 minutes

---

## Managing Templates

### What are Templates?

Templates save your report configurations for quick reuse.

### Creating a Template

1. Configure a report (sections, depth, formats)
2. Before generating, click **"Save as Template"**
3. Enter template name (e.g., "Monthly Account Review")
4. Add optional description
5. Click **"Save Template"**

### Using a Template

1. Go to **Templates** page
2. Find your template
3. Click **"Use Template"**
4. Adjust any parameters if needed
5. Generate report

### Managing Templates

- **Edit**: Update template configuration
- **Duplicate**: Create a copy to modify
- **Delete**: Remove unused templates

---

## Setting Up Schedules

### What are Schedules?

Automated report generation on a recurring basis.

### Creating a Schedule

1. Go to **Schedules** page
2. Click **"New Schedule"**
3. **Basic Information**:
   - Name: "Weekly Competitor Analysis"
   - Description (optional)
4. **Select Template** or configure report settings
5. **Set Recurrence**:
   - Daily
   - Weekly (select days)
   - Monthly (select date)
   - Custom (cron expression)
6. **Delivery Options**:
   - Download only
   - Send to Webex
   - Email notification
7. Click **"Create Schedule"**

### Schedule Management

- **View Next Run**: See when report will generate next
- **Pause/Resume**: Temporarily disable schedule
- **Edit**: Update configuration or timing
- **Delete**: Remove schedule
- **View History**: See past generated reports

---

## Webex Delivery

### Setting Up Webex Delivery

**Prerequisites**:
- Admin must configure Webex Bot Token
- You need destination email or room ID

### Sending to Webex

1. Generate or open a report
2. Click **"Deliver"** → **"Webex"**
3. **Choose Destination**:
   - Email address: Bot sends 1:1 message
   - Room ID: Bot posts to Webex space
4. **Select Files** to send:
   - PDF
   - Word Document
   - Podcast MP3
5. Add optional message
6. Click **"Send"**

### Finding Webex Room ID

1. Open Webex space
2. Click space name → Info
3. Copy Room ID (starts with "Y2...")

---

## FAQ

### How long does report generation take?

- **Brief reports**: 1-2 minutes
- **Standard reports**: 2-4 minutes
- **Detailed reports**: 4-6 minutes
- **Podcasts**: Additional 3-12 minutes depending on length

### Can I cancel report generation?

Currently, once started, reports cannot be cancelled. They will complete or timeout after 5 minutes.

### How many companies can I analyze at once?

- Account Intelligence: 1 company
- Competitive Intelligence: 1 competitor
- News Digest: Up to 10 companies

### How long are reports stored?

Reports are retained for 90 days by default (configurable by admin).

### Can I regenerate a report?

Yes, click **"Regenerate"** on any report to create a new version with updated information.

### What if podcast generation fails?

- Check if OpenAI API key is configured
- Ensure sufficient API credits
- Try again with shorter duration
- Contact admin if issue persists

### Can I share reports with others?

- Download PDF/Word/MP3 and share via email
- Use Webex delivery to send to Webex spaces
- Share link (if user has account access)

### How do I change my password?

1. Click profile icon → **Settings**
2. Navigate to **Security**
3. Click **"Change Password"**
4. Enter current and new password
5. Click **"Update Password"**

---

**Need Help?** Contact your system administrator or check the Admin Guide for advanced configuration.

**Last Updated**: 2025-11-26
