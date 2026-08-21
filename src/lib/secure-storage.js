// Secure storage abstraction for API keys and sensitive data.
// Web: uses localStorage with obfuscation (not true encryption, but prevents
// casual reading — keys are base64 encoded and stored under non-obvious keys).
// iOS/Keychain: The Capacitor bridge would be used for true Keychain access.
// For now this provides a clean abstraction that can be swapped for native Keychain.

const SECURE_PREFIX = 'adv_sec:';

function obfuscate(value) {
  // Simple obfuscation — NOT encryption. Prevents plaintext in devtools.
  // A real app would use the Keychain via a Capacitor plugin.
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return '';
  }
}

function deobfuscate(value) {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return '';
  }
}

export function secureGet(key) {
  try {
    const raw = localStorage.getItem(SECURE_PREFIX + key);
    if (!raw) return null;
    return deobfuscate(raw);
  } catch {
    return null;
  }
}

export function secureSet(key, value) {
  try {
    if (!value) {
      localStorage.removeItem(SECURE_PREFIX + key);
      return;
    }
    localStorage.setItem(SECURE_PREFIX + key, obfuscate(value));
  } catch {
    /* storage may be unavailable */
  }
}

export function secureRemove(key) {
  try {
    localStorage.removeItem(SECURE_PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function clearAllSecure() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(SECURE_PREFIX)) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  return keysToRemove.length;
}

export function maskKey(key) {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 5) + '••••••' + key.slice(-4);
}
