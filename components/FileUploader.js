'use client'; // Required for browser features like file inputs
import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { parseChaseStatement } from '@/utils/moneyHelper';

// Point to the worker file on a CDN to avoid complex Webpack config
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function FileUploader({ onDataLoaded }) {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }

      const data = parseChaseStatement(fullText);
      onDataLoaded(data); // Send data up to the parent
    } catch (err) {
      console.error(err);
      alert("Failed to parse PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition">
      <p className="text-xl font-semibold text-blue-600 mb-2">Upload Chase Statement</p>
      <p className="text-sm text-gray-500 mb-4">Select your .pdf file to begin analysis</p>
      
      {loading ? (
        <p className="text-blue-500 animate-pulse">Processing... please wait</p>
      ) : (
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileChange} 
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      )}
    </div>
  );
}