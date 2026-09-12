import { useState } from "react";
import { categories, db, changed, failure } from "../api";
import type { Category } from "../types";
import { Field, ErrorBox, useLoad } from "./ui";
export function Categories() {
  const loaded = useLoad(() => categories() as Promise<Category[]>),
    [editing, setEditing] = useState<Category | null | undefined>(undefined);
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Categories</h1>
          <p>
            Archive unused categories to hide them and their products publicly.
            Permanent codes stay reserved.
          </p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          Add category
        </button>
      </header>
      <ErrorBox error={loaded.error} />
      {editing !== undefined && (
        <CategoryForm
          key={editing?.id || "new"}
          original={editing}
          done={() => {
            setEditing(undefined);
            loaded.reload();
          }}
        />
      )}
      <div className="category-list">
        {loaded.value?.map((c) => (
          <article className="panel" key={c.id}>
            <small>
              {c.code} · {c.active ? "Active" : "Archived"}
            </small>
            <h2>{c.name}</h2>
            <p>{c.age || c.group_name}</p>
            <button onClick={() => setEditing(c)}>Edit {c.code}</button>
          </article>
        ))}
      </div>
    </>
  );
}
function CategoryForm({
  original,
  done,
}: {
  original: Category | null;
  done: () => void;
}) {
  const [form, setForm] = useState({
      name: original?.name || "",
      description: original?.description || "",
      age: original?.age || "",
      group_name: original?.group_name || "Collection",
      sort_order: original?.sort_order ?? 20,
      active: original?.active ?? true,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const q = original
            ? db()
                .from("categories")
                .update(form)
                .eq("id", original.id)
                .eq("updated_at", original.updated_at)
                .select("id")
            : db().from("categories").insert(form).select("id");
          const { data, error } = await q;
          if (error) throw error;
          if (!data.length)
            throw new Error("Category changed. Close this form and reopen it.");
          changed();
          done();
        } catch (e) {
          setError(failure(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{original ? "Edit " + original.code : "New category"}</h2>
      <ErrorBox error={error} />
      <fieldset disabled={busy}>
        <div className="two-col">
          {(["name", "age", "group_name", "description"] as const).map(
            (key) => (
              <Field
                key={key}
                label={
                  {
                    name: "Category name",
                    age: "Age group",
                    group_name: "Collection group",
                    description: "Description",
                  }[key]
                }
              >
                <input
                  required={key === "name" || key === "group_name"}
                  maxLength={key === "name" ? 100 : undefined}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </Field>
            ),
          )}
          <Field label="Display order">
            <input
              type="number"
              required
              value={form.sort_order}
              onChange={(e) =>
                setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
              }
            />
          </Field>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) =>
              setForm((f) => ({ ...f, active: e.target.checked }))
            }
          />
          Active on public catalogue
        </label>
        <p>
          {original
            ? "The permanent category code cannot be changed."
            : "A unique category code is assigned automatically."}
        </p>
        <div className="actions">
          <button type="button" onClick={done}>
            Cancel
          </button>
          <button className="primary">
            {busy ? "Saving…" : "Save category"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
