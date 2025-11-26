'use client';

import { TIME_PERIODS, DEFAULT_TIME_PERIOD } from '@/lib/constants/news-digest';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';

interface TimePeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
  disabled?: boolean;
}

const periodIcons: Record<string, React.ReactNode> = {
  'last-week': <Calendar className="w-5 h-5" />,
  'last-month': <CalendarDays className="w-5 h-5" />,
  'last-quarter': <CalendarRange className="w-5 h-5" />,
};

export default function TimePeriodSelector({
  value = DEFAULT_TIME_PERIOD,
  onChange,
  disabled = false,
}: TimePeriodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-meraki-gray-700">
        Time Period
      </label>

      <div className="grid grid-cols-3 gap-3">
        {TIME_PERIODS.map((period) => {
          const isSelected = value === period.id;

          return (
            <button
              key={period.id}
              type="button"
              onClick={() => onChange(period.id)}
              disabled={disabled}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5 text-meraki-blue'
                  : 'border-meraki-gray-200 text-meraki-gray-600 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-meraki-blue/10' : 'bg-meraki-gray-100'}`}>
                {periodIcons[period.id]}
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{period.label}</div>
                <div className="text-xs text-meraki-gray-400 mt-0.5">
                  {period.days} days
                </div>
              </div>
              {isSelected && (
                <svg className="w-5 h-5 text-meraki-blue absolute top-2 right-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-meraki-gray-400">
        News digest will focus on events from the selected time period
      </p>
    </div>
  );
}
