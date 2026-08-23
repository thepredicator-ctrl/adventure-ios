/**
 * LibraryBackupService - export/import/validate library data.
 */
import { exportAllData, importAllData, clearAllData, lsGet, lsSet, LS_KEYS } from '../storage.js';

export function generateBackup() {
  return exportAllData();
}

export function validateBackup(jsonStr) {
  const errors = [];
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { valid: false, errors: ['Invalid JSON format'], stats: null };
  }

  if (typeof data !== 'object' || data === null) {
    errors.push('Root must be an object');
  }

  const keys = Object.keys(data);
  if (keys.length === 0) errors.push('Backup is empty');

  let adventureKeys = 0;
  for (const k of keys) {
    if (!k.startsWith('adventure:')) {
      errors.push(`Non-adventure key: ${k}`);
    } else {
      adventureKeys++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      totalKeys: adventureKeys,
      estimatedSize: (jsonStr.length / 1024).toFixed(1) + ' KB',
    },
  };
}

export function importBackup(jsonStr, mode = 'merge') {
  const validation = validateBackup(jsonStr);
  if (!validation.valid) return { success: false, ...validation };

  if (mode === 'replace') {
    const existing = exportAllData();
    const existingCount = Object.keys(JSON.parse(existing)).length;
    return {
      success: true,
      mode: 'replace',
      existingKeys: existingCount,
      importedKeys: validation.stats.totalKeys,
      warning: 'All existing data will be replaced',
      needsConfirmation: true,
    };
  }

  const result = importAllData(jsonStr);
  return { success: result.success, mode: 'merge', importedKeys: result.count, error: result.error };
}

export function confirmReplaceImport(jsonStr) {
  clearAllData();
  const result = importAllData(jsonStr);
  return { success: result.success, importedKeys: result.count, error: result.error };
}

export function getBackupSummary() {
  let keyCount = 0;
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('adventure:')) {
      keyCount++;
      totalSize += k.length + (localStorage.getItem(k) || '').length;
    }
  }
  return { keyCount, sizeKB: (totalSize / 1024).toFixed(1) };
}
