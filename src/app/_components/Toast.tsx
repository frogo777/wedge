"use client";

/**
 * Toast — sistema de notificaciones global (Wedge Fiscal OS, DS dark).
 *
 * Uso:
 *   const { show, dismiss } = useToast();
 *   show({ kind: "success", message: "Listo" });
 *
 * Stack fijo bottom-right (máx 4 visibles, resto en cola), auto-dismiss
 * (default 4000ms), hover pausa el timer, ESC/clic-fuera cierran el más
 * reciente. Estilos self-contained con tokens del DS (sin globals).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, AlertTriangle, X, Info, AlertCircle } from "lucide-react";
import { wt } from "@/design-system/tokens";

const FONT = wt.font.sans;

export type ToastKind = "success" | "error" | "info" | "warning";

export type ToastInput = {
  kind: ToastKind;
  title?: string;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number; exiting?: boolean };

type ToastContextValue = {
  show: (input: ToastInput) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4000;
const EXIT_MS = 200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState<ToastItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setVisible((prev) => {
      const found = prev.find((tt) => tt.id === id);
      if (!found || found.exiting) return prev;
      return prev.map((tt) => (tt.id === id ? { ...tt, exiting: true } : tt));
    });
    window.setTimeout(() => {
      setVisible((prev) => prev.filter((tt) => tt.id !== id));
      setQueue((q) => {
        if (q.length === 0) return q;
        const [next, ...rest] = q;
        setVisible((v) => (v.length < MAX_VISIBLE ? [...v, next] : v));
        return rest;
      });
    }, EXIT_MS);
  }, []);

  const show = useCallback((input: ToastInput) => {
    idRef.current += 1;
    const id = idRef.current;
    const item: ToastItem = { ...input, id };
    setVisible((prev) => {
      if (prev.length < MAX_VISIBLE) return [...prev, item];
      setQueue((q) => [...q, item]);
      return prev;
    });
    return id;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible((prev) => {
          const last = [...prev].reverse().find((tt) => !tt.exiting);
          if (last) dismiss(last.id);
          return prev;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  const value = useMemo<ToastContextValue>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={visible} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => -1, dismiss: () => {} };
  return ctx;
}

function ToastViewport({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const w = wrapperRef.current;
      if (!w) return;
      if (e.target instanceof Node && w.contains(e.target)) return;
      const last = [...toasts].reverse().find((tt) => !tt.exiting);
      if (last) dismiss(last.id);
    };
    if (toasts.length === 0) return;
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [toasts, dismiss]);

  return (
    <div
      ref={wrapperRef}
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed", right: 16, bottom: 16, zIndex: 100,
        display: "flex", flexDirection: "column", gap: 8,
        pointerEvents: "none", maxWidth: "calc(100vw - 32px)",
      }}
    >
      <style>{`
        @keyframes wg-toast-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes wg-toast-out { from { opacity: 1; } to { opacity: 0; transform: translateY(4px); } }
      `}</style>
      {toasts.map((tt) => (
        <ToastCard key={tt.id} toast={tt} onClose={() => dismiss(tt.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const duration = toast.duration ?? DEFAULT_DURATION;
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(duration);
  const startedAtRef = useRef<number>(0);

  const clearTimer = () => {
    if (timerRef.current != null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
  };
  const startTimer = useCallback((ms: number) => {
    clearTimer();
    if (ms <= 0) return;
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => onClose(), ms);
  }, [onClose]);

  useEffect(() => {
    if (toast.exiting) { clearTimer(); return; }
    startTimer(remainingRef.current);
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.exiting]);

  const onMouseEnter = () => {
    if (toast.exiting) return;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  };
  const onMouseLeave = () => {
    if (toast.exiting) return;
    startTimer(remainingRef.current > 0 ? remainingRef.current : duration);
  };

  const cfg = KIND_CFG[toast.kind];

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        pointerEvents: "auto",
        minWidth: 280, maxWidth: 380,
        background: wt.color.surfaceElevated,
        border: `1px solid ${wt.color.border}`,
        borderLeft: `3px solid ${cfg.fg}`,
        borderRadius: wt.radius.md,
        boxShadow: wt.shadow.lg,
        padding: "12px 12px 12px 14px",
        display: "flex", alignItems: "flex-start", gap: 10,
        fontFamily: FONT,
        animation: toast.exiting ? "wg-toast-out 180ms ease-out forwards" : "wg-toast-in 200ms cubic-bezier(0.2,0.8,0.2,1)",
      }}
    >
      <div aria-hidden style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 11, background: cfg.bg, color: cfg.fg, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ ...wt.text.label, color: wt.color.text, marginBottom: 2 }}>{toast.title}</div>
        )}
        <div style={{ ...wt.text.bodySm, color: wt.color.textMuted, wordBreak: "break-word" }}>{toast.message}</div>
        {toast.action && (
          <button type="button" onClick={() => { toast.action?.onClick(); onClose(); }}
            style={{ marginTop: 8, padding: "4px 10px", borderRadius: 6, border: `1px solid ${cfg.fg}33`, background: "transparent", color: cfg.fg, ...wt.text.caption, fontWeight: 600, fontFamily: FONT, cursor: "pointer" }}>
            {toast.action.label}
          </button>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="Cerrar notificación"
        style={{ flexShrink: 0, background: "none", border: "none", padding: 4, cursor: "pointer", color: wt.color.textMuted, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={13} />
      </button>
    </div>
  );
}

const KIND_CFG: Record<ToastKind, { fg: string; bg: string; icon: React.ReactNode }> = {
  success: { fg: wt.color.success, bg: wt.color.successBg, icon: <Check size={12} strokeWidth={3} /> },
  warning: { fg: wt.color.warning, bg: wt.color.warningBg, icon: <AlertTriangle size={12} strokeWidth={2.5} /> },
  error:   { fg: wt.color.danger,  bg: wt.color.dangerBg,  icon: <AlertCircle size={12} strokeWidth={2.5} /> },
  info:    { fg: wt.color.info,    bg: wt.color.infoBg,    icon: <Info size={12} strokeWidth={2.5} /> },
};
