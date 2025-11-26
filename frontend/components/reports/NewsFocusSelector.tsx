'use client';

import { NEWS_FOCUS_AREAS } from '@/lib/constants/news-digest';
import { Cpu, TrendingUp, Users, GitMerge, Globe, Leaf } from 'lucide-react';

interface NewsFocusSelectorProps {
  selectedFocus: string[];
  onFocusChange: (focus: string[]) => void;
  disabled?: boolean;
}

const focusIcons: Record<string, React.ReactNode> = {
  'technology': <Cpu className="w-4 h-4" />,
  'financials': <TrendingUp className="w-4 h-4" />,
  'leadership': <Users className="w-4 h-4" />,
  'ma-activity': <GitMerge className="w-4 h-4" />,
  'market-expansion': <Globe className="w-4 h-4" />,
  'sustainability': <Leaf className="w-4 h-4" />,
};

export default function NewsFocusSelector({
  selectedFocus,
  onFocusChange,
  disabled = false,
}: NewsFocusSelectorProps) {
  const toggleFocus = (focusId: string) => {
    if (selectedFocus.includes(focusId)) {
      onFocusChange(selectedFocus.filter(f => f !== focusId));
    } else {
      onFocusChange([...selectedFocus, focusId]);
    }
  };

  const selectAll = () => {
    onFocusChange(NEWS_FOCUS_AREAS.map(f => f.id));
  };

  const clearAll = () => {
    onFocusChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-meraki-gray-700">
          News Focus <span className="font-normal text-meraki-gray-400">(optional)</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled || selectedFocus.length === NEWS_FOCUS_AREAS.length}
            className="text-xs text-meraki-blue hover:text-meraki-blue-dark disabled:text-meraki-gray-400 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <span className="text-meraki-gray-300">|</span>
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled || selectedFocus.length === 0}
            className="text-xs text-meraki-blue hover:text-meraki-blue-dark disabled:text-meraki-gray-400 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {NEWS_FOCUS_AREAS.map((focus) => {
          const isSelected = selectedFocus.includes(focus.id);

          return (
            <button
              key={focus.id}
              type="button"
              onClick={() => toggleFocus(focus.id)}
              disabled={disabled}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5 text-meraki-blue'
                  : 'border-meraki-gray-200 text-meraki-gray-600 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              title={focus.description}
            >
              {focusIcons[focus.id]}
              <span>{focus.name}</span>
              {isSelected && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-meraki-gray-400">
        {selectedFocus.length > 0
          ? `Prioritizing ${selectedFocus.length} topic${selectedFocus.length > 1 ? 's' : ''} in news coverage`
          : 'All topics will be covered equally'}
      </p>
    </div>
  );
}
