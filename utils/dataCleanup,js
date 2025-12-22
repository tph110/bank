// utils/dataCleanup.js

/**
 * Data Cleanup & Privacy Utilities
 * Ensures extracted transaction data is deleted after analysis
 * to maintain user privacy and security
 */

/**
 * Clear all transaction-related data from memory and localStorage
 */
export const clearAllFinancialData = () => {
  console.log('🗑️ Clearing all financial data...');
  
  // Clear any potential data stored in localStorage
  const keysToRemove = [
    'onlybanks_goals',
    'categoryBudgets',
    'recentTransactions',
    'lastUpload',
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`✓ Removed ${key}`);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  });
  
  console.log('✓ All financial data cleared from localStorage');
};

/**
 * Clear session data (goals, budgets, etc.) but keep user preferences
 */
export const clearSessionData = () => {
  console.log('🗑️ Clearing session data...');
  
  try {
    localStorage.removeItem('onlybanks_goals');
    localStorage.removeItem('categoryBudgets');
    console.log('✓ Session data cleared');
  } catch (error) {
    console.error('Failed to clear session data:', error);
  }
};

/**
 * Auto-cleanup: Clear data after inactivity period
 * @param {number} inactivityMinutes - Minutes of inactivity before auto-cleanup
 */
export const setupAutoCleanup = (inactivityMinutes = 30) => {
  let inactivityTimer;
  
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log(`⏰ ${inactivityMinutes} minutes of inactivity detected - auto-cleaning...`);
      clearAllFinancialData();
      
      // Reload page to clear memory
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    }, inactivityMinutes * 60 * 1000);
  };
  
  // Reset timer on user activity
  if (typeof window !== 'undefined') {
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });
    
    // Initial timer
    resetTimer();
  }
  
  return () => {
    clearTimeout(inactivityTimer);
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.removeEventListener(event, resetTimer, true);
    });
  };
};

/**
 * Clear data when user leaves the page
 */
export const setupBeforeUnloadCleanup = (clearGoals = false) => {
  if (typeof window === 'undefined') return;
  
  const handleBeforeUnload = () => {
    console.log('🗑️ Page unload detected - clearing temporary data...');
    
    // Don't clear goals by default (users may want to keep them)
    if (clearGoals) {
      clearAllFinancialData();
    } else {
      // Just clear temporary session data
      sessionStorage.clear();
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

/**
 * Clear browser cache/history for this site
 * (Note: This can only clear specific localStorage/sessionStorage, not browser cache)
 */
export const clearBrowserData = async () => {
  console.log('🗑️ Clearing browser data...');
  
  try {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB (if used)
    if ('indexedDB' in window) {
      const databases = await window.indexedDB.databases();
      databases.forEach(db => {
        window.indexedDB.deleteDatabase(db.name);
        console.log(`✓ Deleted IndexedDB: ${db.name}`);
      });
    }
    
    console.log('✓ Browser data cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear browser data:', error);
    return false;
  }
};

/**
 * Check if sensitive data exists in storage
 */
export const hasSensitiveData = () => {
  const sensitiveKeys = [
    'onlybanks_goals',
    'categoryBudgets',
    'recentTransactions'
  ];
  
  return sensitiveKeys.some(key => {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  });
};

/**
 * Get data retention info
 */
export const getDataRetentionInfo = () => {
  const info = {
    hasGoals: false,
    hasBudgets: false,
    goalCount: 0,
    lastActivity: null
  };
  
  try {
    const goals = localStorage.getItem('onlybanks_goals');
    if (goals) {
      const parsed = JSON.parse(goals);
      info.hasGoals = true;
      info.goalCount = parsed.length;
    }
    
    const budgets = localStorage.getItem('categoryBudgets');
    info.hasBudgets = !!budgets;
    
    const lastActivity = localStorage.getItem('lastActivity');
    info.lastActivity = lastActivity ? new Date(lastActivity) : null;
  } catch (error) {
    console.error('Error reading data retention info:', error);
  }
  
  return info;
};

/**
 * Update last activity timestamp
 */
export const updateLastActivity = () => {
  try {
    localStorage.setItem('lastActivity', new Date().toISOString());
  } catch (error) {
    console.error('Failed to update last activity:', error);
  }
};

/**
 * Secure memory cleanup - overwrite data before deletion
 * (For extra security, though JavaScript doesn't guarantee memory zeroing)
 */
export const secureCleanup = (data) => {
  if (Array.isArray(data)) {
    // Overwrite array with zeros
    for (let i = 0; i < data.length; i++) {
      data[i] = null;
    }
    data.length = 0;
  } else if (typeof data === 'object' && data !== null) {
    // Overwrite object properties
    Object.keys(data).forEach(key => {
      data[key] = null;
      delete data[key];
    });
  }
};

/**
 * Privacy-safe export settings
 * Returns what data is being stored and for how long
 */
export const getPrivacyReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    storage: {
      localStorage: {},
      sessionStorage: {},
      memory: {}
    },
    dataTypes: [],
    totalSize: 0
  };
  
  try {
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      
      report.storage.localStorage[key] = {
        size: `${size} bytes`,
        encrypted: false,
        persistent: true
      };
      
      report.totalSize += size;
      
      if (key.includes('goal')) report.dataTypes.push('Financial Goals');
      if (key.includes('budget')) report.dataTypes.push('Budgets');
      if (key.includes('transaction')) report.dataTypes.push('Transactions');
    }
    
    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      const size = new Blob([value]).size;
      
      report.storage.sessionStorage[key] = {
        size: `${size} bytes`,
        encrypted: false,
        persistent: false
      };
      
      report.totalSize += size;
    }
    
    report.dataTypes = [...new Set(report.dataTypes)];
    report.totalSize = `${report.totalSize} bytes (${(report.totalSize / 1024).toFixed(2)} KB)`;
    
  } catch (error) {
    console.error('Error generating privacy report:', error);
  }
  
  return report;
};

/**
 * Check for data leaks (data that shouldn't be stored)
 */
export const checkForDataLeaks = () => {
  const leaks = [];
  
  try {
    // Check localStorage for sensitive patterns
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      
      // Check for patterns that shouldn't be stored
      const sensitivePatterns = [
        { pattern: /\d{4}-\d{4}-\d{4}-\d{4}/, type: 'Credit Card' },
        { pattern: /\d{3}-\d{2}-\d{4}/, type: 'Social Security Number' },
        { pattern: /password/i, type: 'Password' },
        { pattern: /apikey|api_key|secret/i, type: 'API Key' },
      ];
      
      sensitivePatterns.forEach(({ pattern, type }) => {
        if (pattern.test(value)) {
          leaks.push({
            key,
            type,
            message: `Potential ${type} found in storage`
          });
        }
      });
    }
  } catch (error) {
    console.error('Error checking for data leaks:', error);
  }
  
  return leaks;
};
