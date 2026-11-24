/**
 * TravelVista — Cloudflare Worker
 * - Serves static assets from /public
 * - Renders dynamic package pages at /package/:slug
 * - Fetches package data from Firestore REST API (public read)
 */

const FIREBASE_PROJECT = "travelvista-app-fc93a";
const FIREBASE_API_KEY = "AIzaSyC94eV35vYNjRz_w-4INGwX0c5MjUHBwTQ";

/* ---------- Helpers ---------- */
function toSlug(str) {
  return String(str || "package")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function fmtPrice(n) {
  return "$" + (Number(n) || 0).toLocaleString("en-US");
}

/* ---------- Firestore Fetchers ---------- */
async function fetchAllPackages() {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/packages?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.documents || [])
    .map((doc) => {
      const f = doc.fields || {};
      const name = f.name?.stringValue || "";
      return {
        id: doc.name.split("/").pop(),
        name,
        destination: f.destination?.stringValue || "",
        category: f.category?.stringValue || "",
        duration: f.duration?.stringValue || "",
        departureDate: f.departureDate?.stringValue || "",
        price: Number(f.price?.integerValue ?? f.price?.doubleValue ?? 0),
        rating: Number(f.rating?.doubleValue ?? f.rating?.integerValue ?? 0),
        description: f.description?.stringValue || "",
        image: f.image?.stringValue || "",
        status: f.status?.stringValue || "draft",
        createdAt: Number(f.createdAt?.integerValue ?? f.createdAt?.doubleValue ?? 0),
        slug: toSlug(name),
      };
    })
    .filter((p) => p.status === "published");
}

async function fetchPackageBySlug(slug) {
  const all = await fetchAllPackages();
  return all.find((p) => p.slug === slug) || null;
}

/* ---------- HTML: Package Page ---------- */
function packagePageHTML(pkg) {
  const metaDesc = esc(pkg.description).slice(0, 155) || `${pkg.name} in ${pkg.destination}`;
  const heroImg = pkg.image || "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=70";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pkg.name)} — TravelVista</title>
