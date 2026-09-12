import { useEffect, useState } from "react";
import {
  db,
  products,
  categories,
  states,
  setAvailability,
  deleteProduct,
  retryCleanup,
  failure,
  money,
  watchChanges,
} from "../api";
import type { Product, Category, Availability } from "../types";
import { ErrorBox, Confirm, Field, useLoad } from "./ui";
export function Dashboard() {
  const loaded = useLoad(async () => {
    const counts = await Promise.all(
      [
        {},
        { published: false },
        { availability: "Available" },
        { availability: "Rented" },
      ].map(async (filter) => {
        let q = db()
          .from("products")
          .select("id", { head: true, count: "exact" });
        for (const [key, value] of Object.entries(filter)) q = q.eq(key, value);
        const { count, error } = await q;
        if (error) throw error;
        return count ?? 0;
      }),
    );
    return { counts, recent: (await products()).items.slice(0, 5) };
  });
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => watchChanges(loaded.reload), []);
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Your costume collection at a glance.</p>
        </div>
        <a className="button primary" href="/admin/products/new">
          Add product
        </a>
      </header>
      <ErrorBox error={loaded.error} />
      <div className="stats">
        {["Total products", "Drafts", "Available", "Rented"].map((label, i) => (
          <div className="panel" key={label}>
            <span>{label}</span>
            <strong>{loaded.value?.counts[i] ?? "—"}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Recently added</h2>
        {loaded.value?.recent.length === 0 && (
          <p>No products yet. Add your first costume to get started.</p>
        )}
        {loaded.value?.recent.map((p) => (
          <a className="recent" key={p.id} href={"/admin/products/" + p.id}>
            <span>
              {p.costume_id} · {p.name}
            </span>
            <span>{p.published ? p.availability : "Draft"} →</span>
          </a>
        ))}
      </section>
      <section className="panel">
        <h2>Image cleanup</h2>
        <p>
          Retry cleanup after an interrupted upload, deletion or save. Images
          still used by any product are protected.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await retryCleanup();
              setMessage("Pending cleanup completed.");
            } catch (e) {
              setMessage(failure(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Cleaning…" : "Retry pending cleanup"}
        </button>
        {message && <p role="status">{message}</p>}
      </section>
    </>
  );
}
export function Inventory() {
  const [filter, setFilter] = useState({
      search: "",
      category: "",
      availability: "",
      publication: "",
      page: 0,
    }),
    [draftSearch, setDraftSearch] = useState(""),
    [remove, setRemove] = useState<Product | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  const loaded = useLoad(() => products(filter), [filter]);
  const cats = useLoad(() => categories() as Promise<Category[]>);
  useEffect(() => watchChanges(loaded.reload), []);
  useEffect(() => {
    if (loaded.value && !loaded.value.items.length && filter.page > 0)
      setFilter((f) => ({ ...f, page: f.page - 1 }));
  }, [loaded.value]);
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Inventory</h1>
          <p>{loaded.value?.count ?? "—"} products</p>
        </div>
        <a className="button primary" href="/admin/products/new">
          Add product
        </a>
      </header>
      <ErrorBox error={error || loaded.error || cats.error} />
      {message && (
        <p className="alert" role="status">
          {message}
        </p>
      )}
      <form
        className="filter-bar panel"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter((f) => ({ ...f, search: draftSearch, page: 0 }));
        }}
      >
        <Field label="Search">
          <input
            value={draftSearch}
            placeholder="Name, ID or tag"
            onChange={(e) => setDraftSearch(e.target.value)}
          />
        </Field>
        <Field label="Category">
          <select
            value={filter.category}
            onChange={(e) =>
              setFilter((f) => ({ ...f, category: e.target.value, page: 0 }))
            }
          >
            <option value="">All categories</option>
            {cats.value?.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name} · {c.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Availability">
          <select
            value={filter.availability}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                availability: e.target.value,
                page: 0,
              }))
            }
          >
            <option value="">All statuses</option>
            {states.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Visibility">
          <select
            value={filter.publication}
            onChange={(e) =>
              setFilter((f) => ({ ...f, publication: e.target.value, page: 0 }))
            }
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </Field>
        <button className="primary">Search</button>
      </form>
      {!loaded.value && !loaded.error && (
        <p role="status">Loading inventory…</p>
      )}
      {loaded.value?.items.length === 0 && (
        <section className="panel">
          <p>No products match these filters.</p>
        </section>
      )}
      <div className="inventory-list">
        {loaded.value?.items.map((p) => (
          <article className="inventory-item panel" key={p.id}>
            {p.images[0]?.url ? (
              <img src={p.images[0].url} alt={p.images[0].alt || p.name} />
            ) : (
              <div className="image-empty">No photo</div>
            )}
            <div className="item-copy">
              <small>
                {p.costume_id} · {p.published ? "Published" : "Draft"}
              </small>
              <h2>
                <a href={"/admin/products/" + p.id}>{p.name}</a>
              </h2>
              <p>
                {p.category.name} · {money(p)}
              </p>
              <Field label={"Availability for " + p.costume_id}>
                <select
                  disabled={busy === p.id}
                  value={p.availability}
                  onChange={async (e) => {
                    setBusy(p.id);
                    setError("");
                    try {
                      await setAvailability(p, e.target.value as Availability);
                      loaded.reload();
                    } catch (e) {
                      setError(failure(e));
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {states.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="item-actions">
              <a className="button" href={"/admin/products/" + p.id}>
                Edit
              </a>
              <a
                className="button"
                href={"/admin/products/new?duplicate=" + p.id}
              >
                Duplicate
              </a>
              {p.published && (
                <a
                  className="button"
                  href={"/catalog/" + p.slug}
                  target="_blank"
                  rel="noreferrer"
                >
                  View publicly ↗
                </a>
              )}
              <button
                className="danger"
                disabled={busy === p.id}
                onClick={() => setRemove(p)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="actions pagination">
        <button
          disabled={filter.page === 0}
          onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}
        >
          Previous
        </button>
        <span>Page {filter.page + 1}</span>
        <button
          disabled={
            !loaded.value || (filter.page + 1) * 24 >= loaded.value.count
          }
          onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}
        >
          Next
        </button>
      </div>
      {remove && (
        <Confirm
          title={"Delete " + remove.costume_id + "?"}
          onClose={() => setRemove(null)}
          action={async () => {
            const warning = await deleteProduct(remove);
            setMessage(
              warning || "Product deleted and unused images cleaned up.",
            );
            loaded.reload();
          }}
        >
          <p>
            {remove.name} will be removed from the catalogue. Its costume ID
            will never be reassigned. Images shared by other products will be
            kept.
          </p>
        </Confirm>
      )}
    </>
  );
}
