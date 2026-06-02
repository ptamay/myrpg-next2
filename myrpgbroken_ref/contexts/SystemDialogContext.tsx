"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import SystemDialogModals from "@/components/modals/SystemDialogModals";

export type DialogType = "info" | "warning" | "success" | "danger";

interface AlertOptions {
  title?: string;
  message: string;
  type?: DialogType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
}

interface SystemDialogContextData {
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const SystemDialogContext = createContext<SystemDialogContextData>({} as SystemDialogContextData);

export function SystemDialogProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = useState<{ isOpen: boolean; options: AlertOptions; resolve: () => void } | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showAlert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const opts = typeof options === "string" ? { message: options, type: "warning" as DialogType } : options;
      setAlertState({
        isOpen: true,
        options: { title: "Aviso do Sistema", type: "warning", ...opts },
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === "string" ? { message: options, type: "warning" as DialogType } : options;
      setConfirmState({
        isOpen: true,
        options: { title: "Confirmação", confirmText: "Confirmar", cancelText: "Cancelar", type: "warning", ...opts },
        resolve,
      });
    });
  }, []);

  // Event listener for dispatching alerts outside React context (e.g. from hooks/adapters)
  useEffect(() => {
    const handleSystemAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { message, title, type } = customEvent.detail;
      if (message) {
        showAlert({ message, title, type });
      }
    };

    window.addEventListener("system-alert", handleSystemAlert);
    return () => window.removeEventListener("system-alert", handleSystemAlert);
  }, [showAlert]);

  const closeAlert = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  const handleConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <SystemDialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {mounted && alertState && (
        <SystemDialogModals 
          type="alert" 
          isOpen={alertState.isOpen} 
          options={alertState.options} 
          onClose={closeAlert} 
        />
      )}
      {mounted && confirmState && (
        <SystemDialogModals 
          type="confirm" 
          isOpen={confirmState.isOpen} 
          options={confirmState.options} 
          onClose={() => handleConfirm(false)} 
          onConfirm={() => handleConfirm(true)} 
        />
      )}
    </SystemDialogContext.Provider>
  );
}

export const useSystemDialog = () => useContext(SystemDialogContext);
