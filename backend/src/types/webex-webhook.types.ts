// Webex Webhook Types

export interface WebexWebhookPayload {
  id: string;
  name: string;
  resource: 'messages' | 'memberships' | 'rooms';
  event: 'created' | 'deleted' | 'updated';
  filter?: string;
  orgId: string;
  createdBy: string;
  appId: string;
  ownedBy: string;
  status: string;
  actorId: string;
  data: WebexWebhookMessageData;
}

export interface WebexWebhookMessageData {
  id: string;
  roomId: string;
  roomType: 'direct' | 'group';
  personId: string;
  personEmail: string;
  created: string;
  mentionedPeople?: string[];
  text?: string;
  html?: string;
}

export interface WebexMessage {
  id: string;
  roomId: string;
  roomType: 'direct' | 'group';
  text: string;
  personId: string;
  personEmail: string;
  created: string;
  mentionedPeople?: string[];
}

export type OutputFormat = 'PDF' | 'DOCX' | 'PODCAST';

export interface PodcastPreferences {
  template?: 'EXECUTIVE_BRIEF' | 'STRATEGIC_DEBATE' | 'INDUSTRY_PULSE';
  duration?: 'SHORT' | 'STANDARD' | 'LONG';
}

export interface ParsedReportRequest {
  targetCompany: string;
  workflowType: 'ACCOUNT_INTELLIGENCE' | 'COMPETITIVE_INTELLIGENCE' | 'NEWS_DIGEST';
  additionalCompanies?: string[];
  depth?: 'brief' | 'standard' | 'detailed';
  confidence: number;
  // Format preferences
  outputFormats?: OutputFormat[];  // Array to support multiple formats. Default: ['PDF']
  podcastPreferences?: PodcastPreferences;
}

export interface ParsedReportRequestError {
  error: string;
  confidence: number;
}

export type ParseResult = ParsedReportRequest | ParsedReportRequestError;

export function isParsedRequest(result: ParseResult): result is ParsedReportRequest {
  return !('error' in result);
}

export function isParseError(result: ParseResult): result is ParsedReportRequestError {
  return 'error' in result;
}

// Webex Adaptive Card types
export interface WebexAttachmentActionPayload {
  id: string;
  name: string;
  resource: 'attachmentActions';
  event: 'created';
  orgId: string;
  createdBy: string;
  appId: string;
  ownedBy: string;
  status: string;
  actorId: string;
  data: {
    id: string;
    type: 'submit';
    messageId: string;
    personId: string;
    roomId: string;
    created: string;
  };
}

export interface CardSubmissionInputs {
  companyName?: string;
  workflowType?: string;
  additionalCompanies?: string;
  depth?: string;
  outputFormats?: string;
  podcastTemplate?: string;
  podcastDuration?: string;
  action?: string;
}

export interface AttachmentActionDetails {
  id: string;
  type: string;
  messageId: string;
  personId: string;
  roomId: string;
  inputs: CardSubmissionInputs;
  created: string;
}
