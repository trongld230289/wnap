import { useEffect, useRef } from 'react';

/** Giá trị của lần render trước (undefined ở lần render đầu). */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}
