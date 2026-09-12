import { Component, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AuthGate, ResetPassword } from "./auth";
import { Dashboard, Inventory } from "./inventory";
import { ProductEditor } from "./product-form";
import { Categories } from "./categories";
import { ShopSettings } from "./settings";
import { db, failure } from "../api";
import { ErrorBox } from "./ui";
import "./style.css";
class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: "" };
  static getDerivedStateFromError(error: unknown) {
    return { error: failure(error) };
  }
  render() {
    return this.state.error ? (
      <main className="auth-card">
        <h1>Something went wrong</h1>
        <ErrorBox error={this.state.error} />
        <a href="/admin">Reload admin</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Admin() {
  const [error, setError] = useState("");
  const path = location.pathname.replace(/\/$/, "");
  let content: ReactNode;
  if (path === "/admin" || path === "/admin.html") content = <Dashboard />;
  else if (path === "/admin/products") content = <Inventory />;
  else if (path === "/admin/products/new") {
    const id =
      new URLSearchParams(location.search).get("duplicate") || undefined;
    content = <ProductEditor id={id} duplicate={!!id} />;
  } else if (/^\/admin\/products\/[a-f0-9-]{36}$/.test(path))
    content = <ProductEditor id={path.split("/")[3]} />;
  else if (path === "/admin/categories") content = <Categories />;
  else if (path === "/admin/settings") content = <ShopSettings />;
  else
    content = (
      <>
        <h1>Page not found</h1>
        <a href="/admin">Back to dashboard</a>
      </>
    );
  return (
    <AuthGate>
      <div className="admin-shell">
        <header className="admin-header">
          <a className="admin-brand" href="/admin">
            MD{" "}
            <span>
              Mahakal Drapery<small>Shop administration</small>
            </span>
          </a>
          <a href="/" target="_blank" rel="noreferrer">
            View website ↗
          </a>
          <button
            onClick={async () => {
              const { error } = await db().auth.signOut();
              if (error) setError(failure(error));
            }}
          >
            Sign out
          </button>
        </header>
        <nav className="admin-nav" aria-label="Admin navigation">
          {[
            ["/admin", "Dashboard"],
            ["/admin/products", "Products"],
            ["/admin/categories", "Categories"],
            ["/admin/settings", "Shop settings"],
          ].map(([href, label]) => (
            <a
              href={href}
              key={href}
              aria-current={
                path === href ||
                (href === "/admin/products" && path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </a>
          ))}
        </nav>
        <main className="admin-main">
          <ErrorBox error={error} />
          {content}
        </main>
      </div>
    </AuthGate>
  );
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    {location.pathname.replace(/\/$/, "") === "/admin/reset-password" ? (
      <ResetPassword />
    ) : (
      <Admin />
    )}
  </Boundary>,
);
