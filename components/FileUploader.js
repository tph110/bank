'use client';
import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { parseStatement } from '../utils/moneyHelper';
import { formatErrorForUI, ParsingError } from '../utils/errorMessages';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function FileUploader({ onDataParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Now stores full error object
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [warnings, setWarnings] = useState([]); // For non-critical warnings

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // ✅ Filter only PDF files
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      setError({
        severity: 'error',
        message: 'Please select at least one PDF file',
        suggestions: ['Ensure you\'re uploading PDF files (.pdf extension)', 'Check that the file isn\'t corrupted']
      });
      return;
    }

    if (pdfFiles.length > 10) {
      setError({
        severity: 'error',
        message: 'Maximum 10 PDF files allowed at once',
        suggestions: ['Split your upload into multiple batches', 'Select only the most recent statements']
      });
      return;
    }

    setLoading(true);
    setError(null);
    setWarnings([]);
    setProgress({ current: 0, total: pdfFiles.length, fileName: '' });

    try {
      const allTransactions = [];
      let combinedBankType = '';
      const fileWarnings = [];

      // ✅ Process each PDF file
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        setProgress({ current: i + 1, total: pdfFiles.length, fileName: file.name });

        try {
          // Extract text from PDF
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pageCount = pdf.numPages;

          let fullText = '';
          for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
          }

          // ✅ Parse the statement with enhanced error handling
          const transactions = parseStatement(fullText, pageCount);
          
          // ✅ Check for low confidence warnings
          if (transactions.length > 0 && transactions[0].confidence < 0.8) {
            fileWarnings.push({
              file: file.name,
              message: `Parsed with ${Math.round(transactions[0].confidence * 100)}% confidence - please review carefully`,
              severity: 'warning'
            });
          }
          
          // ✅ Add source file info to each transaction
          const transactionsWithSource = transactions.map(t => ({
            ...t,
            sourceFile: file.name,
            id: `${file.name}_${t.id}` // Make IDs unique across files
          }));

          allTransactions.push(...transactionsWithSource);

          // Track bank types
          if (i === 0) {
            combinedBankType = transactions[0]?.parserUsed || 'Unknown';
          } else if (transactions[0]?.parserUsed !== combinedBankType) {
            combinedBankType = 'Multiple Banks';
          }

          console.log(`✅ Processed ${file.name}: ${transactions.length} transactions (${transactions[0]?.parserUsed || 'Unknown'})`);

        } catch (fileError) {
          console.error(`❌ Error processing ${file.name}:`, fileError);
          
          // ✅ Handle ParsingError with enhanced messaging
          if (fileError instanceof ParsingError) {
            const formattedError = formatErrorForUI(fileError);
            
            if (formattedError.severity === 'error') {
              // Critical error - stop processing
              throw fileError;
            } else {
              // Warning - continue with other files
              fileWarnings.push({
                file: file.name,
                message: formattedError.message,
                suggestions: formattedError.suggestions,
                severity: formattedError.severity
              });
            }
          } else {
            // Unknown error
            fileWarnings.push({
              file: file.name,
              message: `Failed to process: ${fileError.message}`,
              severity: 'error'
            });
          }
        }
      }

      if (allTransactions.length === 0) {
        throw new ParsingError('NO_TRANSACTIONS_FOUND', {
          bankType: combinedBankType,
          filesProcessed: pdfFiles.length
        });
      }

      // ✅ Sort all transactions by date (newest first)
      allTransactions.sort((a, b) => b.date.localeCompare(a.date));

      // ✅ Remove duplicate transactions (same date, description, amount)
      const uniqueTransactions = [];
      const seen = new Set();

      for (const transaction of allTransactions) {
        const key = `${transaction.date}_${transaction.description}_${transaction.amount}_${transaction.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueTransactions.push(transaction);
        }
      }

      const duplicatesRemoved = allTransactions.length - uniqueTransactions.length;
      if (duplicatesRemoved > 0) {
        console.log(`🔄 Removed ${duplicatesRemoved} duplicate transactions`);
        fileWarnings.push({
          message: `Removed ${duplicatesRemoved} duplicate transactions`,
          severity: 'info'
        });
      }

      console.log(`✅ Total: ${uniqueTransactions.length} unique transactions from ${pdfFiles.length} file(s)`);

      // Set warnings if any
      if (fileWarnings.length > 0) {
        setWarnings(fileWarnings);
      }

      // Send to parent component
      onDataParsed(uniqueTransactions);

      setLoading(false);
      setError(null);

    } catch (err) {
      console.error('Upload error:', err);
      
      // ✅ Format error for display
      const formattedError = formatErrorForUI(err);
      setError(formattedError);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileUpload}
          disabled={loading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-600">
                    Processing {progress.current} of {progress.total} files...
                  </span>
                </div>
                {progress.fileName && (
                  <p className="text-xs text-slate-500 truncate max-w-md mx-auto">
                    {progress.fileName}
                  </p>
                )}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    Upload Bank Statements
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Select one or more PDF files (max 10)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports: Chase, Monzo, Santander, Barclays, Lloyds, Halifax
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose Files
                </button>
              </>
            )}
          </div>
        </label>
      </div>

      {/* ✅ Enhanced Error Display */}
      {error && (
        <div className={`p-4 rounded-lg border ${
          error.severity === 'error' ? 'bg-red-50 border-red-200' :
          error.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                error.severity === 'error' ? 'text-red-600' :
                error.severity === 'warning' ? 'text-amber-600' :
                'text-blue-600'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                error.severity === 'error' ? 'text-red-800' :
                error.severity === 'warning' ? 'text-amber-800' :
                'text-blue-800'
              }`}>
                {error.severity === 'error' ? 'Upload Error' :
                 error.severity === 'warning' ? 'Warning' :
                 'Information'}
              </p>
              <p className={`text-sm mt-1 whitespace-pre-line ${
                error.severity === 'error' ? 'text-red-700' :
                error.severity === 'warning' ? 'text-amber-700' :
                'text-blue-700'
              }`}>
                {error.message}
              </p>
              
              {/* ✅ Display Suggestions */}
              {error.suggestions && error.suggestions.length > 0 && (
                <div className="mt-3">
                  <p className={`text-xs font-semibold ${
                    error.severity === 'error' ? 'text-red-800' :
                    error.severity === 'warning' ? 'text-amber-800' :
                    'text-blue-800'
                  }`}>
                    Try this:
                  </p>
                  <ul className={`mt-1 space-y-1 text-xs ${
                    error.severity === 'error' ? 'text-red-700' :
                    error.severity === 'warning' ? 'text-amber-700' :
                    'text-blue-700'
                  }`}>
                    {error.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Warnings Display */}
      {warnings.length > 0 && !error && (
        <div className="space-y-2">
          {warnings.map((warning, idx) => (
            <div key={idx} className={`p-3 rounded-lg border text-sm ${
              warning.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              warning.severity === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-start gap-2">
                <span className="font-medium">{warning.file ? `${warning.file}: ` : ''}</span>
                <span>{warning.message}</span>
              </div>
              {warning.suggestions && (
                <ul className="mt-2 ml-4 space-y-1 text-xs">
                  {warning.suggestions.map((suggestion, sidx) => (
                    <li key={sidx}>• {suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
