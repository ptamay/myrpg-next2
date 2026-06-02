"use client";

import React, { useEffect, useRef } from "react";
import Modal from "../ui/Modal";

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  onCrop?: (base64: string) => void;
  aspectRatio?: number;
}

export default function CropModal({ isOpen, onClose, imageUrl, onCrop, aspectRatio }: CropModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && imageUrl && imageRef.current) {
      if (typeof window !== "undefined" && (window as any).Cropper) {
        if (cropperRef.current) {
          cropperRef.current.destroy();
        }
        imageRef.current.src = imageUrl;
        cropperRef.current = new (window as any).Cropper(imageRef.current, {
          aspectRatio: aspectRatio !== undefined ? aspectRatio : 1,
          viewMode: 1,
          autoCropArea: 1,
          background: false
        });
      }
    }

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [isOpen, imageUrl, aspectRatio]);

  const handleConfirm = () => {
    if (cropperRef.current && onCrop) {
      const canvasOptions: any = {};
      const actualRatio = aspectRatio !== undefined ? aspectRatio : 1;
      if (actualRatio !== 1) {
        canvasOptions.width = 600;
        canvasOptions.height = Math.round(600 / actualRatio);
      } else {
        canvasOptions.width = 256;
        canvasOptions.height = 256;
      }
      const canvas = cropperRef.current.getCroppedCanvas(canvasOptions);
      if (canvas) {
        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        onCrop(base64);
        onClose();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} id="crop-modal">
      <div className="modal-content glass-panel" style={{ maxWidth: "600px" }}>
        <header className="modal-header">
          <div className="modal-title-group">
            <span className="modal-subtitle">Ajuste de Retrato</span>
            <h2 className="modal-title">Cortar Imagem</h2>
          </div>
        </header>
        <div className="modal-body">
          <div className="crop-container" style={{ maxHeight: "500px", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", background: "#000" }}>
            <img ref={imageRef} style={{ maxWidth: "100%", display: "block" }} alt="Para cortar" />
          </div>
        </div>
        <footer className="modal-footer">
          <button className="btn danger-btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary-btn" onClick={handleConfirm}>Confirmar Corte</button>
        </footer>
      </div>
    </Modal>
  );
}
