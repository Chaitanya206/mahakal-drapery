import { useEffect, useRef, useState } from "react";
import {
  categories,
  product,
  db,
  requireAdmin,
  cleanup,
  trackUploads,
  forgetUploads,
  uuid,
  failure,
  changed,
  states,
} from "../api";
import { uploadImage } from "../images";
import type { Category, Product, Photo } from "../types";
import { Field, ErrorBox, Confirm, useLoad } from "./ui";
const split = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
export function ProductEditor({
  id,
  duplicate = false,
}: {
  id?: string;
  duplicate?: boolean;
}) {
  const loaded = useLoad(
    async () => ({
      categories: (await categories()) as Category[],
      product: id ? await product(id) : null,
    }),
    [id],
  );
  if (loaded.error) return <ErrorBox error={loaded.error} />;
  if (!loaded.value) return <p role="status">Loading product…</p>;
  if (id && !loaded.value.product)
    return (
      <p>
        Product no longer exists.{" "}
        <a href="/admin/products">Return to inventory</a>
      </p>
    );
  return (
    <Editor
      key={id || "new"}
      original={loaded.value.product}
      categories={loaded.value.categories}
      duplicate={duplicate}
    />
  );
}
function Editor({
  original,
  categories,
  duplicate,
}: {
  original: Product | null;
  categories: Category[];
  duplicate: boolean;
}) {
  const [form, setForm] = useState({
    name: original ? original.name + (duplicate ? " (copy)" : "") : "",
    description: original?.description || "",
    category_id:
      original?.category_id || categories.find((c) => c.active)?.id || "",
    subcategory: original?.subcategory || "",
    price: original?.price?.toString() || "",
    price_type: original?.price_type || "Rental",
    sizes: original?.sizes.join(", ") || "",
    colors: original?.colors.join(", ") || "",
    tags: original?.tags.join(", ") || "",
    availability: original?.availability || "Coming Soon",
    featured: original?.featured || false,
    published: duplicate ? false : original?.published || false,
  });
  const [images, setImages] = useState<Photo[]>(original?.images || []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(""),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [saved, setSaved] = useState<string | null>(null),
    [warning, setWarning] = useState("");
  const requestId = useRef(uuid()),
    fresh = useRef<string[]>([]),
    blobs = useRef<string[]>([]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => {
      window.removeEventListener("beforeunload", guard);
    };
  }, [dirty, busy]);
  useEffect(
    () => () => {
      for (const url of blobs.current) URL.revokeObjectURL(url);
    },
    [],
  );
  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const text = (
    key: "name" | "description" | "subcategory" | "sizes" | "colors" | "tags",
    label: string,
    required = false,
  ) => (
    <Field label={label}>
      {key === "description" ? (
        <textarea
          rows={4}
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
        />
      ) : (
        <input
          required={required}
          maxLength={key === "name" ? 160 : undefined}
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
        />
      )}
    </Field>
  );
  async function upload(list: FileList | null) {
    const selected = Array.from(list ?? []);
    if (!selected.length) return; // Copy before input reset or any await.
    if (images.length + selected.length > 12) {
      setError("A product can have up to 12 images.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = await requireAdmin();
      for (let i = 0; i < selected.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${selected.length}…`);
        const image = await uploadImage(selected[i], user.id);
        fresh.current.push(image.path);
        if (image.url) blobs.current.push(image.url);
        setImages((current) => [...current, image]);
        setDirty(true);
      }
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  function move(index: number, to: number) {
    setImages((current) => {
      const copy = [...current];
      const [image] = copy.splice(index, 1);
      copy.splice(to, 0, image);
      return copy;
    });
    setDirty(true);
  }
  if (saved)
    return (
      <section className="panel">
        <h1>Product saved</h1>
        <p role="status">Your inventory has been updated.</p>
        {warning && <p className="alert">{warning}</p>}
        <div className="actions">
          <a className="button primary" href={"/admin/products/" + saved}>
            View saved product
          </a>
          <a className="button" href="/admin/products">
            Back to inventory
          </a>
        </div>
      </section>
    );
  return (
    <>
      <header className="page-heading">
        <div>
          <a
            href="/admin/products"
            onClick={(e) => {
              if (dirty) {
                e.preventDefault();
                setDiscard(true);
              }
            }}
          >
            ← Inventory
          </a>
          <h1>
            {duplicate
              ? "Duplicate product"
              : original
                ? "Edit product"
                : "Add product"}
          </h1>
          <p>
            {original && !duplicate
              ? original.costume_id
              : "A permanent costume ID is assigned when you save."}
          </p>
        </div>
      </header>
      <ErrorBox error={error} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const payload = {
              ...form,
              price:
                form.price_type === "Contact for Price"
                  ? null
                  : Number(form.price),
              sizes: split(form.sizes),
              colors: split(form.colors),
              tags: split(form.tags),
              images: images.map(({ path, alt }) => ({ path, alt })),
              ...(original && !duplicate
                ? { id: original.id, updated_at: original.updated_at }
                : { request_id: requestId.current }),
            };
            const { data, error } = await db().rpc("save_product", { payload });
            if (error) throw error;
            const removed = [
              ...(original?.images || []).map((i) => i.path),
              ...fresh.current,
            ].filter((path) => !images.some((i) => i.path === path));
            forgetUploads(images.map((i) => i.path));
            setDirty(false);
            changed();
            try {
              await cleanup(removed);
            } catch (e) {
              setWarning(
                "Saved. Unused image cleanup needs retry from the dashboard: " +
                  failure(e),
              );
            }
            setSaved(data as string);
          } catch (e) {
            setError(failure(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <div className="editor-grid">
            <section className="panel">
              <h2>Costume details</h2>
              {text("name", "Costume name", true)}
              <div className="two-col">
                <Field label="Category">
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => update("category_id", e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {categories
                      .filter((c) => c.active || c.id === form.category_id)
                      .map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name} · {c.code}
                          {!c.active ? " (archived)" : ""}
                        </option>
                      ))}
                  </select>
                </Field>
                {text("subcategory", "Subcategory")}
              </div>
              {text("description", "Description")}
              <div className="two-col">
                <Field label="Price type">
                  <select
                    value={form.price_type}
                    onChange={(e) => update("price_type", e.target.value)}
                  >
                    {["Rental", "Purchase", "Contact for Price"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
                {form.price_type !== "Contact for Price" && (
                  <Field label="Price ₹">
                    <input
                      type="number"
                      min="0"
                      max="9999999999.99"
                      step="0.01"
                      required
                      value={form.price}
                      onChange={(e) => update("price", e.target.value)}
                    />
                  </Field>
                )}
              </div>
              <div className="two-col">
                {text("sizes", "Sizes (comma separated)")}
                {text("colors", "Colours (comma separated)")}
              </div>
              {text("tags", "Search tags (comma separated)")}
              <Field label="Availability">
                <select
                  value={form.availability}
                  onChange={(e) => update("availability", e.target.value)}
                >
                  {states.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => update("published", e.target.checked)}
                />
                Publish on public catalogue
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => update("featured", e.target.checked)}
                />
                Featured costume
              </label>
            </section>
            <section className="panel">
              <h2>Photos · {images.length}/12</h2>
              <p>
                The first photo is the cover image. Photos are compressed before
                upload.
              </p>
              <Field label="Upload photos">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    void upload(e.target.files);
                    e.target.value = "";
                  }}
                />
              </Field>
              <div className="photo-list">
                {images.map((image, index) => (
                  <article className="photo-item" key={image.path}>
                    <img
                      src={image.url}
                      alt={image.alt || `Costume photo ${index + 1}`}
                    />
                    <div>
                      <strong>
                        {index === 0 ? "Primary photo" : `Photo ${index + 1}`}
                      </strong>
                      <Field label={`Photo ${index + 1} description`}>
                        <input
                          value={image.alt}
                          onChange={(e) => {
                            setImages((current) =>
                              current.map((p, i) =>
                                i === index ? { ...p, alt: e.target.value } : p,
                              ),
                            );
                            setDirty(true);
                          }}
                        />
                      </Field>
                      <div className="actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => move(index, 0)}
                        >
                          Make primary
                        </button>
                        <button
                          type="button"
                          aria-label={`Move photo ${index + 1} earlier`}
                          disabled={index === 0}
                          onClick={() => move(index, index - 1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move photo ${index + 1} later`}
                          disabled={index === images.length - 1}
                          onClick={() => move(index, index + 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImages((current) =>
                              current.filter((_, i) => i !== index),
                            );
                            setDirty(true);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </fieldset>
        <div className="save-bar">
          <span role="status">
            {progress || (dirty ? "Unsaved changes" : "")}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDiscard(true)}
          >
            Discard
          </button>
          <button className="primary" disabled={busy || !form.category_id}>
            {busy ? "Please wait…" : "Save product"}
          </button>
        </div>
      </form>
      {discard && (
        <Confirm
          title="Discard changes?"
          onClose={() => setDiscard(false)}
          action={async () => {
            await cleanup(fresh.current);
            setDirty(false);
            location.href = "/admin/products";
          }}
        >
          <p>
            Your unsaved changes and newly uploaded, unused images will be
            removed.
          </p>
        </Confirm>
      )}
    </>
  );
}
