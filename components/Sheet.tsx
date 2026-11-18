"use client";

import { useEffect, type ReactNode } from "react";
import { XIcon } from "./Icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Sheet({ open, onClose, title, subtitle, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-[3px] animate-fade"
      />
      <div className="sheet-panel animate-sheet">
        <div className="px-5 pb-1 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[19px] font-semibold tracking-tight text-white">{title}</h2>
              {subtitle ? <p className="mt-1 text-xs leading-relaxed text-white/45">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 active:scale-95"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">{children}</div>

        {footer ? (
          <div className="border-t border-white/[0.07] bg-ink-900/80 px-5 py-3 safe-bottom">{footer}</div>
        ) : (
          <div className="safe-bottom" />
        )}
      </div>
    </div>
  );
}
