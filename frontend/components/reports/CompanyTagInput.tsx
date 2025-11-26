'use client';

import { useState, KeyboardEvent, useRef } from 'react';
import { X, Building2 } from 'lucide-react';

interface CompanyTagInputProps {
  companies: string[];
  onCompaniesChange: (companies: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxCompanies?: number;
}

export default function CompanyTagInput({
  companies,
  onCompaniesChange,
  placeholder = 'Type company name and press Enter',
  disabled = false,
  maxCompanies = 20,
}: CompanyTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addCompany = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !companies.includes(trimmed) && companies.length < maxCompanies) {
      onCompaniesChange([...companies, trimmed]);
    }
  };

  const removeCompany = (index: number) => {
    onCompaniesChange(companies.filter((_, i) => i !== index));
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
    // Support comma-separated paste
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
          {companies.map((company, index) => (
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
          ))}

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
        <p className="text-xs text-meraki-gray-400">
          Press Enter or comma to add, paste comma-separated names
        </p>
        <span className={`text-xs ${companies.length >= maxCompanies ? 'text-amber-600' : 'text-meraki-gray-400'}`}>
          {companies.length}/{maxCompanies} companies
        </span>
      </div>
    </div>
  );
}
