// Webex Delivery Type Definitions

export type WebexDestinationType = 'email' | 'roomId';
export type WebexContentMode = 'ATTACHMENT' | 'SUMMARY_LINK';

export interface WebexDeliveryOptions {
  destination: string;
  destinationType: WebexDestinationType;
  contentMode: WebexContentMode;
  format?: 'PDF' | 'DOCX';
}

export interface WebexDeliveryResult {
  success: boolean;
  deliveryId: string;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

export interface WebexMessagePayload {
  roomId?: string;
  toPersonEmail?: string;
  text?: string;
  markdown?: string;
  files?: string[];
}

export interface WebexMessageResponse {
  id: string;
  roomId: string;
  roomType: string;
  text?: string;
  markdown?: string;
  files?: string[];
  personId: string;
  personEmail: string;
  created: string;
}

export interface WebexSpace {
  id: string;
  title: string;
  type: 'direct' | 'group';
  isLocked: boolean;
  createdAt: string;
}

export interface WebexPerson {
  id: string;
  emails: string[];
  displayName: string;
  firstName?: string;
  lastName?: string;
}

export type WebexErrorCode =
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'ROOM_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'INVALID_DESTINATION'
  | 'EXPORT_NOT_READY';

export class WebexDeliveryError extends Error {
  constructor(
    message: string,
    public code: WebexErrorCode,
    public retryable: boolean,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WebexDeliveryError';
  }
}
