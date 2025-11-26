import { EnrichCompanyResponse } from '../api';

export type ValidationStatus = 'idle' | 'validating' | 'validated' | 'error';

export interface ValidatedCompany {
  originalName: string;
  validatedName?: string;
  status: ValidationStatus;
  enrichedData?: EnrichCompanyResponse;
  isAccepted: boolean;
  errorMessage?: string;
}

export interface ValidationState {
  companies: Map<number, ValidatedCompany>;
  isValidatingAll: boolean;
}
