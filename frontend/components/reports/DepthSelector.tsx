'use client';

import { DepthPreference } from '@/lib/api';

interface DepthSelectorProps {
  value: DepthPreference;
  onChange: (depth: DepthPreference) => void;
  disabled?: boolean;
}

const depthOptions: {
  value: DepthPreference;
  label: string;
  description: string;
  time: string;
}[] = [
  {
    value: 'brief',
    label: 'Brief',
    description: 'Quick summary with key points only',
    time: '2-3 min',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Balanced coverage with essential details',
    time: '5-7 min',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive analysis with in-depth insights',
    time: '10-15 min',
  },
];

export default function DepthSelector({
  value,
  onChange,
  disabled = false,
}: DepthSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-meraki-gray-700">
        Content Depth
      </label>

      <div className="grid grid-cols-3 gap-3">
        {depthOptions.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              key={option.value}
              className={`relative flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5'
                  : 'border-meraki-gray-200 hover:border-meraki-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                name="depth"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="sr-only"
              />
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-meraki-blue' : 'border-meraki-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-meraki-blue" />
                  )}
                </div>
                <span className={`text-sm font-medium ${isSelected ? 'text-meraki-gray-900' : 'text-meraki-gray-700'}`}>
                  {option.label}
                </span>
              </div>
              <p className="text-xs text-meraki-gray-400 pl-6">{option.description}</p>
              <div className="flex items-center gap-1 mt-2 pl-6">
                <svg className="w-3.5 h-3.5 text-meraki-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-meraki-gray-400">{option.time}</span>
              </div>
            </label>
          );
        })}
      </div>

      <p className="text-xs text-meraki-gray-400">
        Estimated generation time varies by section count and content complexity
      </p>
    </div>
  );
}
