# demo-pack

Demo content for WordPress themes, imported with the
[Storefill – Demo Content Importer](https://wordpress.org/plugins/storefill-demo-content-importer/) plugin.

Themes ship no demo content of their own. A store owner installs the theme and Storefill, opens
**Appearance → Import demo**, and Storefill downloads the pack for the active theme from this
repository. Only data is downloaded — JSON and images. Nothing here is executed.

The Vitrena, eBasket, Luma, Unishop and Gadgetix packs declare WooCommerce as a required plugin.
Storefill's admin import button installs or updates and activates these requirements before
importing demo content, keeping the import screen open through WooCommerce activation. Packs without
automatic plugin declarations, older Storefill versions and WP-CLI imports need their plugins
prepared manually first.

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
| `gadgetix` | Gadgetix | A gadget store: 25 products in six gadget categories, each with the devices it works with (a filterable global attribute), battery life, charging, capacity, water rating, ports and real dimensions for the actual size drawing; offers with end dates, low and sold-out stock, a cable sold in two colours, five makers as brands, reviews, buying guides, store pages and a demo checkout with free delivery over $50 |
| `yantra` | Yantra, Yantra Pro | A business site with no store: Home, About, Pricing and Contact built from the theme's own block patterns, six posts in four categories, a main and a footer menu, four footer widgets, an announcement bar, a sticky header and a logo. Schema 2: needs the Storefill version that reads it. Listed twice in `index.json`, as `yantra` and `yantra-pro`, because Yantra Pro is a theme of its own, not a child theme |
| `daybook` | Yantra Pro | A lifestyle blog in four sections, Cook, Grow, Make and Rest, with the latest posts as the homepage: 23 posts with photos and tags, a three-part bread series (Yantra Pro's series), a quote post, four sticky posts for the featured slider, About, Contact and Privacy pages, a main and a footer menu linking the sections, four footer widgets, a logo, and Yantra Pro's blog settings: Masonry with infinite scroll, a table of contents, floating share buttons, view counts, the author page header, dark mode with a header switch, a date and a note in the header's top row, and the phone bar. Schema 3: needs the Storefill version that reads it |

## Layout

A pack is a folder. `pack.json` names the pack's files, and each kind of data has a file of its
own, in the same shape in every pack, the way the dashboard is organised:

```
index.json                 Every pack: its theme, its card in the importer, where its pack.json is
<pack>/pack.json           The pack: its schema, the files it has, the plugins it needs
<pack>/media.json          Images: every photo the pack imports, with its alt text
<pack>/products.json       Store: product categories, brands, attributes, products, reviews
<pack>/content.json        Pages and posts: post categories, the theme's own taxonomies, pages, posts
<pack>/menus.json          Menus, each with its locations
<pack>/patterns.json       The pack's own block patterns, each a file under patterns/
<pack>/customizer.json     Customizer settings (theme mods), a style variation, the pack's CSS
<pack>/widgets.json        Widgets, by widget area
<pack>/settings.json       Dashboard settings: site and store settings, homepage, demo-site extras
<pack>/patterns/*.html     Block markup of the pack's patterns
<pack>/<name>.css          The pack's CSS, named in customizer.json
<pack>/preview.jpg         The demo's picture on its card in the importer
<pack>/images/…            Photos
<pack>/CREDITS.md          Licence and source of every photo
```

`pack.json` is required. A pack lists the other files it has under `"files"`, and Storefill reads
only those. Every file starts with `"schema": 1`.

```json
{
  "schema": 3,
  "files": [ "media.json", "products.json", "content.json", "menus.json", "patterns.json", "customizer.json", "widgets.json", "settings.json" ],
  "required_plugins": [ … ]
}
```

A demo holds everything it needs. A theme holds features only: no demo's patterns, settings,
photos, pages, posts, menus or widgets.

Packs made before this layout keep their sections (`images`, `products`, `pages`, `posts`, `menu`,
`menus` and the rest) in `pack.json` itself; Storefill reads both. Keep a pack that the released
Storefill imports in that form until the Storefill that reads these files is released.

## Adding a theme

1. Create a folder named after the pack, usually the theme slug.
2. Write `pack.json` and the files it needs, one per kind (Layout above, formats below): its
   photos under `images/`, its layouts as patterns under `patterns/`, its menus, widgets,
   Customizer and dashboard settings, and its CSS. Everything the demo needs is in the pack.
3. Add an entry to `index.json`. `theme` is the theme's folder name (its stylesheet slug); a child
   theme also sees its parent's packs. Give it a `preview` (1200 × 900) and its `categories` for
   its card in the importer.
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
      "version": "1.1.2",
      "path": "unishop/pack.json",
      "required_plugins": [
        {
          "slug": "woocommerce",
          "name": "WooCommerce",
          "file": "woocommerce/woocommerce.php",
          "minimum_version": "11.0"
        }
      ],
      "requires": { "wordpress": "7.0", "woocommerce": "11.0" }
    }
  ]
}
```

### The demo's card

The importer lists every demo for the active theme as a card to choose from (with one demo it
opens that demo straight away). These index fields fill the card and the demo's page:

| Field | Shape | Notes |
|---|---|---|
| `preview` | path in the library | The demo's picture, 4:3 (1200 × 900), `.jpg`, `.png` or `.webp`. Storefill downloads it once per pack version into the site's uploads (`storefill-previews/`), so the admin screen never loads an image from the library's host. Without one, the theme's screenshot shows. |
| `categories` | list of names | The demo's kinds, such as `[ "Shop", "Food and drink" ]`. With more than one kind among a theme's demos, the importer shows a chip for each. |
| `demo_url` | URL | The live demo, opened from the demo's page in a new tab. |
| `screens` | list of `{ "title", "image" }` | The demo's pages as full-page pictures, such as `{ "title": "Home", "image": "daybook/screens/home.jpg" }`, up to 8. Opening the demo shows them in a preview with a tab for each page, beside Import. Take them 1280 pixels wide as `.jpg` (about 75% quality keeps a long page under 600 KB). Storefill downloads them into the site's uploads the first time the demo is opened, once per pack version. Without them, the preview shows `preview`. |
| `pro` | `true` | A Pro demo, such as one made for a Pro theme. The importer shows a Pro badge at the top right of its card and of its preview. Leave it out for a free demo. |
| `shown_with` | list of theme slugs | Also list the demo for these themes, such as a free theme's Pro demos: `"theme": "yantra-pro", "shown_with": [ "yantra" ]`. There it shows "For Yantra Pro" and imports once that theme is active (Activate, or Get Yantra Pro). |
| `theme_name` | text | The theme's name, for a site that doesn't have it installed. |
| `upgrade_url` | URL | Where the theme the demo needs is had; the Get button links there. |

All text in a pack is plain text: Storefill strips any HTML from it. Pattern files are the one
exception: block markup, cleaned the way WordPress cleans a post by an author without the
`unfiltered_html` capability.

## pack.json, schemas 1, 2 and 3

Every section except `schema` is optional.

A pack that uses anything marked **schema 2** below says `"schema": 2`, and one that uses
anything marked **schema 3** says `"schema": 3`. Storefill versions that predate it then decline
the pack with a clear message, rather than importing pages with their patterns or links left out.
Everything else works in all three.

| Key | Shape | Notes |
|---|---|---|
| `schema` | `1`, `2` or `3` | Required. |
| `required_plugins` | `[ { "slug", "name", "file", "minimum_version" } ]` | WordPress.org plugins prepared before the admin content import starts. Repeat the declaration in the pack's index entry. See Required plugins. |
| `files` | `[ "settings.json", "customizer.json", "widgets.json" ]` | The optional files this pack has. |
| `images` | `{ "<ref>": "<alt text>" }` | Every image the pack uses, including any named in `customizer.json`. A ref is a path in the pack folder (`images/products/phone.jpg`) or a theme file (`theme:assets/images/hero.jpg`). Leave alt empty for product photos: WooCommerce then uses the product name. |
| `product_categories` | `{ "<slug>": { "name", "description", "image" } }` | In menu order. `image` is an image ref. |
| `product_brands` | `{ "<slug>": { "name", "description" } }` | WooCommerce Brands (WooCommerce 9.6+). |
| `attributes` | `{ "<Name>": "<slug>" }` | Global, filterable attributes. Any other spec becomes a product-level attribute. |
| `products` | list | See below. |
| `reviews` | `{ "<product slug>": [ [ "Reviewer", 5, "Text" ] ] }` | Ratings 1–5. |
| `post_categories` | `{ "<slug>": { "name", "description" } }` | |
| `pages` | `{ "<slug>": { "title", "content", "template" } }` | See Content. `template` is a page template of the theme, by its file (`page-templates/full-width.php`) or, schema 2, by its file name alone (`full-width`); it is used only when the theme has it. |
| `posts` | `{ "<slug>": { "title", "excerpt", "image", "days", "category", "content" } }` | `days`: how many days ago it was published. Schema 3 adds `tags` (tag names, created when missing), `"sticky": true` (sticky posts, such as the slides of a featured posts slider), `format` (a post format such as `quote`; the theme decides how it shows) and `terms`: terms of the theme's own post taxonomies by slug, as defined under `taxonomies` (`"terms": { "themor_series": [ "bread-step-by-step" ] }`). |
| `taxonomies` | `{ "<taxonomy>": { "<slug>": { "name", "description" } } }` | Schema 3. Terms of a taxonomy the theme registers for posts, such as Yantra Pro's series (`themor_series`), for posts to name under `terms`. Categories, tags and post formats have keys of their own; a taxonomy the site does not register is skipped and named in the import log. A series lists its posts in the order they were published, so give them `days` from the first part to the last. |
| `menu` | `{ "title", "slug", "location", "items" }` | Items: `{ "label", "page" }`, `{ "label", "woocommerce": "shop" }`, `{ "label", "product" }`, `{ "label", "product_cat" }`, `{ "label", "url" }`; schema 2 adds `{ "label", "post" }` and an `"anchor"` on any of them (`{ "label": "Features", "page": "home", "anchor": "features" }`); schema 3 adds `{ "label", "category" }`, a post category from `post_categories`. Block themes get a navigation menu; classic themes get a menu assigned to `location`, which in schema 2 may be a list (`[ "primary", "mobile" ]`). Locations the theme does not register are skipped. |
| `menus` | list of menus shaped like `menu` | Schema 2. More menus, such as a footer menu, each with its own location. In `menus.json`, every menu is in this list. |
| `patterns` | `{ "<key>": { "title", "file", "links" } }` | Schema 3. The pack's own block patterns. See Patterns. |

### Required plugins

Declare dependencies in `pack.json`; this is the importer's authoritative list. Repeat the same
metadata in the corresponding `index.json` entry so library tools can inspect it.

```json
"required_plugins": [
  {
    "slug": "woocommerce",
    "name": "WooCommerce",
    "file": "woocommerce/woocommerce.php",
    "minimum_version": "11.0"
  }
]
```

`slug` identifies the plugin in the WordPress.org directory. `name` appears in import progress.
`file` is the plugin's main PHP file relative to `wp-content/plugins`; it must belong to the
directory named by its slug. `minimum_version` is the oldest compatible version. Keep it
consistent with `requires.woocommerce` for WooCommerce store packs.

After **Import demo content** is clicked, Storefill prepares declared requirements before
importing images, products, pages or settings. Requirements that are already active at a
compatible version need no changes. Installation, update or activation failures stop before
content import; the administrator can correct the problem and retry. The operation uses normal
WordPress plugin permissions and only downloads packages from WordPress.org. Installed plugins
remain installed when demo content is removed.

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
- `meta` (schema 3): extra details a theme reads from a product, such as its own badge or a
  back-in-stock date: `"meta": { "_themor_badge": "Fresh today", "_themor_restock_date": { "days": 2 } }`.
  Only keys the active theme allows through the `storefill_product_meta_keys` filter are set (as
  plain text); others are skipped and named in the import log. `{ "days": 2 }` becomes the date two
  days after the import, so a demo's dates stay ahead.

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
| `quote` | `[ "quote", "Text", "Who said it" ]` | Schema 3. One quote in the flow of the text, such as a pull quote in a post; who said it is optional. A quote post shows its first quote in lists. (`quotes` puts quotes side by side in wide columns.) |
| `buttons` | list of links, and optionally `"center"` as a third element | A row of buttons; the first is filled, the rest outlined. Links are written like menu items: `{ "label", "page" }`, `{ "label", "woocommerce": "shop" }`, `{ "label", "product" }` (a product slug), `{ "label", "product_cat" }`, `{ "label", "category" }` (a post category, schema 3) or `{ "label", "url" }`. A link to a page works from any page of the pack, whatever their order. `"center"` centres the row, as under a product grid. |
| `products` | `{ "show", "count" }` | A product grid (WooCommerce's Product Collection block). `show`: `featured`, `on-sale`, `newest` or `best-selling`. Skipped without WooCommerce. |
| `posts` | `{ "count", "category", "layout" }` | The latest posts, with their featured images. `category` is a slug from `post_categories` (in schema 2 also a list of slugs): only their posts are listed, so posts the site already had, such as WordPress's "Hello world!", stay out of the demo's list. Schema 2: `"layout": "list"` lists titles and dates only, as in a footer column. |
| `pattern` | `{ "slug", "links", "categories" }` | Schema 2. A block pattern the active theme registers, such as `yantra/hero`, written into the page as ordinary blocks (patterns inside it too), so it can be edited like any other. The theme's own words and look come with it, and its words are translated with the theme. `links` points the pattern's placeholder links (`href="#"`) at the pack's pages by the text they show: `[ { "text": "Get started", "page": "pricing" } ]`, written like menu items; text that does not match, as in another language, keeps its placeholder. `categories` (slugs from `post_categories`) limits the pattern's post lists (Query Loops) to the demo's posts. A pattern the theme does not have is left out and named in the import log. |
| `links` | list of links, written like menu items | Schema 2. A list of links, such as a column of pages in a footer widget. |
| `section` | `{ "items", "background", "text" }` | A full-width section holding other items, with space above and below. `background` and `text` are optional colours: a slug from the theme's palette, such as `accent-5` or `contrast`, or a hex colour such as `#f4f4f1`. Palette colours follow the theme's style variation, so prefer them in block themes; an unknown slug is skipped. Sections sit flush against each other, so alternating backgrounds form bands. |
| `media` | `{ "image", "heading", "text", "buttons", "side" }` | A photo beside a heading, text and buttons, to spotlight one product or idea. `"side": "right"` puts the photo on the right. Stacks on phones. |
| `quotes` | list of `{ "text", "name", "rating" }` | A row of customer quotes; `rating` (1–5) shows as stars above the quote. |
| `features` | list of `{ "title", "text" }` | A row of short features, such as delivery, returns and warranty promises. |
| `tiles` | list of `{ "label", "image", <link> }` | A row of photo tiles with a linked title, such as one per category. The link is written like a menu item: `"product_cat": "audio"`, `"page"`, `"woocommerce"` or `"url"`. |

