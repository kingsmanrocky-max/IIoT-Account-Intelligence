// Webex Delivery Constants

export type WebexDestinationType = 'email' | 'roomId';
export type WebexContentType = 'ATTACHMENT' | 'SUMMARY_LINK';

export interface DeliveryDestination {
  id: WebexDestinationType;
  label: string;
  description: string;
  placeholder: string;
}

export interface DeliveryContentType {
  id: WebexContentType;
  label: string;
  description: string;
}

export interface WebexDeliveryOptions {
  enabled: boolean;
  destinationType: WebexDestinationType;
  destination: string;
  contentType: WebexContentType;
}

export const DELIVERY_DESTINATIONS: DeliveryDestination[] = [
  {
    id: 'email',
    label: 'Email',
    description: 'Send to email address (creates 1:1 space)',
    placeholder: 'user@company.com',
  },
  {
    id: 'roomId',
    label: 'Webex Room',
    description: 'Send to existing Webex room',
    placeholder: 'Enter Webex room ID',
  },
];

export const DELIVERY_CONTENT_TYPES: DeliveryContentType[] = [
  {
    id: 'ATTACHMENT',
    label: 'Full Attachment',
    description: 'Send complete PDF/DOCX file',
  },
  {
    id: 'SUMMARY_LINK',
    label: 'Summary Card',
    description: 'Send summary with download link',
  },
];

export const DEFAULT_WEBEX_DELIVERY: WebexDeliveryOptions = {
  enabled: false,
  destinationType: 'email',
  destination: '',
  contentType: 'ATTACHMENT',
};

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateWebexDestination(
  destination: string,
  type: WebexDestinationType
): { valid: boolean; error?: string } {
  if (!destination || destination.trim().length === 0) {
    return { valid: false, error: 'Destination is required' };
  }

  if (type === 'email') {
    if (!validateEmail(destination)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
  } else if (type === 'roomId') {
    if (destination.trim().length < 10) {
      return { valid: false, error: 'Please enter a valid Webex room ID' };
    }
  }

  return { valid: true };
}
