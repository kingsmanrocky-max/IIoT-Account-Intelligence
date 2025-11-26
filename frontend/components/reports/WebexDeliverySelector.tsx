'use client';

import { useState, useEffect } from 'react';
import {
  DELIVERY_DESTINATIONS,
  DELIVERY_CONTENT_TYPES,
  DEFAULT_WEBEX_DELIVERY,
  validateWebexDestination,
  WebexDeliveryOptions,
  WebexDestinationType,
  WebexContentType,
} from '@/lib/constants/webex-delivery';
import { Mail, MessageSquare, Paperclip, Link2 } from 'lucide-react';

interface WebexDeliverySelectorProps {
  value: WebexDeliveryOptions;
  onChange: (options: WebexDeliveryOptions) => void;
  disabled?: boolean;
}

const destinationIcons: Record<WebexDestinationType, React.ReactNode> = {
  email: <Mail className="w-5 h-5" />,
  roomId: <MessageSquare className="w-5 h-5" />,
};

const contentTypeIcons: Record<WebexContentType, React.ReactNode> = {
  ATTACHMENT: <Paperclip className="w-5 h-5" />,
  SUMMARY_LINK: <Link2 className="w-5 h-5" />,
};

export default function WebexDeliverySelector({
  value = DEFAULT_WEBEX_DELIVERY,
  onChange,
  disabled = false,
}: WebexDeliverySelectorProps) {
  const [validationError, setValidationError] = useState<string | undefined>();

  // Validate destination when it changes
  useEffect(() => {
    if (value.enabled && value.destination) {
      const result = validateWebexDestination(value.destination, value.destinationType);
      setValidationError(result.valid ? undefined : result.error);
    } else {
      setValidationError(undefined);
    }
  }, [value.enabled, value.destination, value.destinationType]);

  const handleToggle = () => {
    onChange({ ...value, enabled: !value.enabled });
  };

  const handleDestinationTypeChange = (type: WebexDestinationType) => {
    onChange({ ...value, destinationType: type, destination: '' });
  };

  const handleDestinationChange = (destination: string) => {
    onChange({ ...value, destination });
  };

  const handleContentTypeChange = (contentType: WebexContentType) => {
    onChange({ ...value, contentType });
  };

  const currentDestinationConfig = DELIVERY_DESTINATIONS.find(
    (d) => d.id === value.destinationType
  );

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-meraki-gray-700">
          Webex Delivery
        </label>
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:ring-offset-2 ${
            value.enabled ? 'bg-meraki-blue' : 'bg-meraki-gray-200'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {value.enabled && (
        <>
          {/* Destination Type */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-meraki-gray-500">
              Delivery Destination
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DELIVERY_DESTINATIONS.map((dest) => {
                const isSelected = value.destinationType === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => handleDestinationTypeChange(dest.id)}
                    disabled={disabled}
                    className={`relative flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-meraki-blue bg-meraki-blue/5 text-meraki-blue'
                        : 'border-meraki-gray-200 text-meraki-gray-600 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-meraki-blue/10' : 'bg-meraki-gray-100'
                      }`}
                    >
                      {destinationIcons[dest.id]}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">{dest.label}</div>
                      <div className="text-xs text-meraki-gray-400">{dest.description}</div>
                    </div>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-meraki-blue absolute top-2 right-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-meraki-gray-500">
              {value.destinationType === 'email' ? 'Email Address' : 'Room ID'}
            </label>
            <input
              type={value.destinationType === 'email' ? 'email' : 'text'}
              value={value.destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              placeholder={currentDestinationConfig?.placeholder}
              disabled={disabled}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-meraki-blue ${
                validationError
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-meraki-gray-200'
              } ${disabled ? 'cursor-not-allowed opacity-50 bg-meraki-gray-50' : ''}`}
            />
            {validationError && (
              <p className="text-xs text-red-500">{validationError}</p>
            )}
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-meraki-gray-500">
              Content Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DELIVERY_CONTENT_TYPES.map((contentType) => {
                const isSelected = value.contentType === contentType.id;
                return (
                  <button
                    key={contentType.id}
                    type="button"
                    onClick={() => handleContentTypeChange(contentType.id)}
                    disabled={disabled}
                    className={`relative flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-meraki-blue bg-meraki-blue/5 text-meraki-blue'
                        : 'border-meraki-gray-200 text-meraki-gray-600 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected ? 'bg-meraki-blue/10' : 'bg-meraki-gray-100'
                      }`}
                    >
                      {contentTypeIcons[contentType.id]}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">{contentType.label}</div>
                      <div className="text-xs text-meraki-gray-400">
                        {contentType.description}
                      </div>
                    </div>
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-meraki-blue absolute top-2 right-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Text */}
          <p className="text-xs text-meraki-gray-400 bg-meraki-gray-50 p-3 rounded-lg">
            {value.contentType === 'ATTACHMENT'
              ? 'The full report document will be sent as an attachment to the Webex conversation.'
              : 'A summary card with key highlights and a download link will be sent to the Webex conversation.'}
          </p>
        </>
      )}
    </div>
  );
}
