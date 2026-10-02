# demo-pack

Demo content for WordPress themes, imported with the
[Storefill – Demo Content Importer](https://wordpress.org/plugins/storefill-demo-content-importer/) plugin.

Themes ship no demo content of their own. A store owner installs the theme, WooCommerce and
Storefill, opens **Appearance → Import demo**, and Storefill downloads the pack for the active theme
from this repository. Only data is downloaded — JSON and images. Nothing here is executed.

This repository must stay **public**, with **GitHub Pages** turned on (Settings → Pages → Deploy
from a branch → `main`, folder `/ (root)`). Storefill downloads packs from
`https://som3669.github.io/demo-pack/` without signing in. The `.nojekyll` file makes Pages serve
every file as it is.

## Packs

| Pack | Theme | What it adds |
|---|---|---|
| `twentytwentyfive` | Twenty Twenty-Five | A small electronics store in the theme's Noon style: a homepage with a banner, trust strip, category tiles, sale and featured products, a product spotlight, customer quotes, the journal and a closing banner; 8 products, 3 categories, 2 brands, store pages and a journal |
| `unishop` | Unishop | An electronics store: 20 products, brands, reviews, buying guides and store pages |
| `ebasket` | eBasket | A neighbourhood grocer: 37 products in 8 aisles with pack sizes, nutrition panels and diet tags, offers with end dates, a variable coffee, reviews, recipes, store pages and a demo checkout with free delivery over £40 |
| `luma` | Luma | A skincare formulary: 39 products in 8 categories, each with key actives and their strength, pH, texture, skin type, a Concern and a Routine step (global attributes), size, period after opening and the full ingredient list; products sold by shade and by size, offers with end dates, reviews, a journal, store pages and a demo checkout with free delivery over £35 |
| `vitrena` | Vitrena | A showroom for considered electronics: 23 products from nine makers in five departments, with warranty, box contents and condition (ex-display, certified pre-owned) as attributes, brands, reviews, Visit, Services and Makers pages on the theme's page templates, a journal and a demo checkout |

## Layout

Each kind of data has its own file, so a pack reads the way the dashboard is organised:

```
index.json                Every pack: which theme it is for, where its pack.json is, what it needs
<pack>/pack.json          Content: products, categories, pages, posts, the menu
<pack>/settings.json      Dashboard settings: site and store settings, homepage, demo-site extras
<pack>/customizer.json    Customizer settings (theme mods) and, for block themes, a style variation
<pack>/widgets.json       Widgets, by widget area
<pack>/images/…           Photos the pack imports (product photos and so on)
<pack>/CREDITS.md         Licence and source of every photo
```

`pack.json` is required. The other three are optional: list the ones a pack has in `pack.json`
under `"files"`, and Storefill reads only those.

## Adding a theme

1. Create a folder named after the pack, usually the theme slug.
2. Write `pack.json` and any of `settings.json`, `customizer.json` and `widgets.json` it needs
   (formats below), and put its photos under `images/`. Photos the theme already ships can be
   referenced from the theme instead: `theme:assets/images/hero.jpg`.
3. Add an entry to `index.json`. `theme` is the theme's folder name (its stylesheet slug); a child
   theme also sees its parent's packs.
4. Name photo files so no file name equals a product, page or post slug: `bananas-photo.jpg`, not
   `bananas.jpg`. WordPress names an attachment after its file, and Storefill 1.0.0 would take an
   attachment called `bananas` for an existing product of that slug and skip the product.
5. Record every photo's licence in the pack's `CREDITS.md`. Use only photos you may redistribute
   (CC0 or your own), with no visible brand logos, and invented brand and product names.
6. Test on a clean site with a local checkout:
   `define( 'STOREFILL_LOCAL_PACKS', '/path/to/demo-pack' );` in `wp-config.php`, then
   `wp storefill import <pack>`, check the site, `wp storefill remove <pack> --yes`.

Bump the pack's `version` in `index.json` whenever any of its files changes: Storefill caches packs
by ID and version for six hours.

After pushing, check that GitHub Pages published it
(`gh api repos/som3669/demo-pack/pages/builds`); a push does not always start a Pages build, and
`gh api -X POST repos/som3669/demo-pack/pages/builds` starts one.

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
      "version": "1.1.0",
      "path": "unishop/pack.json",
      "requires": { "wordpress": "7.0", "woocommerce": "11.0" }
    }
  ]
}
```

All text in a pack is plain text: Storefill strips any HTML from it.

## pack.json, schema 1

Every section except `schema` is optional.

| Key | Shape | Notes |
|---|---|---|
| `schema` | `1` | Required. |
| `files` | `[ "settings.json", "customizer.json", "widgets.json" ]` | The optional files this pack has. |
| `images` | `{ "<ref>": "<alt text>" }` | Every image the pack uses, including any named in `customizer.json`. A ref is a path in the pack folder (`images/products/phone.jpg`) or a theme file (`theme:assets/images/hero.jpg`). Leave alt empty for product photos: WooCommerce then uses the product name. |
| `product_categories` | `{ "<slug>": { "name", "description", "image" } }` | In menu order. `image` is an image ref. |
| `product_brands` | `{ "<slug>": { "name", "description" } }` | WooCommerce Brands (WooCommerce 9.6+). |
| `attributes` | `{ "<Name>": "<slug>" }` | Global, filterable attributes. Any other spec becomes a product-level attribute. |
| `products` | list | See below. |
| `reviews` | `{ "<product slug>": [ [ "Reviewer", 5, "Text" ] ] }` | Ratings 1–5. |
| `post_categories` | `{ "<slug>": { "name", "description" } }` | |
| `pages` | `{ "<slug>": { "title", "content", "template" } }` | See Content. `template` is a page template of the theme, such as `page-no-title`; it is used only when the theme has it. |
| `posts` | `{ "<slug>": { "title", "excerpt", "image", "days", "category", "content" } }` | `days`: how many days ago it was published. |
| `menu` | `{ "title", "slug", "location", "items" }` | Items: `{ "label", "page" }`, `{ "label", "woocommerce": "shop" }`, `{ "label", "product" }`, `{ "label", "product_cat" }`, `{ "label", "url" }`. Block themes get a navigation menu; classic themes get a menu assigned to `location`. |

### Products

```json
{
  "slug": "aster-vela-6",
  "name": "Aster Vela 6",
  "category": "phones",
  "brand": "aster",
  "tags": [ "Vegan", "Gluten free" ],
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
- `tags` are product tag names, created when missing (eBasket shows them as diet badges and a shop
  filter). Storefill 1.0.0 skips this key; tags import from the next version.
- `stock`: `null` (in stock), a number (stock is managed), or `"outofstock"`.
- `sale_days`: a sale that ends that many days after the import.
- `weight` is in kg and `size` (length, width, height) in cm; Storefill converts to the store's units.
- `specs` become visible attributes in this order. A spec whose value is a list is the one the
  product varies by; add `"variations": { "<value>": { "sku", "regular", "sale" } }`.
- `sales` only orders best-seller rows.

### Content

Page, post and widget content is a list of items, each `[ type, value ]`:

| Item | Value | Becomes |
|---|---|---|
| `p` | text | A paragraph. |
| `h2`, `h3` | text, and optionally `"wide"` as a third element | A heading. `[ "h2", "Featured", "wide" ]` spans the wide column, to line up with product grids and post lists. |
| `ul`, `ol` | list of texts | A list. |
| `lines` | list of texts | One paragraph with line breaks. |
| `details` | `[ "details", "Question", "Answer" ]` | A details (FAQ) block. |
| `img` | image ref | An image. |
| `cover` | `{ "image", "heading", "text", "buttons", "height", "level" }` | A full-width banner: the image under a dark overlay, with a heading, text and buttons. `height` is in pixels (240–800, 520 by default). `level` is `1` for the banner that opens a page (the default: its heading is the page's main heading) or `2` for a later one, such as a closing call to action. |
| `buttons` | list of links, and optionally `"center"` as a third element | A row of buttons; the first is filled, the rest outlined. Links are written like menu items: `{ "label", "page" }`, `{ "label", "woocommerce": "shop" }`, `{ "label", "product" }` (a product slug), `{ "label", "product_cat" }` or `{ "label", "url" }`. A link to a page works from any page of the pack, whatever their order. `"center"` centres the row, as under a product grid. |
| `products` | `{ "show", "count" }` | A product grid (WooCommerce's Product Collection block). `show`: `featured`, `on-sale`, `newest` or `best-selling`. Skipped without WooCommerce. |
| `posts` | `{ "count", "category" }` | The latest posts, with their featured images. `category` is a slug from `post_categories`: only its posts are listed, so posts the site already had, such as WordPress's "Hello world!", stay out of the demo's list. |
| `section` | `{ "items", "background", "text" }` | A full-width section holding other items, with space above and below. `background` and `text` are optional colours: a slug from the theme's palette, such as `accent-5` or `contrast`, or a hex colour such as `#f4f4f1`. Palette colours follow the theme's style variation, so prefer them in block themes; an unknown slug is skipped. Sections sit flush against each other, so alternating backgrounds form bands. |
| `media` | `{ "image", "heading", "text", "buttons", "side" }` | A photo beside a heading, text and buttons, to spotlight one product or idea. `"side": "right"` puts the photo on the right. Stacks on phones. |
| `quotes` | list of `{ "text", "name", "rating" }` | A row of customer quotes; `rating` (1–5) shows as stars above the quote. |
| `features` | list of `{ "title", "text" }` | A row of short features, such as delivery, returns and warranty promises. |
| `tiles` | list of `{ "label", "image", <link> }` | A row of photo tiles with a linked title, such as one per category. The link is written like a menu item: `"product_cat": "audio"`, `"page"`, `"woocommerce"` or `"url"`. |

## settings.json

Dashboard settings. Every section is optional.

```json
{
  "schema": 1,
  "options": { "woocommerce_currency": "USD" },
  "homepage": { "front_page": "home", "posts_page": "journal" },
  "demo_site": {
    "options": { "blogname": "Bytewell", "woocommerce_coming_soon": "no" },
    "returns_page": "shipping-returns",
    "checkout": {
      "payment_title": "Demo payment (no charge)",
      "payment_description": "…",
      "payment_instructions": "…",
      "shipping": [ { "method": "flat_rate", "title": "Standard delivery", "cost": "4.95" } ]
    },
    "hide_sample_content": true
  }
}
```

| Key | Applied | Notes |
|---|---|---|
| `options` | On every import | Keep it to settings the demo cannot work without. |
| `homepage` | When the owner ticks "Use the demo homepage and blog page" | Page slugs from `pack.json`. |
| `demo_site` | Only with "This is a public demo site" or `--demo-site` | `options` (site title, address, currency, store visibility…), `returns_page` (a page slug), `checkout` (a payment method that takes no money, and delivery methods), `hide_sample_content` (unpublishes WordPress's sample post and page). |

Removing the demo puts every setting back the way it was.

### Settings a pack may change

`options` and `demo_site.options` can only set these, to plain text values. Storefill skips
anything else and says so in the import log, so a pack can never change accounts, roles, URLs or
security settings.

`blogname`, `blogdescription`, `woocommerce_coming_soon`, `woocommerce_store_pages_only`,
`woocommerce_currency`, `woocommerce_currency_pos`, `woocommerce_price_thousand_sep`,
`woocommerce_price_decimal_sep`, `woocommerce_price_num_decimals`, `woocommerce_store_address`,
`woocommerce_store_address_2`, `woocommerce_store_city`, `woocommerce_store_postcode`,
`woocommerce_default_country`, `woocommerce_weight_unit`, `woocommerce_dimension_unit`,
`woocommerce_enable_reviews`, `woocommerce_enable_review_rating`,
`woocommerce_review_rating_required`, `woocommerce_manage_stock`,
`woocommerce_hide_out_of_stock_items`.

## customizer.json

The pack theme's design settings, applied on every import: Customizer settings (theme mods), mostly
for classic themes, and for block themes one of the theme's own style variations.

```json
{
  "schema": 1,
  "theme_mods": {
    "background_color": "f5efe0",
    "custom_logo": { "image": "images/logo.png" },
    "header_image": { "image_url": "images/header.jpg" },
    "colormag_primary_color": "#207daf"
  },
  "global_styles": { "variation": "Noon" }
}
```

- Values are text, numbers, `true` or `false`, or lists and objects of those.
- `{ "image": "<ref>" }` becomes the ID of that pack image (a logo); `{ "image_url": "<ref>" }`
  becomes its address (a header or background image). The image must be listed in `pack.json`
  `images`.
- `nav_menu_locations` and `sidebars_widgets` are ignored here: the menu's `location` and
  `widgets.json` set those.
- `global_styles.variation` (block themes only) is a style variation the theme ships, by the title
  the Site Editor shows under **Styles → Browse styles**. It becomes the site's styles, as if chosen
  there. If the theme has no such variation, its look stays as it is and the import log says so.
- Removing the demo puts every setting back the way it was, and the site's own styles with them.

## widgets.json

Widgets for the theme's widget areas (classic themes), imported as block widgets.

```json
{
  "schema": 1,
  "sidebars": {
    "sidebar-1": [
      { "title": "About the shop", "content": [ [ "p", "Everyday electronics, chosen with care." ] ] },
      { "content": [ [ "posts", { "count": 3 } ] ] }
    ]
  }
}
```

- Keys are widget area IDs, as the theme registers them. Areas the theme does not have are skipped
  and named in the import log.
- Each widget has optional `title` (shown as a heading) and `content` in the Content format above.
- On a real store the demo's widgets are added after the ones already there. On a public demo site
  they take the area over, and the site's own widgets wait in **Inactive widgets**.
- Removing the demo deletes the demo's widgets and puts the site's own back where they were.
