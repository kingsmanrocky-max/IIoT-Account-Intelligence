'use client';

import { INDUSTRY_VERTICALS, IndustryVertical } from '@/lib/constants/cisco-products';
import { Factory, Zap, Truck, Building2, Flame, Globe } from 'lucide-react';

interface FocusAreaSelectorProps {
  selectedIndustry: string | null;
  onIndustryChange: (industry: string | null) => void;
  disabled?: boolean;
}

const industryIcons: Record<string, React.ReactNode> = {
  'manufacturing': <Factory className="w-5 h-5" />,
  'energy-utilities': <Zap className="w-5 h-5" />,
  'transportation': <Truck className="w-5 h-5" />,
  'smart-cities': <Building2 className="w-5 h-5" />,
  'oil-gas': <Flame className="w-5 h-5" />,
};

export default function FocusAreaSelector({
  selectedIndustry,
  onIndustryChange,
  disabled = false,
}: FocusAreaSelectorProps) {
  const selectedVertical = selectedIndustry
    ? INDUSTRY_VERTICALS.find((i) => i.id === selectedIndustry)
    : null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-meraki-gray-700">
        Industry Focus <span className="font-normal text-meraki-gray-400">(optional)</span>
      </label>

      <div className="flex flex-wrap gap-2">
        {/* No specific focus option */}
        <button
          type="button"
          onClick={() => onIndustryChange(null)}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
            selectedIndustry === null
              ? 'border-meraki-blue bg-meraki-blue/5 text-meraki-blue'
              : 'border-meraki-gray-200 text-meraki-gray-600 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <Globe className="w-4 h-4" />
          <span>General</span>
        </button>

        {/* Industry options */}
        {INDUSTRY_VERTICALS.map((industry) => {
          const isSelected = selectedIndustry === industry.id;

          return (
            <button
              key={industry.id}
              type="button"
              onClick={() => onIndustryChange(industry.id)}
              disabled={disabled}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                isSelected
                  ? 'border-meraki-blue bg-meraki-blue/5 text-meraki-blue'
                  : 'border-meraki-gray-200 text-meraki-gray-600 hover:border-meraki-gray-300 hover:bg-meraki-gray-50'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              {industryIcons[industry.id]}
              <span>{industry.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected industry details */}
      {selectedVertical && (
        <div className="p-3 bg-meraki-blue/5 border border-meraki-blue/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-meraki-blue/10 rounded text-meraki-blue">
              {industryIcons[selectedVertical.id]}
            </div>
            <div>
              <div className="font-medium text-meraki-gray-900 text-sm">
                {selectedVertical.name}
              </div>
              <div className="text-xs text-meraki-gray-500">
                {selectedVertical.description}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedVertical.useCases.map((useCase) => (
              <span
                key={useCase}
                className="text-xs bg-white border border-meraki-gray-200 text-meraki-gray-600 px-2 py-0.5 rounded"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-meraki-gray-400">
        {selectedIndustry
          ? 'Analysis will be tailored to this industry context'
          : 'Analysis will cover general competitive positioning'}
      </p>
    </div>
  );
}
