# Mahakal Drapery — editable costume rental catalogue

A display-only catalogue with a separate contact/location page, made with plain HTML, CSS and JavaScript. No installation or build is needed to open the regular website. No online payments, booking system or stock database is included.

## Open and edit

Open `index.html` in a browser with its companion files and `assets/` folder beside it. `contact.html` is the separate Visit & Contact page. The portable `mahakal-drapery.html` download contains both views in one file using hash navigation.

| File | What to edit |
| --- | --- |
| `catalog.js` | Shop information, categories, costume names, rent, photos, sizes and availability |
| `id-registry.json` | Permanent ID-to-category register; never reuse registered IDs |
| `index.html` | Catalogue headings and page text |
| `contact.html` | Contact page and location layout |
| `styles.css` | Colors, typography, spacing, MD symbol crop and responsive layout |
| `app.js` | Category navigation and costume details |
| `site.js` | Shared contact information, phone/email links and map link |
| `assets/` | Original supplied logo and image files |

## Category and ID system

All 145 requested IDs are reserved in the catalogue. They are unfilled entries, not a claim of 145 confirmed costumes in stock. Category order and ages match the supplied list. No specific age has been assigned where one was not provided.

| Category | Age | Code | Reserved IDs |
| --- | --- | --- | --- |
| Kids Traditional | 4–10 Years | KT4 | KT4-01 to KT4-10 |
| Kids Western | 4–10 Years | KW4 | KW4-01 to KW4-10 |
| Kids Bollywood | 11–15 Years | KB15 | KB15-01 to KB15-10 |
| Kids Traditional | 11–15 Years | KT15 | KT15-01 to KT15-10 |
| Kids Garba | Not specified | KG | KG-01 to KG-10 |
| Adult Garba | Not specified | AG | AG-01 to AG-10 |
| Dandiya | Not specified | DD | DD-01 to DD-10 |
| Western | 16 Years & Above | WS | WS-01 to WS-10 |
| Traditional | 16 Years & Above | TR | TR-01 to TR-10 |
| Bollywood | 16 Years & Above | BL | BL-01 to BL-10 |
| Fancy Dress | Not specified | FD | FD-01 to FD-05 |
| Character Costumes | Not specified | CC | CC-01 to CC-05 |
| Dance Costumes | Not specified | DN | DN-01 to DN-05 |
| School / Annual Function | Not specified | SF | SF-01 to SF-05 |
| Drama / Theatre | Not specified | DT | DT-01 to DT-05 |
| Mythological | Not specified | MY | MY-01 to MY-05 |
| Historical | Not specified | HC | HC-01 to HC-05 |
| Festival | Not specified | FC | FC-01 to FC-05 |
| Accessories & Jewellery | Not specified | AJ | AJ-01 to AJ-05 |

## Fill a costume entry

Find the existing ID in `catalog.js` and fill its fields. Keep the same ID and category code. For example (illustrative details only):

```javascript
{
  "id": "KT4-01",
  "categoryCode": "KT4",
  "name": "Your actual costume name",
  "rent": 500,
  "size": "Your actual size",
  "available": true,
  "image": "assets/KT4-01.jpg",
  "imageAlt": "Describe the actual photograph",
  "description": "Optional costume details or rental-duration information",
  "retired": false
}
```

- `rent`: number in rupees, or `null` when not confirmed. Do not include a currency symbol. Set the real rental duration in the description; no duration has been assumed.
- `available`: `true` shows Yes, `false` shows No, and `null` shows Not confirmed.
- `image`: add the real photo to `assets/` and enter its exact filename, preferably named after the costume ID. JPG, PNG and WebP work; portrait photos are recommended. Leave the path empty until a real photo exists.
- `name` and `size`: empty strings show To be added. Age comes from the category.
- The original AI-generated demo photos remain in the asset folder but are no longer connected to any permanent costume ID or displayed as stock.

Availability is edited manually in code; it is not automatically synchronized with rentals. Saving a local file does not update the hosted website until the revised site is published.

## Never reuse an ID

Once an ID is assigned to a physical costume, keep it with that costume permanently. If it leaves the collection, set `retired: true`; keep the entry and its ID in the register. Retired entries are hidden from the customer catalogue. Do not repurpose an old entry for a different costume.

For a new ID beyond the reserved range, add a new object in `products` and add its ID/category mapping in `id-registry.json`. Never modify historical mappings. The validator rejects duplicate IDs, missing registered entries, category mismatches, invalid rents/availability and missing local photos. It cannot determine which physical garment a person assigned to an ID; maintaining that assignment is the shop's responsibility.

Run `node scripts/validate-catalog.mjs` before publishing when Node.js is available. This checks the register without installing packages. The page also detects duplicate IDs at runtime and stops displaying ambiguous records.

## Shop information

The supplied name, original logo, owner Pankaj Soni, Pune address and both phone numbers are included. Email is entered exactly as supplied: `Mahakaldrepary@gmail.com`.

Update the `shop` object in `catalog.js` to change the shared footer and contact page. `phones` contains `{label, number}` objects; +91 is used for call links. WhatsApp stays hidden until its number is confirmed. No opening hours were supplied, so visitors are directed to call. Add `hours` as a list of `{days, time}` objects when known.

The map link searches Google Maps using the full supplied address. For an exact pin, add an HTTPS share URL in `shop.mapsUrl`. The existing MD symbol is cropped from the original logo by CSS; the original image file is unchanged.

## Export and host

Run `python3 scripts/export-downloads.py` to regenerate the portable HTML and source ZIP in `downloads/`. The exporter uses only Python's standard library. Regular website usage requires neither Python nor Node.js.

To host elsewhere, upload all HTML, CSS and JavaScript files, `id-registry.json`, and `assets/` to a static host. The source package contains no hosting credentials. Contact links open phone/email apps; no message-submission form or backend is present.
