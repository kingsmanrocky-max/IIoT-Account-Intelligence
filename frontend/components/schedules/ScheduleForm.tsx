'use client';

import { useState, useEffect } from 'react';
import {
  Schedule,
  Template,
  CreateScheduleInput,
  UpdateScheduleInput,
  DeliveryMethod,
  templatesAPI,
} from '@/lib/api';
import CronBuilder from './CronBuilder';

interface ScheduleFormProps {
  schedule?: Schedule;
  onSubmit: (data: CreateScheduleInput | UpdateScheduleInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export default function ScheduleForm({ schedule, onSubmit, onCancel, isLoading = false }: ScheduleFormProps) {
  const isEdit = !!schedule;

  // Form state
  const [name, setName] = useState(schedule?.name || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [templateId, setTemplateId] = useState(schedule?.templateId || '');
  const [cronExpression, setCronExpression] = useState(schedule?.cronExpression || '0 9 * * *');
  const [timezone, setTimezone] = useState(schedule?.timezone || 'America/New_York');
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(schedule?.deliveryMethod || 'DOWNLOAD');
  const [deliveryDestination, setDeliveryDestination] = useState(schedule?.deliveryDestination || '');

  // Templates list
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        const response = await templatesAPI.list({ limit: 100 });
        setTemplates(response.data.data || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
        setError('Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Please enter a schedule name');
      return;
    }

    if (name.length > 200) {
      setError('Schedule name must be 200 characters or less');
      return;
    }

    if (!isEdit && !templateId) {
      setError('Please select a template');
      return;
    }

    if (!cronExpression.trim()) {
      setError('Please set a schedule');
      return;
    }

    if (deliveryMethod === 'WEBEX' && !deliveryDestination.trim()) {
      setError('Please enter a Webex delivery destination');
      return;
    }

    if (isEdit) {
      const data: UpdateScheduleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        cronExpression,
        timezone,
        deliveryMethod,
        deliveryDestination: deliveryDestination.trim() || undefined,
      };
      await onSubmit(data);
    } else {
      const data: CreateScheduleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        templateId,
        cronExpression,
        timezone,
        isActive,
        deliveryMethod,
        deliveryDestination: deliveryDestination.trim() || undefined,
      };
      await onSubmit(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Schedule Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
          Schedule Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Weekly Competitor Update"
          className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this schedule does..."
          rows={2}
          className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Template Selection - only for create */}
      {!isEdit && (
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
            Template
          </label>
          {loadingTemplates ? (
            <div className="px-4 py-3 border border-meraki-gray-200 rounded-lg bg-meraki-gray-50 text-meraki-gray-500">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="px-4 py-3 border border-yellow-200 rounded-lg bg-yellow-50 text-yellow-700">
              No templates available. Please create a template first.
            </div>
          ) : (
            <select
              id="template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.workflowType.replace('_', ' ')})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Show selected template info for edit */}
      {isEdit && schedule?.template && (
        <div className="p-3 bg-meraki-gray-50 rounded-lg">
          <p className="text-sm font-medium text-meraki-gray-700">Template</p>
          <p className="text-sm text-meraki-gray-600">{schedule.template.name}</p>
        </div>
      )}

      {/* Cron Builder */}
      <div className="p-4 bg-meraki-gray-50 rounded-lg border border-meraki-gray-200">
        <CronBuilder
          value={cronExpression}
          onChange={setCronExpression}
          disabled={isLoading}
        />
      </div>

      {/* Timezone */}
      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
          Timezone
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
          disabled={isLoading}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Delivery Method */}
      <div>
        <label className="block text-sm font-medium text-meraki-gray-700 mb-3">
          Delivery Method
        </label>
        <div className="flex gap-3">
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              deliveryMethod === 'DOWNLOAD'
                ? 'border-meraki-blue bg-meraki-blue/5'
                : 'border-meraki-gray-200 hover:border-meraki-gray-300'
            }`}
          >
            <input
              type="radio"
              name="deliveryMethod"
              value="DOWNLOAD"
              checked={deliveryMethod === 'DOWNLOAD'}
              onChange={() => setDeliveryMethod('DOWNLOAD')}
              className="sr-only"
              disabled={isLoading}
            />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="font-medium text-meraki-gray-700">Download</span>
          </label>
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              deliveryMethod === 'WEBEX'
                ? 'border-meraki-blue bg-meraki-blue/5'
                : 'border-meraki-gray-200 hover:border-meraki-gray-300'
            }`}
          >
            <input
              type="radio"
              name="deliveryMethod"
              value="WEBEX"
              checked={deliveryMethod === 'WEBEX'}
              onChange={() => setDeliveryMethod('WEBEX')}
              className="sr-only"
              disabled={isLoading}
            />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-medium text-meraki-gray-700">Webex</span>
          </label>
        </div>
      </div>

      {/* Webex Destination */}
      {deliveryMethod === 'WEBEX' && (
        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
            Webex Destination
          </label>
          <input
            type="text"
            id="destination"
            value={deliveryDestination}
            onChange={(e) => setDeliveryDestination(e.target.value)}
            placeholder="email@example.com or room ID"
            className="w-full px-4 py-2.5 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-meraki-gray-400">
            Enter an email address or Webex room ID
          </p>
        </div>
      )}

      {/* Active Toggle - only for create */}
      {!isEdit && (
        <div className="flex items-center justify-between p-4 bg-meraki-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-meraki-gray-900">Start Active</p>
            <p className="text-xs text-meraki-gray-500">Enable the schedule immediately after creation</p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-meraki-blue' : 'bg-meraki-gray-300'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-meraki-gray-100 text-meraki-gray-700 font-medium rounded-lg hover:bg-meraki-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || (templates.length === 0 && !isEdit)}
          className="flex-1 py-3 px-4 bg-meraki-blue text-white font-medium rounded-lg hover:bg-meraki-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isEdit ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isEdit ? 'Save Changes' : 'Create Schedule'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
