import { useEffect, useState, type ReactNode } from "react";
import { db, configured, requireAdmin, failure } from "../api";
import { ErrorBox, Field } from "./ui";
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "login" | "admin" | "denied">(
      "checking",
    ),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!configured) {
      setError(
        "Configure the two variables in .env.example and restart the app.",
      );
      setState("denied");
      return;
    }
    let live = true,
      revision = 0;
    const check = async () => {
      const id = ++revision;
      try {
        const { data, error } = await db().auth.getUser();
        if (!live || id !== revision) return;
        if (!data.user) {
          setState("login");
          if (error && error.name !== "AuthSessionMissingError")
            setError(failure(error));
          return;
        }
        await requireAdmin();
        if (live && id === revision) {
          setError("");
          setState("admin");
        }
      } catch (e) {
        if (live && id === revision) {
          setError(failure(e));
          setState("denied");
        }
      }
    };
    void check();
    const {
      data: { subscription },
    } = db().auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (live) void check();
      }, 0);
    });
    const timer = setInterval(() => void check(), 60000);
    return () => {
      live = false;
      revision++;
      subscription.unsubscribe();
      clearInterval(timer);
    };
  }, []);
  if (state === "admin") return <>{children}</>;
  if (state === "checking")
    return (
      <div className="auth-card">
        <p role="status">Checking your account…</p>
      </div>
    );
  return (
    <main className="auth-card">
      <a href="/">← Public catalogue</a>
      <h1>Shop login</h1>
      <p>Mahakal Drapery inventory</p>
      <ErrorBox error={error} />
      {message && (
        <p role="status" className="alert">
          {message}
        </p>
      )}
      {state === "login" ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const { error } = await db().auth.signInWithPassword({
                email,
                password,
              });
              if (error) throw error;
              setPassword("");
              await requireAdmin();
              setState("admin");
            } catch (e) {
              setError(failure(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Email">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="button"
            disabled={busy || !email}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const { error } = await db().auth.resetPasswordForEmail(email, {
                  redirectTo: location.origin + "/admin/reset-password",
                });
                if (error) throw error;
                setMessage(
                  "If this account can receive a reset email, check its inbox and spam folder.",
                );
              } catch (e) {
                setError(failure(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Forgot password?
          </button>
        </form>
      ) : (
        configured && (
          <button
            onClick={async () => {
              const { error } = await db().auth.signOut();
              if (error) setError(failure(error));
              else setState("login");
            }}
          >
            Sign out
          </button>
        )
      )}
    </main>
  );
}
export function ResetPassword() {
  const [ready, setReady] = useState(false),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    if (!configured) {
      setError("Supabase is not configured.");
      return;
    }
    let live = true;
    const check = () =>
      void db()
        .auth.getUser()
        .then(({ data, error }) => {
          if (live) {
            setReady(!!data.user);
            if (!data.user)
              setError(
                error?.message ||
                  "Open the latest password reset email on this device.",
              );
          }
        });
    check();
    const {
      data: { subscription },
    } = db().auth.onAuthStateChange(() => setTimeout(check, 0));
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <main className="auth-card">
      <h1>Reset password</h1>
      <ErrorBox error={error} />
      {done ? (
        <>
          <p role="status">Password changed. Sign in with your new password.</p>
          <a href="/admin">Go to login</a>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (password !== confirm) {
              setError("Passwords do not match.");
              return;
            }
            setBusy(true);
            try {
              const { error } = await db().auth.updateUser({ password });
              if (error) throw error;
              await db().auth.signOut();
              setPassword("");
              setConfirm("");
              setDone(true);
            } catch (e) {
              setError(failure(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="New password (at least 12 characters)">
            <input
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <button disabled={!ready || busy} className="primary">
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      )}
    </main>
  );
}
