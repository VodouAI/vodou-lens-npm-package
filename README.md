# vodou-lens-npm-package

A **Vodou Lens** that renders any [npmjs.com](https://npmjs.com) package page as
a clean structured summary inside a Vodou chat.

## What it shows

Given a URL like `https://www.npmjs.com/package/express`, the lens returns:

```json
{
  "name": "express",
  "version": "5.0.1",
  "description": "Fast, unopinionated, minimalist web framework",
  "license": "MIT",
  "author": "TJ Holowaychuk",
  "homepage": "http://expressjs.com/",
  "repository": "https://github.com/expressjs/express",
  "keywords": ["express", "framework", "sinatra", "web", "http"],
  "dependency_count": 28,
  "weekly_downloads": 32145678
}
```

## Install

Inside Vodou (recommended):

```bash
vodou-core lenses install https://github.com/VodouAI/vodou-lens-npm-package
```

Or paste the URL into the **+ Add lens** dialog in the gateway sidebar's Lenses tab.

## How it works

- Pure public APIs — no scraping, no auth.
- `registry.npmjs.org/<package>` for metadata (license, deps, version)
- `api.npmjs.org/downloads/point/last-week/<package>` for download stats
- Both calls parallelized; download count is optional (lens still works if rate-limited).

## Permissions

| | |
|---|---|
| Network | `registry.npmjs.org`, `api.npmjs.org` |
| JS execution | none |
| Cookies | ephemeral (no auth) |
| Actions | none — display-only |

## License

MIT — see [LICENSE](LICENSE).

## Built for

[Vodou](https://vodou.ai) — the AI that lives in your browser.
Part of the [Vodou Lenses](https://github.com/VodouAI/lenses-directory) community.
