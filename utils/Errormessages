// utils/errorMessages.js
// Enhanced error messaging for better user feedback

/**
 * Error types and their user-friendly messages
 */
export class ParsingError extends Error {
  constructor(type, details = {}) {
    super();
    this.type = type;
    this.details = details;
    this.message = this.generateMessage();
  }
  
  generateMessage() {
    switch (this.type) {
      case 'PDF_TOO_LARGE':
        return `This PDF is too large (${this.details.pageCount} pages). Maximum allowed is ${this.details.maxPages} pages. Please upload a shorter statement period.`;
      
      case 'PDF_EMPTY':
        return 'This PDF appears to be empty or corrupted. Please ensure you\'ve uploaded a valid bank statement.';
      
      case 'PDF_SCANNED':
        return 'This PDF appears to be a scanned image. OnlyBanks requires digital bank statements with selectable text. Please download a digital version from your bank\'s website.';
      
      case 'BANK_NOT_RECOGNIZED':
        return `We couldn't identify which bank this statement is from. OnlyBanks currently supports: Chase, Monzo, Santander, Barclays, and Lloyds/Halifax. ${this.details.detectedText ? `\n\nDetected: "${this.details.detectedText.substring(0, 100)}..."` : ''}`;
      
      case 'NO_TRANSACTIONS_FOUND':
        return `We found a ${this.details.bankType || 'bank'} statement, but couldn't extract any transactions. This might be:\n• A summary page without transaction details\n• A statement format we don't recognize yet\n• A corrupted or incomplete PDF\n\nPlease try uploading the full statement PDF.`;
      
      case 'LOW_CONFIDENCE_PARSE':
        return `We found ${this.details.transactionCount} potential transactions, but we're only ${Math.round(this.details.confidence * 100)}% confident they're correct. Please review the results carefully and report any issues.`;
      
      case 'INVALID_DATES':
        return `Found ${this.details.transactionCount} transactions, but ${this.details.invalidCount} have invalid dates. This might be a statement from an unsupported bank or format.`;
      
      case 'GENERIC_PARSER_FAILED':
        return `We tried multiple parsing methods but couldn't reliably extract transactions from this PDF. Found ${this.details.candidateLines || 0} potential transaction lines, but none matched expected patterns.\n\nThis statement format isn't currently supported. Please contact support with your bank name.`;
      
      case 'DUPLICATE_FILE':
        return `This file appears to be a duplicate or very similar to "${this.details.fileName}". The transactions have already been loaded.`;
      
      case 'UNSUPPORTED_BANK':
        return `Detected: ${this.details.bankName}\n\nThis bank isn't currently supported. OnlyBanks works with:\n✓ Chase\n✓ Monzo\n✓ Santander\n✓ Barclays\n✓ Lloyds/Halifax\n\nWe're working on adding more banks. Please contact us to request support for ${this.details.bankName}.`;
      
      default:
        return `An unexpected error occurred: ${this.details.message || 'Unknown error'}`;
    }
  }
  
  /**
   * Get user-friendly suggestions for fixing the error
   */
  getSuggestions() {
    switch (this.type) {
      case 'PDF_TOO_LARGE':
        return [
          'Download a statement for a shorter period (e.g., 1 month instead of 12)',
          'Split large PDFs into smaller files',
          'Contact your bank for statements in CSV format'
        ];
      
      case 'PDF_SCANNED':
        return [
          'Log into your online banking',
          'Request a "digital" or "downloadable" statement (not PDF)',
          'Ensure the statement has selectable text (you should be able to highlight text)'
        ];
      
      case 'BANK_NOT_RECOGNIZED':
        return [
          'Verify this is a bank statement (not a letter or summary)',
          'Try a different statement period',
          'Check if your bank is in our supported list',
          'Contact us to request support for your bank'
        ];
      
      case 'NO_TRANSACTIONS_FOUND':
        return [
          'Ensure you\'ve uploaded the full statement (all pages)',
          'Try a different month\'s statement',
          'Check the PDF isn\'t password protected',
          'Download the statement again from your bank'
        ];
      
      case 'LOW_CONFIDENCE_PARSE':
        return [
          'Review the transactions carefully',
          'Check dates are in the correct format',
          'Verify amounts match your actual statement',
          'If issues persist, try the demo data to see expected results'
        ];
      
      case 'GENERIC_PARSER_FAILED':
        return [
          'Verify this is a transaction statement (not account summary)',
          'Try uploading a statement from a different month',
          'Check if your bank recently changed their PDF format',
          'Contact support with your bank name for assistance'
        ];
      
      default:
        return [
          'Try uploading the file again',
          'Check your internet connection',
          'Try a different browser',
          'Contact support if the problem persists'
        ];
    }
  }
  
