'use client';
import { useState, useEffect } from 'react';
import { 
  clearAllFinancialData, 
  clearSessionData, 
  getDataRetentionInfo, 
  getPrivacyReport,
  checkForDataLeaks 
} from '../utils/dataCleanup';

export default function PrivacyDashboard({ onClose }) {
  const [dataInfo, setDataInfo] = useState(null);
  const [privacyReport, setPrivacyReport] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dataLeaks, setDataLeaks] = useState([]);

  useEffect(() => {
    loadDataInfo();
    loadPrivacyReport();
    checkLeaks();
  }, []);

  const loadDataInfo = () => {
    const info = getDataRetentionInfo();
    setDataInfo(info);
  };

  const loadPrivacyReport = () => {
    const report = getPrivacyReport();
    setPrivacyReport(report);
  };

  const checkLeaks = () => {
    const leaks = checkForDataLeaks();
    setDataLeaks(leaks);
  };

  const handleClearAllData = () => {
    clearAllFinancialData();
    setShowConfirm(false);
    loadDataInfo();
    loadPrivacyReport();
    alert('✅ All financial data has been cleared from your browser.');
  };

  const handleClearSessionOnly = () => {
    clearSessionData();
    loadDataInfo();
    loadPrivacyReport();
    alert('✅ Session data cleared (goals and budgets kept).');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Privacy & Data Control</h2>
                <p className="text-sm text-slate-600">Manage your stored financial data</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Privacy Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-green-900">Your Data is Private</h3>
                <p className="text-sm text-green-700 mt-1">
                  PDF processing happens in your browser. Bank statements never leave your device.
                  Your transaction data is processed locally.
                </p>
              </div>
            </div>
          </div>

          {/* AI Features Disclosure */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-bold text-blue-900">AI-Powered Features</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Our AI insights and chatbot use OpenRouter API to process transaction data in real-time.
                  Data is <strong>not stored</strong> by the AI provider. Transmission is encrypted via HTTPS.
                </p>
                <details className="mt-2 text-xs text-blue-600">
                  <summary className="cursor-pointer font-medium hover:text-blue-800">What's sent to AI?</summary>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• Insights: Summary data only (totals, categories, date range)</li>
                    <li>• Chatbot: Full transaction list (to answer your questions accurately)</li>
                    <li>• Never sent: Bank PDFs, account numbers, personal names</li>
                  </ul>
                </details>
              </div>
            </div>
          </div>

          {/* Data Leaks Warning */}
          {dataLeaks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-red-900">Security Warning</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Sensitive data patterns detected in storage:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {dataLeaks.map((leak, i) => (
                      <li key={i} className="text-xs text-red-600">
                        • {leak.message} in "{leak.key}"
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleClearAllData}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
                  >
                    Clear All Data Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Current Storage */}
          {dataInfo && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mb-3">📊 Currently Stored Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Financial Goals:</span>
                  <span className="font-semibold text-slate-900">
                    {dataInfo.hasGoals ? `${dataInfo.goalCount} goal${dataInfo.goalCount !== 1 ? 's' : ''}` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Budget Settings:</span>
                  <span className="font-semibold text-slate-900">
                    {dataInfo.hasBudgets ? 'Stored' : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Last Activity:</span>
                  <span className="font-semibold text-slate-900">
                    {dataInfo.lastActivity 
                      ? new Date(dataInfo.lastActivity).toLocaleString('en-GB') 
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Storage Details */}
          {privacyReport && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mb-3">💾 Storage Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Storage Used:</span>
                  <span className="font-semibold text-slate-900">{privacyReport.totalSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Data Types:</span>
                  <span className="font-semibold text-slate-900">
                    {privacyReport.dataTypes.length > 0 
                      ? privacyReport.dataTypes.join(', ') 
                      : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Storage Location:</span>
                  <span className="font-semibold text-slate-900">Browser Only (Local)</span>
                </div>
              </div>
            </div>
          )}

          {/* What We Store */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-3">📝 What We Store</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>Financial Goals:</strong> Stored in your browser to track progress between visits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>Budget Settings:</strong> Your category budgets for comparison</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span><strong>Nothing Else:</strong> Bank statements are processed in-memory and never stored</span>
              </li>
            </ul>
          </div>

          {/* What We DON'T Store */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-bold text-green-900 mb-3">🚫 What We DON'T Store</h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Bank Statements:</strong> Processed in-memory, deleted immediately</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Transaction Data:</strong> Not stored between sessions (memory only)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Personal Info:</strong> No names, addresses, or account numbers saved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Server Storage:</strong> No database, no logs, no persistent storage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>AI Provider:</strong> OpenRouter doesn't log or store your data (per their policy)</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleClearSessionOnly}
              className="w-full px-4 py-3 bg-amber-100 text-amber-900 rounded-lg font-semibold hover:bg-amber-200 transition-colors text-sm"
            >
              Clear Session Data Only
              <span className="block text-xs font-normal mt-1 text-amber-700">
                Clears temporary data (keeps goals & budgets)
              </span>
            </button>

            <button
              onClick={() => setShowConfirm(true)}
              className="w-full px-4 py-3 bg-red-100 text-red-900 rounded-lg font-semibold hover:bg-red-200 transition-colors text-sm"
            >
              Clear All Data
              <span className="block text-xs font-normal mt-1 text-red-700">
                Permanently deletes everything including goals & budgets
              </span>
            </button>
          </div>

          {/* Auto-Cleanup Info */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <span className="text-slate-500 mt-0.5">ℹ️</span>
              <span>
                <strong>Automatic Cleanup:</strong> For maximum security, you can close your browser tab 
                when finished. Browser data persists only while you keep the tab open or until you manually clear it.
              </span>
            </p>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">⚠️ Confirm Data Deletion</h3>
              <p className="text-sm text-slate-600 mb-4">
                This will permanently delete all stored data including your financial goals and budget settings. 
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAllData}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
