'use client';
import { useState } from 'react';

export default function RecurringTransactions({ recurringTransactions, summary }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!recurringTransactions || recurringTransactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Recurring Payments</h3>
            <p className="text-sm text-slate-500">
              {summary.count} subscription{summary.count !== 1 ? 's' : ''} • £{summary.totalMonthly.toFixed(2)}/month
            </p>
          </div>
        </div>
        <span className="text-slate-400 hover:text-blue-600 text-2xl font-light">
          {isExpanded ? '−' : '+'}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">Monthly</div>
              <div className="text-lg font-bold text-blue-900">£{summary.totalMonthly.toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-xs text-purple-600 font-medium">Annually</div>
              <div className="text-lg font-bold text-purple-900">£{summary.totalAnnual.toFixed(2)}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-green-600 font-medium">Active</div>
              <div className="text-lg font-bold text-green-900">{summary.count}</div>
            </div>
            {summary.potentiallyUnusedCount > 0 && (
              <div className="bg-amber-50 p-3 rounded-lg">
                <div className="text-xs text-amber-600 font-medium">Potentially Unused</div>
                <div className="text-lg font-bold text-amber-900">{summary.potentiallyUnusedCount}</div>
              </div>
            )}
          </div>

          {/* Potentially Unused Warning */}
          {summary.potentialSavings > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-amber-900">Potential Savings Detected</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    {summary.potentiallyUnusedCount} subscription{summary.potentiallyUnusedCount !== 1 ? 's' : ''} may be unused. 
                    Cancelling could save you <span className="font-bold">£{summary.potentialSavings.toFixed(2)}/year</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recurring Transactions List */}
          <div className="space-y-3">
            {recurringTransactions.map((recurring, index) => (
              <div
                key={recurring.normalizedName}
                className={`border rounded-lg p-4 ${
                  recurring.potentiallyUnused 
                    ? 'border-amber-200 bg-amber-50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{recurring.merchant}</h4>
                      {recurring.potentiallyUnused && (
                        <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-medium">
                          Unused?
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{recurring.frequency}</span>
                      </span>
                      <span>•</span>
                      <span>{recurring.occurrences} payments</span>
                      <span>•</span>
                      <span className="capitalize">{recurring.category}</span>
                    </div>
                    {recurring.nextPaymentDate && (
                      <div className="text-xs text-slate-500 mt-1">
                        Next payment: {new Date(recurring.nextPaymentDate).toLocaleDateString('en-GB')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">£{recurring.avgAmount.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">{recurring.frequency.toLowerCase()}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      £{recurring.annualCost.toFixed(2)}/year
                    </div>
                  </div>
                </div>

                {recurring.potentiallyUnused && (
                  <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-700">
                    <span className="font-medium">Last payment:</span> {recurring.daysSinceLastPayment} days ago
                    {recurring.daysSinceLastPayment > recurring.frequencyDays * 2 && (
                      <span className="ml-1">(over {Math.floor(recurring.daysSinceLastPayment / recurring.frequencyDays)}x the usual interval)</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