## Patterns

A pack's own layouts are block patterns: `patterns.json` names them, and each is a file of block
markup under `patterns/`, as the block editor's Code editor shows it.

```json
{
  "schema": 1,
  "patterns": {
    "hero": {
      "title": "Café hero with an order receipt",
      "file": "patterns/hero.html",
      "links": [ { "text": "Order ahead", "woocommerce": "shop" }, { "text": "See the menu", "page": "menu" } ]
    }
  }
}
```

- A page or widget places one with `[ "pattern", { "slug": "hero" } ]`: the pack's own pattern by
  its key, else a pattern the theme registers by that name.
- Pictures name the pack's images by their path: `<img src="images/hero-photo.jpg" alt=""/>`, a
  cover's `"url":"images/…"`. They get the imported photo, its ID and its alt text.
- `links` points the pattern's placeholder links (`href="#"`) where they lead, by the text they
  show, written like menu items.
- Shortcodes of the theme and plugins (`[themor_store_hours]`, `[products]`) work in a Shortcode block.
- The patterns are also added to the site's own patterns (Patterns in the editor, not synced), in
  a category named after the demo, to use on other pages. Removing the demo deletes them.
- Style a pattern with classes and the pack's CSS (customizer.json `css`), not inline styles a
  post would lose.

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
| `homepage` | When the owner ticks "Use the demo homepage and blog page" | Page slugs from `pack.json`. Schema 3: `"latest_posts": true` opens the site on its latest posts instead, as a blog does. |
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
- Schema 2: `{ "page_url": "<slug>" }` and `{ "post_url": "<slug>" }` become the address of one of
  the pack's pages or posts, such as where a header button or an announcement leads.
- `nav_menu_locations` and `sidebars_widgets` are ignored here: the menu's `location` and
  `widgets.json` set those.
- `"css": "kerbside.css"`: a CSS file of the pack, added to the site's Additional CSS after the
  site's own, between two comments naming the pack. Removing the demo takes out that part only.
  It may not contain `<` or `@import`; both are removed.
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
