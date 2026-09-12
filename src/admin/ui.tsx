import { useEffect, useRef, useState, type ReactNode } from "react";
import { failure } from "../api";
export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <p className="alert error" role="alert">
      {failure(error)}
    </p>
  ) : null;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [value, setValue] = useState<T | null>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    fn()
      .then((v) => {
        if (live) setValue(v);
      })
      .catch((e) => {
        if (live) setError(failure(e));
      });
    return () => {
      live = false;
    };
  }, [...deps, tick]);
  return { value, error, reload: () => setTick((t) => t + 1) };
}
export function Confirm({
  title,
  children,
  action,
  onClose,
}: {
  title: string;
  children: ReactNode;
  action: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      className="confirm"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">{title}</h2>
      <div>{children}</div>
      <ErrorBox error={error} />
      <div className="actions">
        <button disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await action();
              onClose();
            } catch (e) {
              setError(failure(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Working…" : "Confirm"}
        </button>
      </div>
    </dialog>
  );
}
