// Webex Adaptive Card Templates

export const reportRequestCard = {
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "Create Intelligence Report",
      "weight": "bolder",
      "size": "large"
    },
    {
      "type": "TextBlock",
      "text": "Fill out the form below to generate your custom report.",
      "wrap": true,
      "spacing": "small"
    },
    {
      "type": "Container",
      "separator": true,
      "spacing": "medium",
      "items": [
        {
          "type": "Input.Text",
          "id": "companyName",
          "label": "Company Name",
          "placeholder": "e.g., Microsoft, Siemens, Rockwell Automation",
          "isRequired": true,
          "errorMessage": "Please enter a company name"
        },
        {
          "type": "Input.ChoiceSet",
          "id": "workflowType",
          "label": "Report Type",
          "style": "compact",
          "isRequired": true,
          "value": "ACCOUNT_INTELLIGENCE",
          "choices": [
            { "title": "Account Intelligence", "value": "ACCOUNT_INTELLIGENCE" },
            { "title": "Competitive Intelligence", "value": "COMPETITIVE_INTELLIGENCE" },
            { "title": "News Digest", "value": "NEWS_DIGEST" }
          ]
        },
        {
          "type": "Input.Text",
          "id": "additionalCompanies",
          "label": "Additional Companies (for News Digest)",
          "placeholder": "Comma-separated: Google, Amazon, Apple",
          "isMultiline": false
        },
        {
          "type": "Input.ChoiceSet",
          "id": "depth",
          "label": "Detail Level",
          "style": "expanded",
          "value": "standard",
          "choices": [
            { "title": "Brief - Quick overview", "value": "brief" },
            { "title": "Standard - Balanced depth", "value": "standard" },
            { "title": "Detailed - Comprehensive analysis", "value": "detailed" }
          ]
        },
        {
          "type": "Input.ChoiceSet",
          "id": "outputFormats",
          "label": "Output Formats (select one or more)",
          "isMultiSelect": true,
          "style": "expanded",
          "value": "PDF",
          "choices": [
            { "title": "PDF Document", "value": "PDF" },
            { "title": "Word Document (DOCX)", "value": "DOCX" },
            { "title": "AI Podcast", "value": "PODCAST" }
          ]
        }
      ]
    },
    {
      "type": "Container",
      "spacing": "medium",
      "items": [
        {
          "type": "TextBlock",
          "text": "Podcast Options (if Podcast selected above)",
          "weight": "bolder",
          "spacing": "small"
        },
        {
          "type": "Input.ChoiceSet",
          "id": "podcastTemplate",
          "label": "Podcast Style",
          "style": "compact",
          "value": "EXECUTIVE_BRIEF",
          "choices": [
            { "title": "Executive Brief - Solo narrator summary", "value": "EXECUTIVE_BRIEF" },
            { "title": "Strategic Debate - Two-host discussion", "value": "STRATEGIC_DEBATE" },
            { "title": "Industry Pulse - News roundup format", "value": "INDUSTRY_PULSE" }
          ]
        },
        {
          "type": "Input.ChoiceSet",
          "id": "podcastDuration",
          "label": "Target Duration",
          "style": "compact",
          "value": "STANDARD",
          "choices": [
            { "title": "Short (5 minutes)", "value": "SHORT" },
            { "title": "Standard (12 minutes)", "value": "STANDARD" },
            { "title": "Long (18 minutes)", "value": "LONG" }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Generate Report",
      "data": {
        "action": "createReport"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Cancel",
      "data": {
        "action": "cancel"
      }
    }
  ]
};

export const helpCard = {
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "IIoT Account Intelligence Bot",
      "weight": "bolder",
      "size": "large"
    },
    {
      "type": "TextBlock",
      "text": "I can generate AI-powered intelligence reports for any company. Here's what I offer:",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Account Intelligence", "value": "Comprehensive company research" },
        { "title": "Competitive Intel", "value": "Competitor analysis and positioning" },
        { "title": "News Digest", "value": "Multi-company news summaries" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Output Formats:",
      "weight": "bolder",
      "spacing": "medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "PDF & DOCX", "value": "Professional documents ready to share" },
        { "title": "AI Podcasts", "value": "Listen to your reports (5-18 minutes)" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Quick Commands:",
      "weight": "bolder",
      "spacing": "medium"
    },
    {
      "type": "TextBlock",
      "text": "• \"Account report for Microsoft\"\n• \"Competitive analysis of Siemens\"\n• \"News digest for Apple, Google, Amazon\"\n• \"Podcast about Tesla\"",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Build Custom Report",
      "data": {
        "action": "showReportForm"
      }
    }
  ]
};

// Helper to build a prefilled report request card
export function buildReportRequestCard(prefill?: {
  companyName?: string;
  workflowType?: string;
  depth?: string;
}): object {
  const card = JSON.parse(JSON.stringify(reportRequestCard)); // Deep clone

  if (prefill) {
    // Find and update the company name input
    if (prefill.companyName) {
      const companyInput = card.body[2].items.find((item: any) => item.id === 'companyName');
      if (companyInput) {
        companyInput.value = prefill.companyName;
      }
    }

    // Find and update the workflow type
    if (prefill.workflowType) {
      const workflowInput = card.body[2].items.find((item: any) => item.id === 'workflowType');
      if (workflowInput) {
        workflowInput.value = prefill.workflowType;
      }
    }

    // Find and update the depth
    if (prefill.depth) {
      const depthInput = card.body[2].items.find((item: any) => item.id === 'depth');
      if (depthInput) {
        depthInput.value = prefill.depth;
      }
    }
  }

  return card;
}
