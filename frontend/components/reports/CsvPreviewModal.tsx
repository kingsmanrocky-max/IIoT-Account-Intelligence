'use client';

import { useState } from 'react';
import { X, Check, AlertCircle, ChevronRight } from 'lucide-react';

interface NormalizedCompany {
  originalName: string;
  validatedName: string;
  confidence: string;
  isValid: boolean;
}

interface CsvPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: NormalizedCompany[];
  originalCount: number;
  onConfirm: (selectedCompanies: string[]) => void;
}

export default function CsvPreviewModal({
  isOpen,
  onClose,
  companies,
  originalCount,
  onConfirm,
}: CsvPreviewModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(companies.map((_, i) => i))
  );

  if (!isOpen) return null;

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const toggleAll = () => {
    if (selectedIndices.size === companies.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(companies.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const selectedCompanies = companies
      .filter((_, i) => selectedIndices.has(i))
      .map((c) => c.validatedName);
    onConfirm(selectedCompanies);
    onClose();
  };

  const validCount = companies.filter((c) => c.isValid).length;
  const invalidCount = companies.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">CSV Upload Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Found {companies.length} companies from {originalCount} rows
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-700">
                {validCount} valid {validCount === 1 ? 'company' : 'companies'}
              </span>
            </div>
            {invalidCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-sm text-gray-700">
                  {invalidCount} {invalidCount === 1 ? 'needs' : 'need'} review
                </span>
              </div>
            )}
            <div className="ml-auto">
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIndices.size === companies.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>
        </div>

        {/* Company List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {companies.map((company, index) => (
              <div
                key={index}
                onClick={() => toggleSelection(index)}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    selectedIndices.has(index)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0">
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        selectedIndices.has(index)
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }
                    `}
                  >
                    {selectedIndices.has(index) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>

                {/* Company Info */}
                <div className="flex-1 min-w-0">
                  {company.originalName === company.validatedName ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {company.validatedName}
                      </p>
                      {company.isValid && (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500 truncate">
                        {company.originalName}
                      </p>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {company.validatedName}
                      </p>
                      {company.isValid && (
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  )}

                  {/* Confidence Badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`
                        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${
                          company.confidence === 'HIGH'
                            ? 'bg-green-100 text-green-800'
                            : company.confidence === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }
                      `}
                    >
                      {company.confidence.toLowerCase()} confidence
                    </span>
                    {!company.isValid && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertCircle className="w-3 h-3" />
                        Needs review
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedIndices.size} of {companies.length} companies selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIndices.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {selectedIndices.size} {selectedIndices.size === 1 ? 'Company' : 'Companies'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
