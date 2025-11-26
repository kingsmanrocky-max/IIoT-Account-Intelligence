'use client';

import { OUTPUT_STYLES, DEFAULT_OUTPUT_STYLE } from '@/lib/constants/news-digest';
import { ListChecks, BookOpen, Mic } from 'lucide-react';

interface OutputStyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
  disabled?: boolean;
}

const styleIcons: Record<string, React.ReactNode> = {
  'executive-brief': <ListChecks className="w-5 h-5" />,
  'narrative': <BookOpen className="w-5 h-5" />,
  'podcast-ready': <Mic className="w-5 h-5" />,
};

export default function OutputStyleSelector({
  value = DEFAULT_OUTPUT_STYLE,
  onChange,
  disabled = false,
}: OutputStyleSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-meraki-gray-700">
        Output Style
      </label>

      <div className="grid grid-cols-3 gap-3">
        {OUTPUT_STYLES.map((style) => {
          const isSelected = value === style.id;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              disabled={disabled}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5 text-meraki-blue'
                  : 'border-meraki-gray-200 text-meraki-gray-600 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-meraki-blue/10' : 'bg-meraki-gray-100'}`}>
                {styleIcons[style.id]}
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{style.label}</div>
                <div className="text-xs text-meraki-gray-400 mt-0.5">
                  {style.description}
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
        {value === 'executive-brief' && 'Scannable bullet points with key metrics and highlights'}
        {value === 'narrative' && 'Flowing prose that tells a connected story'}
        {value === 'podcast-ready' && 'Conversational format ideal for reading aloud'}
      </p>
    </div>
  );
}
