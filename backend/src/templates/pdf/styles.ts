// Professional CSS styles for PDF reports

export const pdfStyles = `
/* Reset and Base */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1F2937;
  background: white;
}

/* Typography */
h1 {
  font-size: 28pt;
  font-weight: 700;
  color: #111827;
  margin-bottom: 16px;
  line-height: 1.2;
}

h2 {
  font-size: 18pt;
  font-weight: 600;
  color: #1F2937;
  margin-top: 32px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #049FD9;
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  color: #374151;
  margin-top: 24px;
  margin-bottom: 8px;
}

h4 {
  font-size: 12pt;
  font-weight: 600;
  color: #4B5563;
  margin-top: 16px;
  margin-bottom: 6px;
}

p {
  margin-bottom: 12px;
}

/* Lists */
ul, ol {
  margin-bottom: 12px;
  padding-left: 24px;
}

li {
  margin-bottom: 6px;
}

li::marker {
  color: #049FD9;
}

/* Links */
a {
  color: #049FD9;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Strong and Emphasis */
strong {
  font-weight: 600;
  color: #111827;
}

em {
  font-style: italic;
}

/* Cover Page */
.cover-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 48px;
  page-break-after: always;
}

.cover-logo {
  width: 150px;
  height: auto;
  margin-bottom: 48px;
}

.cover-type-badge {
  display: inline-block;
  padding: 8px 24px;
  background: linear-gradient(135deg, #1a2332 0%, #2d3d54 100%);
  color: white;
  font-size: 10pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-radius: 4px;
  margin-bottom: 32px;
}

.cover-title {
  font-size: 36pt;
  font-weight: 700;
  color: #111827;
  margin-bottom: 16px;
  max-width: 600px;
}

.cover-company {
  font-size: 18pt;
  color: #049FD9;
  font-weight: 500;
  margin-bottom: 48px;
}

.cover-meta {
  margin-top: auto;
  padding-top: 48px;
  font-size: 10pt;
  color: #6B7280;
}

.cover-meta-item {
  margin-bottom: 4px;
}

/* Table of Contents */
.toc {
  page-break-after: always;
  padding: 32px 0;
}

.toc-title {
  font-size: 24pt;
  font-weight: 700;
  color: #111827;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 3px solid #049FD9;
}

.toc-list {
  list-style: none;
  padding: 0;
}

.toc-item {
  display: flex;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px dotted #D1D5DB;
}

.toc-item a {
  color: #1F2937;
  text-decoration: none;
  font-size: 12pt;
}

.toc-item a:hover {
  color: #049FD9;
}

.toc-page-num {
  margin-left: auto;
  color: #6B7280;
  font-size: 11pt;
}

/* Report Sections */
.report-section {
  margin-bottom: 32px;
  page-break-inside: avoid;
}

.section-content {
  padding: 0 8px;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 10pt;
}

thead {
  background: linear-gradient(135deg, #1a2332 0%, #2d3d54 100%);
}

th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: white;
  border: 1px solid #374151;
}

td {
  padding: 10px 16px;
  border: 1px solid #E5E7EB;
  vertical-align: top;
}

tbody tr:nth-child(even) {
  background-color: #F9FAFB;
}

tbody tr:hover {
  background-color: #F3F4F6;
}

/* Code blocks */
code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 10pt;
  background-color: #F3F4F6;
  padding: 2px 6px;
  border-radius: 4px;
}

pre {
  background-color: #1F2937;
  color: #F9FAFB;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

pre code {
  background: none;
  padding: 0;
  color: inherit;
}

/* Blockquote */
blockquote {
  border-left: 4px solid #049FD9;
  padding-left: 16px;
  margin: 16px 0;
  color: #4B5563;
  font-style: italic;
}

/* Callout boxes */
.callout {
  padding: 16px 20px;
  border-radius: 8px;
  margin: 16px 0;
  border-left: 4px solid;
}

.callout-info {
  background-color: #EFF6FF;
  border-color: #3B82F6;
}

.callout-success {
  background-color: #ECFDF5;
  border-color: #10B981;
}

.callout-warning {
  background-color: #FFFBEB;
  border-color: #F59E0B;
}

.callout-error {
  background-color: #FEF2F2;
  border-color: #EF4444;
}

/* Metrics grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.metric-card {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.metric-value {
  font-size: 24pt;
  font-weight: 700;
  color: #049FD9;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 10pt;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 9pt;
  font-weight: 600;
  text-transform: uppercase;
}

.status-high {
  background-color: #FEE2E2;
  color: #DC2626;
}

.status-medium {
  background-color: #FEF3C7;
  color: #D97706;
}

.status-low {
  background-color: #D1FAE5;
  color: #059669;
}

/* Footer */
.report-footer {
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
  font-size: 9pt;
  color: #9CA3AF;
  text-align: center;
}

/* Workflow-specific accent colors */
.workflow-account-intelligence .section-header h2 {
  border-color: #049FD9;
}

.workflow-competitive-intelligence .section-header h2 {
  border-color: #F97316;
}

.workflow-news-digest .section-header h2 {
  border-color: #8B5CF6;
}

/* Print optimizations */
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .cover-page {
    page-break-after: always;
  }

  .toc {
    page-break-after: always;
  }

  h2, h3, h4 {
    page-break-after: avoid;
  }

  table, figure, blockquote {
    page-break-inside: avoid;
  }
}
`;

export const getWorkflowAccentColor = (workflowType: string): string => {
  switch (workflowType) {
    case 'ACCOUNT_INTELLIGENCE':
      return '#049FD9'; // Cisco blue
    case 'COMPETITIVE_INTELLIGENCE':
      return '#F97316'; // Orange
    case 'NEWS_DIGEST':
      return '#8B5CF6'; // Purple
    default:
      return '#049FD9';
  }
};

export const formatWorkflowType = (workflowType: string): string => {
  switch (workflowType) {
    case 'ACCOUNT_INTELLIGENCE':
      return 'Account Intelligence Report';
    case 'COMPETITIVE_INTELLIGENCE':
      return 'Competitive Intelligence Report';
    case 'NEWS_DIGEST':
      return 'News Digest';
    default:
      return workflowType.replace(/_/g, ' ');
  }
};
