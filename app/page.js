'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// This tells Next.js: "Only load this component in the browser, never on the server"
const FileUploader = dynamic(() => import('../components/FileUploader'), {
  ssr: false,
  loading: () => <p>Loading uploader...</p> // Optional loading state
});;
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [transactions, setTransactions] = useState([]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        
        {/* 🟢 NEW HEADER: Logo & Subtitle */}
        <header className="mb-8 text-center flex flex-col items-center">
          <img 
            src="https://raw.githubusercontent.com/tph110/bank/refs/heads/main/logo.png" 
            alt="Only Banks Logo" 
            className="w-full max-w-xs h-auto mb-4 drop-shadow-sm" 
          />
          <p className="text-gray-500 text-lg">Upload your bank statements → Get smart spend insights.</p>
        </header>

        {/* 🟢 CONDITIONAL: Show Uploader OR Dashboard */}
        {transactions.length === 0 ? (
          <FileUploader onDataLoaded={setTransactions} />
        ) : (
          <div>
            <button 
              onClick={() => setTransactions([])} 
              className="mb-4 text-sm text-blue-600 hover:underline"
            >
              ← Upload a different file
            </button>
            <Dashboard transactions={transactions} />
          </div>
        )}
      </div>
    </main>
  );
}
