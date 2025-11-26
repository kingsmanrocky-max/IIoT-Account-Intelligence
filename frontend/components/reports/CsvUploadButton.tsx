'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';

export interface CsvUploadResult {
  originalCount: number;
  normalizedCompanies: Array<{
    originalName: string;
    validatedName: string;
    confidence: string;
    isValid: boolean;
  }>;
}

interface CsvUploadButtonProps {
  onUploadComplete: (result: CsvUploadResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function CsvUploadButton({
  onUploadComplete,
  onError,
  disabled = false,
}: CsvUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current && !disabled && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      const errorMsg = 'Please upload a .csv file';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Validate file size (1MB max)
    const MAX_SIZE = 1048576; // 1MB
    if (file.size > MAX_SIZE) {
      const errorMsg = 'File size must be less than 1MB';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/parse-csv-companies', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload CSV');
      }

      const result = await response.json();

      if (result.success && result.data) {
        onUploadComplete(result.data);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload CSV file';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsUploading(false);
      // Reset file input so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Upload CSV</span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
