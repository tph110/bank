'use client';
import { useState } from 'react';
import { parseStatement } from '@/utils/moneyHelper';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPE = 'application/pdf';

export default function FileUploader({ onDataLoaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset states
    setError(null);
    setProgress('');

    // Validate file type
    if (file.type !== ALLOWED_FILE_TYPE) {
      setError('Please upload a PDF file only.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      return;
    }

    setLoading(true);
    setProgress('Loading PDF...');

    try {
      // Lazy load PDF parser
      setProgress('Initializing PDF reader...');
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      setProgress('Reading file...');
      const arrayBuffer = await file.arrayBuffer();
      
      setProgress('Processing PDF...');
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Validate page count
      const pageCount = pdf.numPages;
      if (pageCount > 50) {
        throw new Error('PDF too large - maximum 50 pages allowed');
      }

      setProgress(`Extracting text from ${pageCount} page${pageCount > 1 ? 's' : ''}...`);
      
      let fullText = '';
      for (let i = 1; i <= pageCount; i++) {
        setProgress(`Processing page ${i} of ${pageCount}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }

      // Validate extracted text
      if (fullText.trim().length < 50) {
        throw new Error('Could not extract readable text from PDF. The file may be scanned or corrupted.');
      }

      setProgress('Analyzing transactions...');
      const data = parseStatement(fullText, pageCount);
      
      if (data.length === 0) {
        throw new Error('No transactions found. Please check if this is a valid bank statement.');
      }

      setProgress(`Found ${data.length} transactions!`);
      
      // Small delay to show success message
      setTimeout(() => {
        onDataLoaded(data);
        setLoading(false);
        setProgress('');
      }, 500);

    } catch (err) {
      console.error('PDF Processing Error:', err);
      
      // Provide specific error messages
      let errorMessage = 'Failed to process PDF. ';
      
      if (err.message.includes('Bank not recognised')) {
        errorMessage = '❌ Bank not recognized. Currently supporting Chase and Monzo bank statements only.';
      } else if (err.message.includes('No transactions found')) {
        errorMessage = '❌ No transactions detected. Please ensure this is a valid bank statement.';
      } else if (err.message.includes('PDF too large')) {
        errorMessage = '❌ PDF has too many pages. Maximum 50 pages allowed.';
      } else if (err.message.includes('extract readable text')) {
        errorMessage = '❌ Could not read PDF. It may be password-protected, scanned, or corrupted.';
      } else if (err.message.includes('password')) {
        errorMessage = '❌ This PDF appears to be password-protected. Please upload an unlocked version.';
      } else {
        errorMessage = `❌ ${err.message || 'An unexpected error occurred. Please try again.'}`;
      }
      
      setError(errorMessage);
      setLoading(false);
      setProgress('');
    }

    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition"
        role="region"
        aria-label="File upload area"
      >
        <p className="text-xl font-semibold text-blue-600 mb-2">
          Upload Bank Statement
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supports Chase & Monzo PDFs (Max 10MB, 50 pages)
        </p>
        
        {loading ? (
          <div className="space-y-3">
            <div className="animate-pulse flex justify-center">
              <div className="h-3 w-64 bg-blue-200 rounded"></div>
            </div>
            <p className="text-blue-500 text-sm font-medium">{progress}</p>
            <p className="text-gray-400 text-xs">Please wait, this may take a moment...</p>
          </div>
        ) : (
          <label className="cursor-pointer">
            <input 
              type="file" 
              accept=".pdf,application/pdf" 
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
              aria-label="Upload PDF bank statement"
            />
            <span className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
              Choose PDF File
            </span>
          </label>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">🔒 Privacy First</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>✓ All processing happens in your browser</li>
          <li>✓ Your data never leaves your device</li>
          <li>✓ No server uploads or storage</li>
          <li>✓ Refresh the page to clear all data</li>
        </ul>
      </div>

      {/* Supported Banks */}
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-2">Currently Supported Banks:</p>
        <div className="flex flex-wrap justify-center gap-2 items-center">
          <span className="px-3 py-1 bg-blue-100 rounded text-xs font-medium text-blue-700">
            Chase UK
          </span>
          <span className="px-3 py-1 bg-pink-100 rounded text-xs font-medium text-pink-700">
            Monzo
          </span>
          <span className="px-3 py-1 bg-purple-100 rounded text-xs font-medium text-purple-700">
            Starling
          </span>
          <span className="px-3 py-1 bg-teal-100 rounded text-xs font-medium text-teal-700">
            Barclays
          </span>
          <span className="px-3 py-1 bg-red-100 rounded text-xs font-medium text-red-700">
            Santander
          </span>
          <span className="px-3 py-1 bg-green-100 rounded text-xs font-medium text-green-700">
            Lloyds
          </span>
          <span className="px-3 py-1 bg-indigo-100 rounded text-xs font-medium text-indigo-700">
            Revolut
          </span>
        </div>
      </div>
    </div>
  );
}
