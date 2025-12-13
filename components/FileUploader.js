'use client';
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { parseStatement } from '../utils/moneyHelper';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function FileUploader({ onDataParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customRules, setCustomRules] = useState({});
  const [aiStatus, setAiStatus] = useState('');

  // Load custom rules on mount
  useEffect(() => {
    const savedRules = localStorage.getItem('categoryRules');
    if (savedRules) {
      setCustomRules(JSON.parse(savedRules));
    }
  }, []);

  // AI Enrichment Function
  const enrichWithAI = async (initialData) => {
    const unknown = initialData.filter(t => t.category === 'Other');
    
    if (unknown.length === 0) return;

    setAiStatus(`🤖 AI is categorising ${unknown.length} remaining items...`);

    const updatedTransactions = [...initialData];
    
    // Process in batches of 5 to avoid overwhelming the free API
    const batchSize = 5;
    for (let i = 0; i < unknown.length; i += batchSize) {
      const batch = unknown.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (t) => {
        try {
          const res = await fetch('/api/categorise', {
            method: 'POST',
            body: JSON.stringify({ description: t.description }),
          });
          
          if (res.ok) {
            const data = await res.json();
            // Update the transaction in the main list
            const index = updatedTransactions.findIndex(ut => ut.id === t.id);
            if (index !== -1 && data.category && data.category !== 'Other') {
              updatedTransactions[index].category = data.category;
            }
          }
        } catch (err) {
          console.error("AI Error:", err);
        }
      }));

      // Update UI incrementally after each batch
      onDataParsed([...updatedTransactions]);
    }

    setAiStatus('✅ AI Categorisation Complete');
    setTimeout(() => setAiStatus(''), 3000);
  };

  const handleFileChange = async (acceptedFiles) => {
    setLoading(true);
    setError(null);
    setAiStatus('');
    const file = acceptedFiles[0];

    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("File too large (Max 5MB)");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }

      // 1. Instant Parse (Local Rules)
      const data = parseStatement(fullText, pdf.numPages, customRules);
      onDataParsed(data); // Show results immediately

      setLoading(false);

      // 2. Background AI Parse
      await enrichWithAI(data);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse bank statement");
      setLoading(false);
    }
  };

  const onDrop = useCallback(handleFileChange, [customRules]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
        `}
      >
        <input {...getInputProps()} />
        
        {loading ? (
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 font-medium">Reading statement...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? "Drop the file here" : "Upload your bank statements"}
            </p>
            <p className="text-sm text-gray-500">Supports PDF (Chase, Monzo, Lloyds, Santander, Barclays)</p>
          </div>
        )}
      </div>

      {/* AI Status Indicator */}
      {aiStatus && (
        <div className="mt-4 p-3 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg flex items-center justify-center animate-pulse">
          {aiStatus}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-center font-medium">
          Error: {error}
        </div>
      )}
    </div>
  );
}
