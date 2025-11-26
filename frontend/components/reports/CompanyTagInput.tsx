'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { X, Building2, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useCompanyValidation } from '@/lib/hooks/useCompanyValidation';
import CsvUploadButton, { CsvUploadResult } from './CsvUploadButton';
import CsvPreviewModal from './CsvPreviewModal';

interface CompanyTagInputProps {
  companies: string[];
  onCompaniesChange: (companies: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxCompanies?: number;
  enableValidation?: boolean;
}

export default function CompanyTagInput({
  companies,
  onCompaniesChange,
  placeholder = 'Type company name and press Enter',
  disabled = false,
  maxCompanies = 20,
  enableValidation = false,
}: CompanyTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvUploadResult, setCsvUploadResult] = useState<CsvUploadResult | null>(null);

  const {
    validationMap,
    isValidatingAll,
    validateSingle,
    validateAll,
    acceptValidation,
    rejectValidation,
    getValidationStatus,
    getValidatedName,
    clearValidation,
  } = useCompanyValidation();

  const addCompany = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !companies.includes(trimmed) && companies.length < maxCompanies) {
      onCompaniesChange([...companies, trimmed]);
    }
  };

  const removeCompany = (index: number) => {
    onCompaniesChange(companies.filter((_, i) => i !== index));
    clearValidation(index);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCompany(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && companies.length > 0) {
      removeCompany(companies.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedCompanies = pastedText.split(',').map(s => s.trim()).filter(Boolean);
    const newCompanies = [...companies];
    for (const company of pastedCompanies) {
      if (!newCompanies.includes(company) && newCompanies.length < maxCompanies) {
        newCompanies.push(company);
      }
    }
    onCompaniesChange(newCompanies);
    setInputValue('');
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleValidateSingle = async (index: number) => {
    await validateSingle(index, companies[index]);
  };

  const handleValidateAll = async () => {
    await validateAll(companies);
  };

  const handleAcceptValidation = (index: number) => {
    const validatedName = getValidatedName(index);
    if (validatedName) {
      acceptValidation(index);
      const newCompanies = [...companies];
      newCompanies[index] = validatedName;
      onCompaniesChange(newCompanies);
    }
  };

  const handleRejectValidation = (index: number) => {
    rejectValidation(index);
  };

  const handleCsvUploadComplete = (result: CsvUploadResult) => {
    setCsvUploadResult(result);
    setShowCsvPreview(true);
  };

  const handleCsvUploadError = (error: string) => {
    console.error('CSV upload error:', error);
  };

  const handleCsvConfirm = (selectedCompanies: string[]) => {
    // Add selected companies up to the max limit
    const availableSlots = maxCompanies - companies.length;
    const companiesToAdd = selectedCompanies.slice(0, availableSlots).filter(
      (company) => !companies.includes(company)
    );

    if (companiesToAdd.length > 0) {
      onCompaniesChange([...companies, ...companiesToAdd]);
    }

    setShowCsvPreview(false);
    setCsvUploadResult(null);
  };

  const renderCompanyTag = (company: string, index: number) => {
    if (!enableValidation) {
      return (
        <span
          key={`${company}-${index}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-meraki-blue/10 text-meraki-blue rounded-full text-sm"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{company}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCompany(index);
              }}
              className="ml-0.5 p-0.5 hover:bg-meraki-blue/20 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
      );
    }

    const status = getValidationStatus(index);
    const validation = validationMap.get(index);

    // Unvalidated - blue tag with Validate button
    if (status === 'idle') {
      return (
        <span
          key={`${company}-${index}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-meraki-blue/10 text-meraki-blue rounded-full text-sm"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{company}</span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleValidateSingle(index);
                }}
                className="ml-1 px-2 py-0.5 text-xs bg-meraki-blue/20 hover:bg-meraki-blue/30 rounded transition-colors"
              >
                Validate
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCompany(index);
                }}
                className="ml-0.5 p-0.5 hover:bg-meraki-blue/20 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </span>
      );
    }

    // Validating - gray tag with spinner
    if (status === 'validating') {
      return (
        <span
          key={`${company}-${index}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-meraki-gray-200 text-meraki-gray-600 rounded-full text-sm"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{company}</span>
        </span>
      );
    }

    // Validated (pending acceptance) - amber tag with accept/reject buttons
    if (status === 'validated' && !validation?.isAccepted) {
      return (
        <span
          key={`${company}-${index}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="flex items-center gap-1">
            <span className="line-through opacity-60">{validation?.originalName}</span>
            <span className="text-xs">→</span>
            <span className="font-medium">{validation?.validatedName}</span>
          </span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptValidation(index);
                }}
                className="ml-1 p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                title="Accept validated name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejectValidation(index);
                }}
                className="p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                title="Keep original name"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </span>
      );
    }

    // Validated (accepted) - green tag with checkmark
    if (status === 'validated' && validation?.isAccepted) {
      return (
        <span
          key={`${company}-${index}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{company}</span>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCompany(index);
              }}
              className="ml-0.5 p-0.5 hover:bg-green-200 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
      );
    }

    // Error - red tag with Retry button
    if (status === 'error') {
      return (
        <span
          key={`${company}-${index}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{company}</span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleValidateSingle(index);
                }}
                className="ml-1 px-2 py-0.5 text-xs bg-red-200 hover:bg-red-300 rounded transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCompany(index);
                }}
                className="ml-0.5 p-0.5 hover:bg-red-200 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </span>
      );
    }

    // Fallback to default
    return (
      <span
        key={`${company}-${index}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-meraki-blue/10 text-meraki-blue rounded-full text-sm"
      >
        <Building2 className="w-3.5 h-3.5" />
        <span>{company}</span>
        {!disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeCompany(index);
            }}
            className="ml-0.5 p-0.5 hover:bg-meraki-blue/20 rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-meraki-gray-700">
        Companies
      </label>

      <div
        onClick={handleContainerClick}
        className={`min-h-[100px] p-3 border rounded-lg bg-white transition-colors cursor-text ${
          disabled
            ? 'border-meraki-gray-200 bg-meraki-gray-50 cursor-not-allowed'
            : 'border-meraki-gray-300 focus-within:ring-2 focus-within:ring-meraki-blue focus-within:border-transparent'
        }`}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {companies.map((company, index) => renderCompanyTag(company, index))}

          {companies.length < maxCompanies && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={companies.length === 0 ? placeholder : 'Add another...'}
              disabled={disabled}
              className="flex-1 min-w-[150px] outline-none bg-transparent text-meraki-gray-900 placeholder-meraki-gray-400 disabled:cursor-not-allowed"
            />
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <p className="text-xs text-meraki-gray-400">
            Press Enter or comma to add, paste comma-separated names
          </p>
          {enableValidation && companies.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleValidateAll}
              disabled={isValidatingAll}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-meraki-blue hover:text-meraki-blue-dark bg-meraki-blue/10 hover:bg-meraki-blue/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidatingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Validate All ({companies.length})
                </>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!disabled && companies.length < maxCompanies && (
            <CsvUploadButton
              onUploadComplete={handleCsvUploadComplete}
              onError={handleCsvUploadError}
              disabled={disabled}
            />
          )}
          <span className={`text-xs ${companies.length >= maxCompanies ? 'text-amber-600' : 'text-meraki-gray-400'}`}>
            {companies.length}/{maxCompanies} companies
          </span>
        </div>
      </div>

      {/* CSV Preview Modal */}
      {csvUploadResult && (
        <CsvPreviewModal
          isOpen={showCsvPreview}
          onClose={() => {
            setShowCsvPreview(false);
            setCsvUploadResult(null);
          }}
          companies={csvUploadResult.normalizedCompanies}
          originalCount={csvUploadResult.originalCount}
          onConfirm={handleCsvConfirm}
        />
      )}
    </div>
  );
}
