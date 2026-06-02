"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import type { DialogType } from "@/contexts/SystemDialogContext";

interface SystemDialogModalsProps {
  type: "alert" | "confirm";
  isOpen: boolean;
  options: any;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function SystemDialogModals({ type, isOpen, options, onClose, onConfirm }: SystemDialogModalsProps) {
  const { title, message, confirmText, cancelText, type: dialogType } = options || {};

  const getDialogStyle = (t: DialogType) => {
    switch (t) {
      case "danger":
        return { border: "1px solid var(--danger)", icon: "⚠️", headerColor: "var(--danger)", btnClass: "danger-btn" };
      case "success":
        return { border: "1px solid var(--success)", icon: "✓", headerColor: "var(--success)", btnClass: "save-btn" };
      case "info":
        return { border: "1px solid var(--accent-primary)", icon: "ℹ️", headerColor: "var(--accent-primary)", btnClass: "primary-btn" };
      case "warning":
      default:
        return { border: "1px solid var(--warning)", icon: "⚠️", headerColor: "var(--warning)", btnClass: "primary-btn" };
    }
  };

  const style = getDialogStyle(dialogType || "warning");

  return (
    <Modal isOpen={isOpen} onClose={type === "alert" ? onClose : () => {}} id={`system-${type}-modal`}>
      {options && (
      <div 
        className="glass-panel" 
        style={{ 
          width: "100%", 
          maxWidth: "400px", 
          padding: "1.5rem", 
          display: "flex", 
          flexDirection: "column", 
          gap: "1.5rem",
          borderColor: style.border.split(" ")[2], // Use the color part of the border
          boxShadow: `0 10px 30px -10px ${style.border.split(" ")[2]}`
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.5rem" }}>{style.icon}</span>
          <h3 style={{ margin: 0, color: style.headerColor, fontWeight: 800 }}>
            {title}
          </h3>
        </div>
        
        <div style={{ color: "var(--text-primary)", fontSize: "1rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {message}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "0.5rem" }}>
          {type === "confirm" && (
            <button className="secondary-btn btn" onClick={onClose}>
              {cancelText || "Cancelar"}
            </button>
          )}
          <button 
            className={`btn ${style.btnClass}`} 
            onClick={type === "alert" ? onClose : onConfirm}
            autoFocus
          >
            {type === "confirm" ? (confirmText || "Confirmar") : "OK"}
          </button>
        </div>
      </div>
      )}
    </Modal>
  );
}