<meta name="description" content="${metaDesc}">
<meta property="og:title" content="${esc(pkg.name)} — TravelVista">
<meta property="og:description" content="${metaDesc}">
<meta property="og:image" content="${esc(heroImg)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #0f3d3e; --primary-hover: #0a2a2b;
    --text-dark: #222; --text-muted: #666; --bg-light: #f8f9fa;
    --white: #fff; --border: #e0e0e0;
    --font-heading: 'Playfair Display', serif;
    --font-body: 'DM Sans', sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-body); color: var(--text-dark); background: var(--bg-light); line-height: 1.6; }
  a { text-decoration: none; color: inherit; }

  .site-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 5%; background: var(--white); box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 100; }
  .brand { display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; font-weight: 700; color: var(--primary); }
  .brand-mark { font-size: 1.5rem; }
  .brand-light { font-weight: 400; }
  .header-cta { background: var(--primary); color: #fff; padding: 0.6rem 1.2rem; border-radius: 5px; font-weight: 500; }
  .header-cta:hover { background: var(--primary-hover); }
  nav a { margin: 0 1rem; font-weight: 500; }
  nav a:hover { color: var(--primary); }

  .pkg-hero { position: relative; min-height: 60vh; background-image: url('${esc(heroImg)}'); background-size: cover; background-position: center; display: flex; align-items: flex-end; padding: 3rem 5% 3rem; color: #fff; }
  .pkg-hero::before { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,61,62,0.9) 0%, rgba(15,61,62,0.2) 100%); }
  .pkg-hero-content { position: relative; z-index: 2; max-width: 900px; }
  .pkg-tag { display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 0.35rem 0.9rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; letter-spacing: 1.5px; margin-bottom: 1rem; text-transform: uppercase; }
  .pkg-hero h1 { font-family: var(--font-heading); font-size: clamp(2rem, 5vw, 3.8rem); line-height: 1.1; margin-bottom: 0.8rem; }
  .pkg-hero-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 1rem; opacity: 0.95; }
  .pkg-hero-meta span { display: flex; align-items: center; gap: 0.4rem; }

  .pkg-main { max-width: 1200px; margin: -3rem auto 4rem; padding: 0 5%; position: relative; z-index: 5; }
  .pkg-body { background: #fff; border-radius: 14px; padding: 2.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.08); display: grid; grid-template-columns: 1.6fr 1fr; gap: 2.5rem; }
  .pkg-body h2 { font-family: var(--font-heading); font-size: 1.6rem; margin-bottom: 1rem; color: var(--primary); }
  .pkg-description { color: var(--text-muted); font-size: 1.02rem; margin-bottom: 1.5rem; white-space: pre-line; }
  .pkg-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
  .pkg-info-item { background: var(--bg-light); padding: 1rem; border-radius: 10px; }
  .pkg-info-item span { display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.2rem; }
  .pkg-info-item strong { color: var(--text-dark); font-size: 1rem; }

  .pkg-book-card { background: var(--bg-light); border-radius: 12px; padding: 1.8rem; position: sticky; top: 100px; align-self: flex-start; }
  .pkg-book-price { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.2rem; }
  .pkg-book-price strong { display: block; font-family: var(--font-heading); font-size: 2.4rem; color: var(--primary); }
  .pkg-book-price small { color: var(--text-muted); font-size: 0.85rem; }
  .btn-book { display: block; text-align: center; background: var(--primary); color: #fff; padding: 0.9rem 1rem; border-radius: 8px; font-weight: 600; margin-top: 1.2rem; transition: background 0.2s; }
  .btn-book:hover { background: var(--primary-hover); }
  .btn-secondary { display: block; text-align: center; background: transparent; color: var(--primary); padding: 0.9rem 1rem; border-radius: 8px; font-weight: 600; border: 2px solid var(--primary); margin-top: 0.6rem; transition: all 0.2s; }
  .btn-secondary:hover { background: var(--primary); color: #fff; }

  .site-footer { background: #0a2a2b; color: #fff; padding: 2.5rem 5%; text-align: center; }
  .site-footer p { opacity: 0.7; margin-top: 0.5rem; }
  .site-footer small { opacity: 0.5; display: block; margin-top: 1rem; }

  @media (max-width: 860px) {
    .pkg-body { grid-template-columns: 1fr; padding: 1.5rem; }
    .pkg-main { margin-top: -2rem; }
    nav { display: none; }
  }
  @media (max-width: 520px) {
    .pkg-info-grid { grid-template-columns: 1fr; }
    .pkg-hero-meta { font-size: 0.9rem; gap: 1rem; }
  }
</style>
</head>
<body>

<header class="site-header">
  <a class="brand" href="/">
    <span class="brand-mark">▲</span><span>Travel<span class="brand-light">Vista</span></span>
  </a>
  <nav>
    <a href="/">Home</a>
    <a href="/destinations.html">Destinations</a>
    <a href="/packages.html">Packages</a>
    <a href="/contact.html">Contact</a>
  </nav>
  <a class="header-cta" href="/booking.html?package=${encodeURIComponent(pkg.name)}">Book now</a>
</header>

<section class="pkg-hero">
  <div class="pkg-hero-content">
    ${pkg.category ? `<span class="pkg-tag">${esc(pkg.category)}</span>` : ""}
    <h1>${esc(pkg.name)}</h1>
    <div class="pkg-hero-meta">
      <span>📍 ${esc(pkg.destination)}</span>
      ${pkg.duration ? `<span>⏱ ${esc(pkg.duration)}</span>` : ""}
      ${pkg.rating ? `<span>★ ${pkg.rating}</span>` : ""}
    </div>
  </div>
</section>

<main class="pkg-main">
  <div class="pkg-body">
    <div>
      <h2>About this trip</h2>
      <p class="pkg-description">${esc(pkg.description) || "Discover an unforgettable journey curated by TravelVista. Every detail is crafted to give you the most magical experience."}</p>

      <div class="pkg-info-grid">
        <div class="pkg-info-item">
          <span>Destination</span>
          <strong>${esc(pkg.destination) || "—"}</strong>
        </div>
        <div class="pkg-info-item">
          <span>Duration</span>
          <strong>${esc(pkg.duration) || "Flexible"}</strong>
        </div>
        <div class="pkg-info-item">
          <span>Departure</span>
          <strong>${esc(pkg.departureDate) || "Flexible"}</strong>
        </div>
        <div class="pkg-info-item">
          <span>Category</span>
          <strong style="text-transform:capitalize;">${esc(pkg.category) || "—"}</strong>
        </div>
      </div>
    </div>

    <aside class="pkg-book-card">
      <div class="pkg-book-price">
        Starting from
        <strong>${fmtPrice(pkg.price)}</strong>
        <small>per person</small>
      </div>
      <a class="btn-book" href="/booking.html?package=${encodeURIComponent(pkg.name)}&price=${pkg.price}">Book this trip →</a>
      <a class="btn-secondary" href="/contact.html">Ask a question</a>
    </aside>
  </div>
</main>

<footer class="site-footer">
  <strong>TravelVista</strong>
  <p>Go somewhere that moves you.</p>
  <small>© ${new Date().getFullYear()} TravelVista. All rights reserved.</small>
</footer>

</body>
</html>`;
}

/* ---------- HTML: 404 ---------- */
function notFoundHTML(msg = "Package not found") {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Not Found — TravelVista</title>
<style>body{font-family:sans-serif;background:#f8f9fa;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;color:#222;padding:2rem}
h1{font-size:3rem;color:#0f3d3e;margin-bottom:1rem}
p{color:#666;margin-bottom:2rem}
a{display:inline-block;background:#0f3d3e;color:#fff;padding:0.8rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600}</style></head>
<body><div><h1>404</h1><p>${esc(msg)}</p><a href="/">← Back to Home</a></div></body></html>`;
}

/* ---------- Worker Entry ---------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route: /package/:slug  → dynamic package page
    if (path.startsWith("/package/")) {
      const slug = path.slice("/package/".length).replace(/\/$/, "");
      if (!slug) return new Response(notFoundHTML(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });

      try {
        const pkg = await fetchPackageBySlug(slug);
        if (!pkg) {
          return new Response(notFoundHTML(`No package found for "${slug}"`), {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        return new Response(packagePageHTML(pkg), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=60, s-maxage=300",
          },
        });
      } catch (err) {
        return new Response(notFoundHTML("Something went wrong loading this package."), {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    // API: /api/packages → return JSON list (optional, useful for client)
    if (path === "/api/packages") {
      const pkgs = await fetchAllPackages();
      return new Response(JSON.stringify(pkgs), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // Everything else → serve from /public
    return env.ASSETS.fetch(request);
  },
};
