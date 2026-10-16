"""Exports an imported demo as a static site:

    python tools/export-site.py <site url> <pack>/site [max pages] [public url of the copy]

e.g. python tools/export-site.py http://127.0.0.1:8098 kerbside/site 80 https://som3669.github.io/demo-pack/kerbside/site

Crawls the demo's pages, posts, products and archives from the homepage, saves each as
<path>/index.html, downloads the theme and plugin files and photos they use (keeping the
site's folder layout), and rewrites every address to a relative one, so the copy works from
any folder of a static host such as GitHub Pages. Links the copy does not have (cart, checkout,
account, search) become "#". It is a look-only copy: forms and AJAX do nothing."""
import hashlib, io, os, posixpath, re, sys, urllib.parse, urllib.request

BASE = sys.argv[1].rstrip('/')
OUT = sys.argv[2].rstrip('/\\') + '/'
LIMIT = int(sys.argv[3]) if len(sys.argv) > 3 else 80
# Where the copy will be published, for share links (they carry the page's address URL-encoded).
PUBLIC = sys.argv[4].rstrip('/') if len(sys.argv) > 4 else ''
HOST = re.escape(BASE)
ESC_BASE = BASE.replace('/', '\\/')
ASSET = ('/wp-content/', '/wp-includes/')
SKIP = ('/wp-admin', '/wp-json', '/wp-login', '/feed', '/comments/feed', '/cart', '/checkout', '/my-account', '/xmlrpc', '/author/', '/tag/')

pages, queue, assets, done_assets = {}, ['/'], set(), set()


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (demo export)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), r.headers.get('Content-Type', '')


def norm_page(path):
    path = urllib.parse.urlsplit(path).path or '/'
    if not path.endswith('/'):
        path += '/'
    return path


def is_page(path, query):
    p = urllib.parse.urlsplit(path).path
    if query or any(p.startswith(s) for s in SKIP) or p.startswith(ASSET):
        return False
    return not re.search(r'\.[a-z0-9]{2,4}$', p)


def page_file(path):
    path = norm_page(path).strip('/')
    return (path + '/index.html') if path else 'index.html'


def rel(from_file, to_file):
    return posixpath.relpath(to_file, posixpath.dirname(from_file) or '.')


URL_RE = re.compile(HOST + r'(/[^\s"\'()<>\\,&]*)?')
ESC_RE = re.compile(re.escape(ESC_BASE) + r'((?:\\/[^\s"\'()<>,\\&]*)*)')

# 1. Crawl the pages.
while queue and len(pages) < LIMIT:
    path = queue.pop(0)
    if path in pages:
        continue
    try:
        body, ctype = fetch(BASE + path)
    except Exception as e:
        print('skip', path, e)
        pages[path] = None
        continue
    if 'html' not in ctype:
        pages[path] = None
        continue
    html = body.decode('utf-8')
    pages[path] = html
    for m in re.finditer(r'href="' + HOST + r'(/[^"#]*)', html):
        target = m.group(1)
        sp = urllib.parse.urlsplit(target)
        if is_page(sp.path, sp.query):
            p = norm_page(sp.path)
            if p not in pages and p not in queue:
                queue.append(p)
exported = {p for p, h in pages.items() if h}
print('pages', len(exported))


def rewrite(text, from_file, escaped=False):
    def sub(m):
        raw = m.group(1) or '/'
        path = raw.replace('\\/', '/') if escaped else raw
        sp = urllib.parse.urlsplit(path)
        if sp.path.startswith(ASSET):
            assets.add(sp.path)
            out = rel(from_file, sp.path.lstrip('/'))
        elif is_page(sp.path, sp.query) and norm_page(sp.path) in exported:
            out = rel(from_file, page_file(sp.path)) + ('#' + sp.fragment if sp.fragment else '')
        else:
            out = '#'
        return out.replace('/', '\\/') if escaped else out
    return (ESC_RE if escaped else URL_RE).sub(sub, text)


# 2. Write the pages.
for path in sorted(exported):
    html = pages[path]
    f = page_file(path)
    html = re.sub(r'\s(?:srcset|sizes)="[^"]*"', '', html)
    html = re.sub(r'<link[^>]+rel=["\'](?:alternate|EditURI|https://api\.w\.org/|shortlink|canonical|wlwmanifest|pingback|preconnect|dns-prefetch)["\'][^>]*>\s*', '', html)
    html = re.sub(r'<meta name=["\']generator["\'][^>]*>\s*', '', html)
    html = re.sub(r'(<form\b[^>]*\baction=")[^"]*(")', r'\1#\2', html)
    html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)
    html = rewrite(html, f)
    html = rewrite(html, f, escaped=True)
    enc = urllib.parse.quote(BASE, safe='')
    html = re.sub(re.escape(enc) + r'((?:%2F[A-Za-z0-9_.~-]*)*)',
                  lambda m: urllib.parse.quote(PUBLIC + '/' + page_file(urllib.parse.unquote(m.group(1)) or '/'), safe='') if PUBLIC else '', html)
    os.makedirs(os.path.dirname(OUT + f) or OUT, exist_ok=True)
    io.open(OUT + f, 'w', encoding='utf-8', newline='\n').write(html)

# 3. Download the files the pages use, and those their CSS uses.
CSS_URL = re.compile(r'url\(\s*([\'"]?)([^\'")]+)\1\s*\)')
while assets - done_assets:
    path = sorted(assets - done_assets)[0]
    done_assets.add(path)
    target = OUT + path.lstrip('/')
    try:
        body, ctype = fetch(BASE + urllib.parse.quote(path))
    except Exception as e:
        print('missing', path, e)
        continue
    if path.endswith('.css'):
        css = body.decode('utf-8', 'replace')
        for m in CSS_URL.finditer(css):
            ref = m.group(2).strip()
            if ref.startswith('data:') or ref.startswith('#'):
                continue
            absu = urllib.parse.urljoin(BASE + path, ref)
            if absu.startswith(BASE):
                p = urllib.parse.urlsplit(absu[len(BASE):]).path
                if p.startswith(ASSET):
                    assets.add(p)
        css = rewrite(css, path.lstrip('/'))
        body = css.encode('utf-8')
    os.makedirs(os.path.dirname(target), exist_ok=True)
    io.open(target, 'wb').write(body)

size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
print('files', len(done_assets), 'total', round(size / 1048576, 1), 'MB')
print('\n'.join(sorted(page_file(p) for p in exported)))
