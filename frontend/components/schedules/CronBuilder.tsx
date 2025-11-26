'use client';

import { useState, useEffect } from 'react';

interface CronBuilderProps {
  value: string;
  onChange: (cron: string) => void;
  disabled?: boolean;
}

type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'custom';

interface CronParts {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}));

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

function parseCronExpression(cron: string): { frequency: FrequencyType; parts: CronParts } {
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    return {
      frequency: 'custom',
      parts: { minute: '0', hour: '9', dayOfMonth: '*', month: '*', dayOfWeek: '*' },
    };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Detect frequency pattern
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return { frequency: 'daily', parts: { minute, hour, dayOfMonth, month, dayOfWeek } };
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    return { frequency: 'weekly', parts: { minute, hour, dayOfMonth, month, dayOfWeek } };
  }

  if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
    return { frequency: 'monthly', parts: { minute, hour, dayOfMonth, month, dayOfWeek } };
  }

  return { frequency: 'custom', parts: { minute, hour, dayOfMonth, month, dayOfWeek } };
}

function buildCronExpression(frequency: FrequencyType, parts: CronParts): string {
  switch (frequency) {
    case 'daily':
      return `${parts.minute} ${parts.hour} * * *`;
    case 'weekly':
      return `${parts.minute} ${parts.hour} * * ${parts.dayOfWeek}`;
    case 'monthly':
      return `${parts.minute} ${parts.hour} ${parts.dayOfMonth} * *`;
    case 'custom':
    default:
      return `${parts.minute} ${parts.hour} ${parts.dayOfMonth} ${parts.month} ${parts.dayOfWeek}`;
  }
}

function describeCron(frequency: FrequencyType, parts: CronParts): string {
  const hourNum = parseInt(parts.hour, 10);
  const timeStr = hourNum === 0 ? '12:00 AM' : hourNum < 12 ? `${hourNum}:00 AM` : hourNum === 12 ? '12:00 PM' : `${hourNum - 12}:00 PM`;

  switch (frequency) {
    case 'daily':
      return `Every day at ${timeStr}`;
    case 'weekly':
      const day = DAYS_OF_WEEK.find((d) => d.value === parts.dayOfWeek)?.label || parts.dayOfWeek;
      return `Every ${day} at ${timeStr}`;
    case 'monthly':
      return `On day ${parts.dayOfMonth} of every month at ${timeStr}`;
    case 'custom':
      return `Custom: ${buildCronExpression(frequency, parts)}`;
    default:
      return '';
  }
}

export default function CronBuilder({ value, onChange, disabled = false }: CronBuilderProps) {
  const parsed = parseCronExpression(value);
  const [frequency, setFrequency] = useState<FrequencyType>(parsed.frequency);
  const [parts, setParts] = useState<CronParts>(parsed.parts);

  // Update parent when parts change
  useEffect(() => {
    const newCron = buildCronExpression(frequency, parts);
    if (newCron !== value) {
      onChange(newCron);
    }
  }, [frequency, parts, onChange, value]);

  const updatePart = (key: keyof CronParts, newValue: string) => {
    setParts((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleFrequencyChange = (newFreq: FrequencyType) => {
    setFrequency(newFreq);
    // Reset parts based on new frequency
    if (newFreq === 'daily') {
      setParts((prev) => ({ ...prev, dayOfMonth: '*', dayOfWeek: '*' }));
    } else if (newFreq === 'weekly') {
      setParts((prev) => ({ ...prev, dayOfMonth: '*', dayOfWeek: '1' }));
    } else if (newFreq === 'monthly') {
      setParts((prev) => ({ ...prev, dayOfMonth: '1', dayOfWeek: '*' }));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-meraki-gray-700 mb-2">
          Frequency
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['daily', 'weekly', 'monthly', 'custom'] as FrequencyType[]).map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => handleFrequencyChange(freq)}
              disabled={disabled}
              className={`py-2 px-3 text-sm font-medium rounded-lg border transition-colors ${
                frequency === freq
                  ? 'border-meraki-blue bg-meraki-blue/10 text-meraki-blue'
                  : 'border-meraki-gray-300 text-meraki-gray-700 hover:border-meraki-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Time selection */}
        <div>
          <label className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
            Time
          </label>
          <select
            value={parts.hour}
            onChange={(e) => updatePart('hour', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent disabled:opacity-50"
          >
            {HOURS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>

        {/* Day of week selection (for weekly) */}
        {frequency === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
              Day of Week
            </label>
            <select
              value={parts.dayOfWeek}
              onChange={(e) => updatePart('dayOfWeek', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent disabled:opacity-50"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Day of month selection (for monthly) */}
        {frequency === 'monthly' && (
          <div>
            <label className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
              Day of Month
            </label>
            <select
              value={parts.dayOfMonth}
              onChange={(e) => updatePart('dayOfMonth', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent disabled:opacity-50"
            >
              {DAYS_OF_MONTH.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Custom cron input */}
      {frequency === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-meraki-gray-700 mb-1.5">
            Cron Expression
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0 9 * * *"
            disabled={disabled}
            className="w-full px-3 py-2 border border-meraki-gray-300 rounded-lg text-meraki-gray-900 placeholder-meraki-gray-400 focus:outline-none focus:ring-2 focus:ring-meraki-blue focus:border-transparent disabled:opacity-50 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-meraki-gray-400">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}

      {/* Schedule description */}
      <div className="p-3 bg-meraki-gray-50 rounded-lg">
        <p className="text-sm text-meraki-gray-600">
          <span className="font-medium">Schedule:</span> {describeCron(frequency, parts)}
        </p>
      </div>
    </div>
  );
}
