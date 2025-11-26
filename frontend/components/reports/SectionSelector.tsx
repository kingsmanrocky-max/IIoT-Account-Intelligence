'use client';

import { useEffect, useState } from 'react';
import { WorkflowType, SectionInfo, reportsAPI } from '@/lib/api';

interface SectionSelectorProps {
  workflowType: WorkflowType;
  selectedSections: string[];
  onSectionsChange: (sections: string[]) => void;
  disabled?: boolean;
}

export default function SectionSelector({
  workflowType,
  selectedSections,
  onSectionsChange,
  disabled = false,
}: SectionSelectorProps) {
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const response = await reportsAPI.getWorkflowSections(workflowType);
        setSections(response.data.data);
        // If no sections selected, select all by default
        if (selectedSections.length === 0) {
          onSectionsChange(response.data.data.map((s) => s.key));
        }
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, [workflowType]);

  const toggleSection = (sectionKey: string) => {
    if (selectedSections.includes(sectionKey)) {
      // Don't allow deselecting the last section
      if (selectedSections.length > 1) {
        onSectionsChange(selectedSections.filter((s) => s !== sectionKey));
      }
    } else {
      onSectionsChange([...selectedSections, sectionKey]);
    }
  };

  const selectAll = () => {
    onSectionsChange(sections.map((s) => s.key));
  };

  const deselectAll = () => {
    // Keep at least one section selected
    if (sections.length > 0) {
      onSectionsChange([sections[0].key]);
    }
  };

  if (loading) {
    return (
      <div className="p-4 border border-meraki-gray-200 rounded-lg">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 bg-meraki-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const allSelected = selectedSections.length === sections.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-meraki-gray-700">
          Report Sections
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            disabled={disabled || allSelected}
            className="text-xs text-meraki-blue hover:text-meraki-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <span className="text-meraki-gray-300">|</span>
          <button
            type="button"
            onClick={deselectAll}
            disabled={disabled || selectedSections.length <= 1}
            className="text-xs text-meraki-blue hover:text-meraki-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="border border-meraki-gray-200 rounded-lg overflow-hidden">
        {sections.map((section, index) => {
          const isSelected = selectedSections.includes(section.key);
          const isLast = selectedSections.length === 1 && isSelected;

          return (
            <label
              key={section.key}
              className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                index !== sections.length - 1 ? 'border-b border-meraki-gray-100' : ''
              } ${
                isSelected ? 'bg-meraki-blue/5' : 'hover:bg-meraki-gray-50'
              } ${disabled || isLast ? 'cursor-not-allowed' : ''}`}
            >
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSection(section.key)}
                  disabled={disabled || isLast}
                  className="h-4 w-4 text-meraki-blue border-meraki-gray-300 rounded focus:ring-meraki-blue disabled:opacity-50"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isSelected ? 'text-meraki-gray-900' : 'text-meraki-gray-600'}`}>
                    {section.name}
                  </span>
                  {isLast && (
                    <span className="text-xs bg-meraki-gray-100 text-meraki-gray-500 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-meraki-gray-400 mt-0.5">{section.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      <p className="text-xs text-meraki-gray-400">
        {selectedSections.length} of {sections.length} sections selected
      </p>
    </div>
  );
}
