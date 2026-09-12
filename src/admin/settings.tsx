import { useState } from "react";
import { settings, db, changed, failure } from "../api";
import type { Settings } from "../types";
import { ErrorBox, Field, useLoad } from "./ui";
export function ShopSettings() {
  const loaded = useLoad(() => settings() as Promise<Settings>);
  return (
    <>
      <h1>Shop settings</h1>
      <ErrorBox error={loaded.error} />
      {loaded.value ? (
        <SettingsForm initial={loaded.value} />
      ) : (
        <p>Loading shop information…</p>
      )}
    </>
  );
}
function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const update = (key: keyof Settings, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const { id, updated_at, ...values } = form;
          values.services = values.services
            .map((s) => s.trim())
            .filter(Boolean);
          const { data, error } = await db()
            .from("settings")
            .update(values)
            .eq("id", true)
            .eq("updated_at", updated_at)
            .select("*")
            .single();
          if (error) throw error;
          setForm(data as Settings);
          changed();
          setMessage("Shop settings saved.");
        } catch (e) {
          setError(failure(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox error={error} />
      {message && (
        <p className="alert" role="status">
          {message}
        </p>
      )}
      <fieldset disabled={busy}>
        <div className="two-col">
          {(
            [
              "business_name",
              "owner_name",
              "email",
              "whatsapp",
              "maps_url",
            ] as const
          ).map((key) => (
            <Field
              key={key}
              label={
                {
                  business_name: "Business name",
                  owner_name: "Owner name",
                  email: "Email",
                  whatsapp: "WhatsApp number (country code + number)",
                  maps_url: "Google Maps HTTPS link",
                }[key]
              }
            >
              <input
                required={key === "business_name"}
                type={
                  key === "email"
                    ? "email"
                    : key === "maps_url"
                      ? "url"
                      : "text"
                }
                pattern={key === "maps_url" ? "https://.*" : undefined}
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <Field label="Shop description">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <Field label="Address">
          <textarea
            rows={4}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </Field>
        <Field label="Services (one per line)">
          <textarea
            rows={5}
            value={form.services.join("\n")}
            onChange={(e) => update("services", e.target.value.split("\n"))}
          />
        </Field>
        <h2>Phone numbers</h2>
        {form.phones.map((phone, i) => (
          <div className="array-row" key={i}>
            <Field label={`Phone ${i + 1} label`}>
              <input
                required
                value={phone.label}
                onChange={(e) =>
                  update(
                    "phones",
                    form.phones.map((p, n) =>
                      n === i ? { ...p, label: e.target.value } : p,
                    ),
                  )
                }
              />
            </Field>
            <Field label={`Phone ${i + 1} number`}>
              <input
                type="tel"
                required
                pattern="\+?[0-9]{7,15}"
                value={phone.number}
                onChange={(e) =>
                  update(
                    "phones",
                    form.phones.map((p, n) =>
                      n === i ? { ...p, number: e.target.value } : p,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                update(
                  "phones",
                  form.phones.filter((_, n) => i !== n),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update("phones", [...form.phones, { label: "", number: "" }])
          }
        >
          Add phone
        </button>
        <h2>Opening hours</h2>
        {form.hours.map((hour, i) => (
          <div className="array-row" key={i}>
            <Field label={`Days ${i + 1}`}>
              <input
                required
                placeholder="Monday – Saturday"
                value={hour.days}
                onChange={(e) =>
                  update(
                    "hours",
                    form.hours.map((p, n) =>
                      n === i ? { ...p, days: e.target.value } : p,
                    ),
                  )
                }
              />
            </Field>
            <Field label={`Hours ${i + 1}`}>
              <input
                required
                placeholder="10:00 AM – 8:00 PM"
                value={hour.time}
                onChange={(e) =>
                  update(
                    "hours",
                    form.hours.map((p, n) =>
                      n === i ? { ...p, time: e.target.value } : p,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                update(
                  "hours",
                  form.hours.filter((_, n) => i !== n),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update("hours", [...form.hours, { days: "", time: "" }])
          }
        >
          Add hours
        </button>
        <h2>Social links</h2>
        {form.social_links.map((link, i) => (
          <div className="array-row" key={i}>
            <Field label={`Social label ${i + 1}`}>
              <input
                required
                value={link.label}
                onChange={(e) =>
                  update(
                    "social_links",
                    form.social_links.map((p, n) =>
                      n === i ? { ...p, label: e.target.value } : p,
                    ),
                  )
                }
              />
            </Field>
            <Field label={`Social URL ${i + 1}`}>
              <input
                type="url"
                pattern="https://.*"
                required
                value={link.url}
                onChange={(e) =>
                  update(
                    "social_links",
                    form.social_links.map((p, n) =>
                      n === i ? { ...p, url: e.target.value } : p,
                    ),
                  )
                }
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                update(
                  "social_links",
                  form.social_links.filter((_, n) => i !== n),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update("social_links", [
              ...form.social_links,
              { label: "", url: "" },
            ])
          }
        >
          Add social link
        </button>
        <div className="actions">
          <button className="primary">
            {busy ? "Saving…" : "Save shop settings"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
