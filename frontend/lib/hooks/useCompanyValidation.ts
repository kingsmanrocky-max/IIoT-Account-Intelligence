import { useState, useCallback } from 'react';
import { reportsAPI } from '../api';
import { ValidatedCompany, ValidationStatus } from '../types/company-validation';

export interface UseCompanyValidationResult {
  validationMap: Map<number, ValidatedCompany>;
  isValidatingAll: boolean;
  validateSingle: (index: number, companyName: string) => Promise<void>;
  validateAll: (companies: string[]) => Promise<void>;
  acceptValidation: (index: number) => void;
  rejectValidation: (index: number) => void;
  getValidationStatus: (index: number) => ValidationStatus;
  getValidatedName: (index: number) => string | undefined;
  clearValidation: (index: number) => void;
  clearAllValidations: () => void;
}

const MAX_CONCURRENT_VALIDATIONS = 3;

export function useCompanyValidation(): UseCompanyValidationResult {
  const [validationMap, setValidationMap] = useState<Map<number, ValidatedCompany>>(new Map());
  const [isValidatingAll, setIsValidatingAll] = useState(false);

  const validateSingle = useCallback(async (index: number, companyName: string) => {
    if (!companyName.trim()) return;

    // Set validating status
    setValidationMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(index, {
        originalName: companyName,
        status: 'validating',
        isAccepted: false,
      });
      return newMap;
    });

    try {
      const response = await reportsAPI.enrichCompany(companyName.trim());
      const enrichedData = response.data.data;

      setValidationMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(index, {
          originalName: companyName,
          validatedName: enrichedData.validatedName,
          status: 'validated',
          enrichedData,
          isAccepted: false,
        });
        return newMap;
      });
    } catch (error) {
      console.error('Failed to validate company:', error);
      setValidationMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(index, {
          originalName: companyName,
          status: 'error',
          isAccepted: false,
          errorMessage: 'Failed to validate company name',
        });
        return newMap;
      });
    }
  }, []);

  const validateAll = useCallback(async (companies: string[]) => {
    if (companies.length === 0) return;

    setIsValidatingAll(true);

    // Initialize all companies as validating
    setValidationMap((prev) => {
      const newMap = new Map(prev);
      companies.forEach((company, index) => {
        if (company.trim()) {
          newMap.set(index, {
            originalName: company,
            status: 'validating',
            isAccepted: false,
          });
        }
      });
      return newMap;
    });

    // Process companies in batches with max concurrent requests
    const validationPromises: Promise<void>[] = [];

    for (let i = 0; i < companies.length; i += MAX_CONCURRENT_VALIDATIONS) {
      const batch = companies.slice(i, i + MAX_CONCURRENT_VALIDATIONS);
      const batchPromises = batch.map((company, batchIndex) => {
        const actualIndex = i + batchIndex;
        if (!company.trim()) return Promise.resolve();
        return validateSingle(actualIndex, company);
      });

      // Wait for this batch to complete before starting the next
      await Promise.all(batchPromises);
    }

    setIsValidatingAll(false);
  }, [validateSingle]);

  const acceptValidation = useCallback((index: number) => {
    setValidationMap((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(index);
      if (existing) {
        newMap.set(index, {
          ...existing,
          isAccepted: true,
        });
      }
      return newMap;
    });
  }, []);

  const rejectValidation = useCallback((index: number) => {
    setValidationMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  }, []);

  const getValidationStatus = useCallback((index: number): ValidationStatus => {
    return validationMap.get(index)?.status || 'idle';
  }, [validationMap]);

  const getValidatedName = useCallback((index: number): string | undefined => {
    const validation = validationMap.get(index);
    if (validation?.isAccepted && validation.validatedName) {
      return validation.validatedName;
    }
    return undefined;
  }, [validationMap]);

  const clearValidation = useCallback((index: number) => {
    setValidationMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  }, []);

  const clearAllValidations = useCallback(() => {
    setValidationMap(new Map());
  }, []);

  return {
    validationMap,
    isValidatingAll,
    validateSingle,
    validateAll,
    acceptValidation,
    rejectValidation,
    getValidationStatus,
    getValidatedName,
    clearValidation,
    clearAllValidations,
  };
}
