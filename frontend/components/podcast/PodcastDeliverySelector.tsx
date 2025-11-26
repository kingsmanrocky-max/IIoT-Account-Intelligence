'use client';

import { useState } from 'react';
import { Send, Mail, MessageSquare } from 'lucide-react';
import { WebexDestinationType } from '@/lib/api';

interface PodcastDeliverySelectorProps {
  enabled: boolean;
  destination: string;
  destinationType: WebexDestinationType;
  onEnabledChange: (enabled: boolean) => void;
  onDestinationChange: (destination: string) => void;
  onDestinationTypeChange: (type: WebexDestinationType) => void;
  disabled?: boolean;
}

export function PodcastDeliverySelector({
  enabled,
  destination,
  destinationType,
  onEnabledChange,
  onDestinationChange,
  onDestinationTypeChange,
  disabled,
}: PodcastDeliverySelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-meraki-gray-500" />
          <span className="text-sm font-medium text-meraki-gray-700">Webex Delivery</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-meraki-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-meraki-blue-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-meraki-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-meraki-blue"></div>
        </label>
      </div>

      {enabled && (
        <div className="pl-6 space-y-3 pt-2 border-l-2 border-meraki-blue-light">
          <div>
            <label className="block text-xs font-medium text-meraki-gray-600 mb-1">
              Delivery Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDestinationTypeChange('email')}
                disabled={disabled}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded transition-colors ${
                  destinationType === 'email'
                    ? 'border-meraki-blue bg-meraki-blue-light text-meraki-blue-dark'
                    : 'border-meraki-gray-300 bg-white text-meraki-gray-700 hover:bg-meraki-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => onDestinationTypeChange('roomId')}
                disabled={disabled}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded transition-colors ${
                  destinationType === 'roomId'
                    ? 'border-meraki-blue bg-meraki-blue-light text-meraki-blue-dark'
                    : 'border-meraki-gray-300 bg-white text-meraki-gray-700 hover:bg-meraki-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <MessageSquare className="w-4 h-4" />
                Room ID
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-meraki-gray-600 mb-1">
              {destinationType === 'email' ? 'Email Address' : 'Webex Room ID'}
            </label>
            <input
              type={destinationType === 'email' ? 'email' : 'text'}
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              disabled={disabled}
              placeholder={
                destinationType === 'email'
                  ? 'user@example.com'
                  : 'Y2lzY29zcGFyazovL3VzL1JPT00v...'
              }
              className="w-full px-3 py-2 text-sm border border-meraki-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-meraki-blue-light focus:border-meraki-blue disabled:opacity-50 disabled:bg-meraki-gray-50"
            />
            <p className="mt-1 text-xs text-meraki-gray-500">
              {destinationType === 'email'
                ? 'Podcast will be sent as a direct message'
                : 'Find Room ID in Webex Teams room details'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