  /**
   * Get the severity level for UI display
   */
  getSeverity() {
    switch (this.type) {
      case 'LOW_CONFIDENCE_PARSE':
        return 'warning';
      
      case 'PDF_TOO_LARGE':
      case 'PDF_SCANNED':
      case 'DUPLICATE_FILE':
        return 'info';
      
      default:
        return 'error';
    }
  }
}

/**
 * Detect specific error conditions from PDF content
 */
export const detectPDFIssues = (rawText, pageCount) => {
  const issues = [];
  
  // Check if PDF is too large
  if (pageCount > 50) {
    issues.push({
      type: 'PDF_TOO_LARGE',
      details: { pageCount, maxPages: 50 }
    });
  }
  
  // Check if PDF is empty
  if (!rawText || rawText.trim().length < 50) {
    issues.push({
      type: 'PDF_EMPTY',
      details: { textLength: rawText?.length || 0 }
    });
  }
  
  // Check if PDF might be scanned (very few text items, or lots of OCR-style artifacts)
  const wordCount = rawText.split(/\s+/).length;
  const avgWordLength = rawText.length / wordCount;
  
  if (wordCount < 100 && pageCount > 1) {
    issues.push({
      type: 'PDF_SCANNED',
      details: { wordCount, pageCount }
    });
  }
  
  return issues;
};

/**
 * Analyze parsing results and generate appropriate warnings
 */
export const analyzeParsingResults = (transactions, parserUsed, confidence) => {
  const warnings = [];
  
  // Low confidence warning
  if (confidence < 0.7) {
    warnings.push({
      type: 'LOW_CONFIDENCE_PARSE',
      details: {
        transactionCount: transactions.length,
        confidence: confidence,
        parserUsed: parserUsed
      }
    });
  }
  
  // Check for invalid dates
  const invalidDates = transactions.filter(t => {
    const date = new Date(t.date);
    const year = date.getFullYear();
    return year < 2020 || year > new Date().getFullYear() + 1;
  });
  
  if (invalidDates.length > 0) {
    warnings.push({
      type: 'INVALID_DATES',
      details: {
        transactionCount: transactions.length,
        invalidCount: invalidDates.length
      }
    });
  }
  
  // Check for suspiciously uniform amounts (might indicate parsing error)
  const amounts = transactions.map(t => t.amount);
  const uniqueAmounts = new Set(amounts).size;
  
  if (uniqueAmounts < transactions.length * 0.3 && transactions.length > 10) {
    warnings.push({
      type: 'SUSPICIOUS_UNIFORMITY',
      details: {
        transactionCount: transactions.length,
        uniqueAmounts: uniqueAmounts,
        message: 'Many transactions have the same amount - this might indicate a parsing error'
      }
    });
  }
  
  return warnings;
};

/**
 * Format error for display in UI
 */
export const formatErrorForUI = (error) => {
  if (error instanceof ParsingError) {
    return {
      severity: error.getSeverity(),
      message: error.message,
      suggestions: error.getSuggestions(),
      details: error.details
    };
  }
  
  // Handle standard JavaScript errors
  return {
    severity: 'error',
    message: error.message || 'An unexpected error occurred',
    suggestions: [
      'Try uploading the file again',
      'Check your internet connection',
      'Contact support if the problem persists'
    ],
    details: {}
  };
};
