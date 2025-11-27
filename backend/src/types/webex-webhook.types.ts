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

export interface ParsedReportRequest {
  targetCompany: string;
  workflowType: 'ACCOUNT_INTELLIGENCE' | 'COMPETITIVE_INTELLIGENCE' | 'NEWS_DIGEST';
  additionalCompanies?: string[];
  depth?: 'brief' | 'standard' | 'detailed';
  confidence: number;
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
