"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-5"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 6.25rem)" }}
      >
        {msg && <div className="glass enter rounded-full px-5 py-3 text-[0.9375rem] font-medium">{msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}
