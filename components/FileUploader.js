'use client';
import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { parseStatement } from '../utils/moneyHelper';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function FileUploader({ onDataParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // ✅ Filter only PDF files
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    if (pdfFiles.length > 10) {
      setError('Maximum 10 PDF files allowed at once');
      return;
    }

    setLoading(true);
    setError('');
    setProgress({ current: 0, total: pdfFiles.length, fileName: '' });

    try {
      const allTransactions = [];
      let combinedBankType = '';

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

          // Parse the statement
          const transactions = parseStatement(fullText, pageCount);
          
          // ✅ Add source file info to each transaction
          const transactionsWithSource = transactions.map(t => ({
            ...t,
            sourceFile: file.name,
            id: `${file.name}_${t.id}` // Make IDs unique across files
          }));

          allTransactions.push(...transactionsWithSource);

          // Track bank types
          if (i === 0) {
            if (fullText.includes('Chase')) combinedBankType = 'Chase';
            else if (fullText.includes('Monzo')) combinedBankType = 'Monzo';
            else if (fullText.includes('Santander')) combinedBankType = 'Santander';
            else if (fullText.includes('Barclays')) combinedBankType = 'Barclays';
            else if (fullText.includes('Lloyds') || fullText.includes('Halifax')) combinedBankType = 'Lloyds/Halifax';
          } else {
            combinedBankType = 'Multiple Banks';
          }

          console.log(`✅ Processed ${file.name}: ${transactions.length} transactions`);

        } catch (fileError) {
          console.error(`❌ Error processing ${file.name}:`, fileError);
          setError(`Error in ${file.name}: ${fileError.message}. Continuing with other files...`);
          // Continue processing other files
        }
      }

      if (allTransactions.length === 0) {
        throw new Error('No transactions found in any of the uploaded files');
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
      }

      console.log(`✅ Total: ${uniqueTransactions.length} unique transactions from ${pdfFiles.length} file(s)`);

      // Send to parent component
      onDataParsed(uniqueTransactions);

      setLoading(false);
      setError('');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process files');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept="application/pdf"
          multiple  // ✅ Enable multiple file selection
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

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Upload Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
