import { createContext, useContext, useEffect, useState } from 'react';
import { shouldAnimate } from './gate';
import { useReducedMotion } from './useReducedMotion';

interface DelightCtx {
  enabled: boolean;      // có chạy animation không (đã gộp OS + setting)
  userEnabled: boolean;  // setting của user
  toggle: () => void;
}

const Ctx = createContext<DelightCtx>({ enabled: true, userEnabled: true, toggle: () => {} });
export const useDelight = () => useContext(Ctx);

const KEY = 'wnap.motion';

export function DelightProvider({ children }: { children: React.ReactNode }) {
  const [userEnabled, setUserEnabled] = useState(() => localStorage.getItem(KEY) !== 'off');
  const reduced = useReducedMotion();
  const enabled = shouldAnimate(reduced, userEnabled);

  useEffect(() => { localStorage.setItem(KEY, userEnabled ? 'on' : 'off'); }, [userEnabled]);

  return (
    <Ctx.Provider value={{ enabled, userEnabled, toggle: () => setUserEnabled((v) => !v) }}>
      {children}
    </Ctx.Provider>
  );
}
