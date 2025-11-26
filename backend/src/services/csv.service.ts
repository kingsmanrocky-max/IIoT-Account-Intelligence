import { parse } from 'csv-parse/sync';
import { logger } from '../utils/logger';

export interface ParsedCompany {
  name: string;
  rowIndex: number;
}

export interface CSVParseResult {
  companies: string[];
  originalCount: number;
  duplicatesRemoved: number;
  invalidEntriesSkipped: number;
}

const MAX_COMPANIES = 50;
const MAX_FILE_SIZE = 1048576; // 1MB

export class CSVService {
  /**
   * Parse CSV file buffer and extract company names
   */
  async parseCompaniesFromCSV(fileBuffer: Buffer, fileName: string): Promise<CSVParseResult> {
    try {
      // Validate file size
      if (fileBuffer.length > MAX_FILE_SIZE) {
        throw new Error('CSV file exceeds maximum size of 1MB');
      }

      // Validate file extension
      if (!fileName.toLowerCase().endsWith('.csv')) {
        throw new Error('Only .csv files are supported');
      }

      // Parse CSV
      const records = parse(fileBuffer, {
        columns: false, // Don't auto-detect headers
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow inconsistent column counts
      }) as string[][];

      if (records.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Extract company names
      const parsedCompanies = this.extractCompanyNames(records);

      // Deduplicate and validate
      const uniqueCompanies = this.deduplicateAndValidate(parsedCompanies);

      // Limit to MAX_COMPANIES
      const limitedCompanies = uniqueCompanies.slice(0, MAX_COMPANIES);

      const result: CSVParseResult = {
        companies: limitedCompanies,
        originalCount: parsedCompanies.length,
        duplicatesRemoved: parsedCompanies.length - uniqueCompanies.length,
        invalidEntriesSkipped: parsedCompanies.filter((c) => !this.isValidCompanyName(c.name)).length,
      };

      logger.info('CSV parsing complete', {
        fileName,
        companiesFound: result.companies.length,
        originalCount: result.originalCount,
        duplicatesRemoved: result.duplicatesRemoved,
      });

      return result;
    } catch (error) {
      logger.error('Failed to parse CSV file', { fileName, error });
      throw error;
    }
  }

  /**
   * Extract company names from CSV records
   * Tries multiple strategies:
   * 1. Look for "company" or "company_name" column header
   * 2. Use first column if no header found
   * 3. Skip obvious header rows
   */
  private extractCompanyNames(records: string[][]): ParsedCompany[] {
    const companies: ParsedCompany[] = [];

    // Check if first row is a header
    let startRow = 0;
    if (records.length > 0) {
      const firstRow = records[0];
      const possibleHeaders = ['company', 'company name', 'company_name', 'companyname', 'name', 'organization'];

      // Find company column index
      let companyColumnIndex = -1;

      for (let i = 0; i < firstRow.length; i++) {
        const cellValue = firstRow[i].toLowerCase().trim();
        if (possibleHeaders.includes(cellValue)) {
          companyColumnIndex = i;
          startRow = 1; // Skip header row
          break;
        }
      }

      // If no header found, use first column
      if (companyColumnIndex === -1) {
        companyColumnIndex = 0;

        // Check if first row looks like a header
        const firstCell = firstRow[0].toLowerCase().trim();
        if (possibleHeaders.includes(firstCell) || firstCell === 'company') {
          startRow = 1;
        }
      }

      // Extract companies
      for (let i = startRow; i < records.length; i++) {
        const row = records[i];
        if (row.length > companyColumnIndex) {
          const companyName = row[companyColumnIndex].trim();
          if (companyName) {
            companies.push({
              name: companyName,
              rowIndex: i + 1,
            });
          }
        }
      }
    }

    return companies;
  }

  /**
   * Deduplicate and validate company names
   */
  private deduplicateAndValidate(companies: ParsedCompany[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const company of companies) {
      const normalized = company.name.toLowerCase().trim();

      // Skip invalid names
      if (!this.isValidCompanyName(company.name)) {
        continue;
      }

      // Skip duplicates (case-insensitive)
      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      unique.push(company.name);
    }

    return unique;
  }

  /**
   * Validate company name
   */
  private isValidCompanyName(name: string): boolean {
    if (!name || name.trim().length === 0) {
      return false;
    }

    // Must be at least 2 characters
    if (name.trim().length < 2) {
      return false;
    }

    // Must not be just numbers
    if (/^\d+$/.test(name.trim())) {
      return false;
    }

    // Must not be obviously invalid
    const invalidPatterns = [
      /^n\/a$/i,
      /^none$/i,
      /^null$/i,
      /^undefined$/i,
      /^test$/i,
      /^example$/i,
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(name.trim())) {
        return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const csvService = new CSVService();
