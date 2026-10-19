"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  /** Use for deletes and other things that cannot be undone. */
  danger?: boolean;
}

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

interface Feedback {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, tone?: Toast["tone"]) => void;
}

const FeedbackContext = createContext<Feedback | null>(null);

/**
 * One place for "are you sure?" dialogs and small success/error messages, so
 * every screen asks and answers the same way instead of using the browser's
 * built-in popups.
 */
export function AdminFeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPending(options);
    });
  }, []);

  useEffect(() => {
    if (pending && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [pending]);

  function settle(value: boolean) {
    dialogRef.current?.close();
    resolver.current?.(value);
    resolver.current = null;
    setPending(null);
  }

  const toast = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(
        () => setToasts((current) => current.filter((t) => t.id !== id)),
        4000,
      );
    },
    [],
  );

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          settle(false);
        }}
        className="m-auto w-[min(26rem,90vw)] rounded-[24px] bg-onwei-white p-6 text-onwei-blue shadow-xl backdrop:bg-onwei-blue/40"
      >
        {pending ? (
          <div className="flex flex-col gap-4">
            <p className="font-display text-lg font-semibold uppercase">
              {pending.title ?? "Are you sure?"}
            </p>
            <p className="text-sm text-onwei-blue/80">{pending.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-[30px] border border-onwei-blue px-5 py-2 font-cta text-sm uppercase tracking-wide"
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`rounded-[30px] px-5 py-2 font-cta text-sm uppercase tracking-wide ${
                  pending.danger
                    ? "bg-onwei-black text-onwei-white"
                    : "bg-onwei-blue text-onwei-beige"
                }`}
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <p
            key={t.id}
            className={`rounded-[16px] px-4 py-2 text-sm shadow-lg ${
              t.tone === "error"
                ? "bg-onwei-black text-onwei-white"
                : "bg-onwei-blue text-onwei-beige"
            }`}
          >
            {t.message}
          </p>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

function useFeedback(): Feedback {
  const value = useContext(FeedbackContext);
  if (!value) {
    throw new Error("Wrap the page in AdminFeedbackProvider first.");
  }
  return value;
}

export function useConfirm() {
  return useFeedback().confirm;
}

export function useToast() {
  return useFeedback().toast;
}
