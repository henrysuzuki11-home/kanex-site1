# Skyfellow Initiative — Website

Bilingual (EN / JP) single-page website for the Skyfellow Initiative.
Built for deployment on **GitHub Pages** with no external dependencies (Google Analytics, Google AdSense, and Google Forms excepted).

---

## File Structure

```
skyfellow-site/
├── index.html                      ← Main website (single file, all CSS + JS included)
├── skyfellow-logo.jpg              ← Official Skyfellow logo (header brand mark)
├── suzuki-profile-photo.jpeg       ← Suzuki photo for Founding Members section
├── miwa-profile-photo.jpeg         ← Miwa photo for Founding Members section
├── suzuki-greeting-photo.jpg       ← Suzuki portrait for Greeting section (Representative)
├── miwa-greeting-photo.jpg         ← Miwa portrait for Greeting section (Partner)
├── skyfellow-hero-bg.jpeg          ← Hero section background image
├── skyfellow-global-network.jpeg   ← Purpose section supporting image
├── skyfellow-bridge-concept.jpeg   ← Approach section supporting image
└── skyfellow-ogp.jpeg              ← OGP / LinkedIn share image (metadata only)
```

### Notes on photos
- `suzuki-greeting-photo.jpg` and `miwa-greeting-photo.jpg` are currently set to the same images as the profile photos, so the site renders correctly out of the box. You may replace them with dedicated executive portraits (dark navy / charcoal business suit, conservative tie, professional studio framing) — keep the same filenames.

---

## Integrations Built In

- **Google Analytics 4** — Measurement ID `G-QJZBGP9JZZ`
- **Google AdSense** — Publisher `ca-pub-5508289096424625` (head script only, no visible ad blocks)
- **Google Forms** — separate EN/JP contact forms wired to the language toggle
- **LinkedIn** — public profile links on each member card

---

## GitHub Pages Deployment

1. Create a new public GitHub repository.
2. Upload **all files in this folder** to the repository root.
3. Go to **Settings → Pages** → set Branch to `main`, folder `/` (root) → Save.
4. After ~1 minute, the site will be live at `https://<username>.github.io/<repo-name>/`.

For deployment to a custom domain (e.g. `skyfellow-initiative.com`), add a `CNAME` file to the repo root containing the domain, and configure DNS at your registrar to point to GitHub Pages.

---

## Updating Content

All content lives inside `index.html`. Open in any text editor.

- **English text**: inside `<div class="en">` blocks
- **Japanese text**: inside `<div class="jp">` blocks
- **Contact form links**: search for `docs.google.com/forms`
- **Color tokens**: CSS variables defined in `:root { ... }` at the top of the `<style>` block

---

## Technical Notes

- Pure static HTML/CSS/JS — GitHub Pages compatible, no build step.
- Responsive: desktop, tablet, and mobile.
- Default language: English. Toggle: EN / JP.
- All external links open in a new tab (`target="_blank"` + `rel="noopener noreferrer"`).
- No personal email addresses displayed on the page.
