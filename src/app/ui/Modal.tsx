"use client";

import { useEffect } from "react";
type ModalProps = {
  open: boolean;
  title?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgba(15,23,42,0.1)] !bg-[#F6EFE6] shadow-xl max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && (
          <div className="sticky top-0 z-10 border-b border-[rgba(15,23,42,0.1)] bg-[#F6EFE6] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
