"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive" | "success";

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastData[];
  toast: (opts: Omit<ToastData, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

export function useToast() {
  return React.useContext(ToastContext);
}

let counter = 0;

export function ToastContextProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((opts: Omit<ToastData, "id">) => {
    const id = String(++counter);
    setToasts((prev) => [...prev, { ...opts, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}
