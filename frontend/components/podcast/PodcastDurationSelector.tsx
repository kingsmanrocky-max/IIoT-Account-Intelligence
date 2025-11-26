'use client';

import { Clock } from 'lucide-react';
import { PodcastDuration } from '@/lib/api';

interface PodcastDurationSelectorProps {
  value: PodcastDuration;
  onChange: (duration: PodcastDuration) => void;
  disabled?: boolean;
}

const DURATIONS = [
  {
    id: 'SHORT' as PodcastDuration,
    label: '5 min',
    description: 'Quick overview',
    cost: '~$0.07',
  },
  {
    id: 'STANDARD' as PodcastDuration,
    label: '12 min',
    description: 'Comprehensive coverage',
    cost: '~$0.17',
  },
  {
    id: 'LONG' as PodcastDuration,
    label: '18 min',
    description: 'In-depth analysis',
    cost: '~$0.25',
  },
];

export function PodcastDurationSelector({ value, onChange, disabled }: PodcastDurationSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-meraki-gray-700">
        Duration
      </label>
      <div className="grid grid-cols-3 gap-3">
        {DURATIONS.map((duration) => {
          const isSelected = value === duration.id;
          return (
            <label
              key={duration.id}
              className={`relative flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5'
                  : 'border-meraki-gray-200 hover:border-meraki-gray-300'
              }`}
            >
              <input
                type="radio"
                name="podcast-duration"
                value={duration.id}
                checked={isSelected}
                onChange={() => onChange(duration.id)}
                disabled={disabled}
                className="sr-only"
              />
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`w-4 h-4 ${isSelected ? 'text-meraki-blue' : 'text-meraki-gray-500'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-meraki-blue' : 'text-meraki-gray-900'}`}>
                  {duration.label}
                </span>
              </div>
              <p className="text-xs text-meraki-gray-500">{duration.description}</p>
              <div className="mt-2 text-xs text-meraki-gray-400">{duration.cost}</div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
