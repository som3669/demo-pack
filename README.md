# demo-pack

Demo content for Rcube and Som Shrestha WordPress themes, imported with the
[Storefill – Demo Content Importer](https://wordpress.org/plugins/storefill/) plugin.

Themes ship no demo content of their own. A store owner installs the theme, WooCommerce and
Storefill, opens **Appearance → Import demo**, and Storefill downloads the pack for the active theme
from this repository. Only data is downloaded — JSON and images. Nothing here is executed.

This repository must stay **public**, with **GitHub Pages** turned on (Settings → Pages → Deploy
from a branch → `main`, folder `/ (root)`). Storefill downloads packs from
`https://som3669.github.io/demo-pack/` without signing in. The `.nojekyll` file makes Pages serve
every file as it is.

## Layout

```
index.json            Every pack: which theme it is for, where its pack.json is, what it needs
<pack>/pack.json      The demo content
<pack>/images/…       Photos the pack imports (product photos and so on)
<pack>/CREDITS.md     Licence and source of every photo
```

## Adding a theme

1. Create a folder named after the pack, usually the theme slug.
2. Write `pack.json` (format below) and put its photos under `images/`. Photos the theme already
   ships can be referenced from the theme instead: `theme:assets/images/hero.jpg`.
3. Add an entry to `index.json`. `theme` is the theme's folder name (its stylesheet slug); a child
   theme also sees its parent's packs.
4. Record every photo's licence in the pack's `CREDITS.md`. Use only photos you may redistribute
   (CC0 or your own), and invented brand and product names.
5. Test on a clean site with a local checkout:
   `define( 'STOREFILL_LOCAL_PACKS', '/path/to/demo-pack' );` in `wp-config.php`, then
   `wp storefill import <pack>`, check the site, `wp storefill remove <pack> --yes`.

Bump the pack's `version` in `index.json` whenever `pack.json` changes: Storefill caches packs by
ID and version for six hours.

## index.json

```json
{
  "schema": 1,
  "packs": [
    {
      "id": "unishop",
      "theme": "unishop",
      "title": "Unishop electronics store",
      "description": "Shown on the import screen.",
      "version": "1.0.0",
      "path": "unishop/pack.json",
      "requires": { "wordpress": "7.0", "woocommerce": "11.0" }
    }
  ]
}
```

## pack.json, schema 1

Every section is optional.

| Key | Shape | Notes |
|---|---|---|
| `schema` | `1` | Required. |
| `images` | `{ "<ref>": "<alt text>" }` | Every image the pack uses. A ref is a path in the pack folder (`images/products/phone.jpg`) or a theme file (`theme:assets/images/hero.jpg`). Leave alt empty for product photos: WooCommerce then uses the product name. |
| `product_categories` | `{ "<slug>": { "name", "description", "image" } }` | In menu order. `image` is an image ref. |
| `product_brands` | `{ "<slug>": { "name", "description" } }` | WooCommerce Brands (WooCommerce 9.6+). |
| `attributes` | `{ "<Name>": "<slug>" }` | Global, filterable attributes. Any other spec becomes a product-level attribute. |
| `products` | list | See below. |
| `reviews` | `{ "<product slug>": [ [ "Reviewer", 5, "Text" ] ] }` | Ratings 1–5. |
| `post_categories` | `{ "<slug>": { "name", "description" } }` | |
| `pages` | `{ "<slug>": { "title", "content" } }` | See Content. |
| `posts` | `{ "<slug>": { "title", "excerpt", "image", "days", "category", "content" } }` | `days`: how many days ago it was published. |
| `front_page`, `posts_page` | page slug | Used when the owner ticks "Use the demo homepage". |
| `menu` | `{ "title", "slug", "location", "items" }` | Items: `{ "label", "page" }`, `{ "label", "woocommerce": "shop" }`, `{ "label", "product_cat" }`, `{ "label", "url" }`. Block themes get a navigation menu; classic themes get a menu assigned to `location`. |
| `store_settings` | `{ "<option>": "<value>" }` | Applied on every import. Keep it to settings the demo cannot work without. |
| `demo_site` | object | Applied only with "This is a public demo site" or `--demo-site`: `options` (site title, address, currency, store visibility…), `returns_page` (a page slug), `checkout` (a no-charge payment method and delivery methods), `hide_sample_content`. |

### Products

```json
{
  "slug": "aster-vela-6",
  "name": "Aster Vela 6",
  "category": "phones",
  "brand": "aster",
  "image": "images/products/phone.jpg",
  "gallery": [],
  "sku": "AST-VELA6",
  "sales": 184,
  "regular": "679",
  "sale": "599",
  "sale_days": 0,
  "featured": true,
  "stock": null,
  "weight": 0.17,
  "size": [ 14.7, 7.1, 0.8 ],
  "specs": { "Storage": "128 GB", "Display": "6.1\" OLED" },
  "short": "One or two sentences.",
  "description": [ "Paragraph.", "Paragraph." ],
  "upsells": [ "nordwave-arc-5" ],
  "cross_sells": [ "lumen-twin-65w" ]
}
```

- `category` is a slug or a list of slugs.
- `stock`: `null` (in stock), a number (stock is managed), or `"outofstock"`.
- `sale_days`: a sale that ends that many days after the import.
- `weight` is in kg and `size` (length, width, height) in cm; Storefill converts to the store's units.
- `specs` become visible attributes in this order. A spec whose value is a list is the one the
  product varies by; add `"variations": { "<value>": { "sku", "regular", "sale" } }`.
- `sales` only orders best-seller rows.

### Content

Page and post content is a list of blocks, each `[ type, text ]`:
`p`, `h2`, `h3`, `ul` and `ol` (text is a list of items), `lines` (a list, joined with line
breaks), `details` (`[ "details", "Question", "Answer" ]`) and `img` (an image ref).
