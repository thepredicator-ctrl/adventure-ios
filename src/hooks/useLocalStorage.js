import { useState, useEffect, useCallback } from 'react';
import { lsGet, lsSet } from '../lib/storage.js';

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => lsGet(key, initial));

  useEffect(() => {
    lsSet(key, value);
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset];
}
