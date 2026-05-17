/**
 * npm.package — Vodou lens for npmjs.com package URLs.
 *
 * Renders a clean summary of any npm package by pulling its registry
 * metadata + weekly download count. No scraping, no auth — public APIs.
 *
 * URL patterns:  https://www.npmjs.com/package/<name>
 *                https://www.npmjs.com/package/<scope>/<name>
 *
 * License: MIT
 */

const manifest = {
  type: 'npm.package',
  version: 1,
  motive:
    'Show an npm package summary: latest version, description, license, ' +
    'weekly downloads, dependency count, and homepage — pulled live from ' +
    'the npm registry.',
  url_patterns: [
    'npmjs.com/package/**',
    'www.npmjs.com/package/**',
    '*.npmjs.com/package/**',
  ],
  ttl_seconds: 21600, // 6 hours — version/downloads change slowly
  requires: {
    network_domains: ['registry.npmjs.org', 'api.npmjs.org'],
    runs_js: false,
    paths: ['cheerio'],
    cookie_scope: 'ephemeral',
  },
  icon: '📦',
  category: 'dev',
  author: '@vodou',
  license: 'MIT',
  extracts: [
    'name',
    'version',
    'description',
    'license',
    'author',
    'homepage',
    'repository',
    'keywords',
    'dependency_count',
    'weekly_downloads',
  ],
};

/**
 * Extract `<scope>/<pkg>` or `<pkg>` from a URL like
 *   https://www.npmjs.com/package/express
 *   https://www.npmjs.com/package/@types/node
 */
function packageNameFromUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const m = u.pathname.match(/^\/package\/(@[^/]+\/[^/]+|[^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export const card = {
  manifest,

  /**
   * Strict shape check on the rendered model. The registry runs this after
   * fetch to confirm what the lens returned matches its declared `extracts`.
   */
  validate(model) {
    return !!model
      && typeof model.name === 'string' && model.name.length > 0
      && typeof model.version === 'string';
  },

  /**
   * fetch(payload, sourceUrl, ctx)
   *   payload   — what the LLM emitted (unused here; URL is the source-of-truth)
   *   sourceUrl — the npm package URL
   *   ctx       — FetchCtx with fetchStatic + cheerio
   */
  async fetch(_payload, sourceUrl, ctx) {
    const pkg = packageNameFromUrl(sourceUrl);
    if (!pkg) throw new Error(`could not extract package name from URL: ${sourceUrl}`);

    // Two parallel fetches: registry metadata + download stats.
    const registryUrl = `https://registry.npmjs.org/${pkg.replace('/', '%2F')}`;
    const downloadsUrl = `https://api.npmjs.org/downloads/point/last-week/${pkg}`;

    const [regRes, dlRes] = await Promise.all([
      ctx.fetchStatic(registryUrl).catch((e) => { throw new Error(`registry fetch failed: ${e?.message || e}`); }),
      ctx.fetchStatic(downloadsUrl).catch(() => null), // downloads is optional — don't fail the lens if rate-limited
    ]);

    if (regRes.status === 404) {
      throw new Error(`npm package not found: ${pkg}`);
    }
    if (regRes.status >= 400) {
      throw new Error(`npm registry returned ${regRes.status} for ${pkg}`);
    }

    let registry;
    try {
      registry = JSON.parse(regRes.body);
    } catch (e) {
      throw new Error(`npm registry returned non-JSON body for ${pkg}`);
    }

    const latest = registry['dist-tags']?.latest || Object.keys(registry.versions || {}).slice(-1)[0];
    if (!latest) throw new Error(`no versions found for ${pkg}`);
    const versionData = registry.versions?.[latest] || {};

    // The author field can be a string or { name, email, url } — normalize.
    let author = '';
    if (typeof versionData.author === 'string') author = versionData.author;
    else if (versionData.author?.name) author = versionData.author.name;
    else if (registry.author?.name) author = registry.author.name;

    // Repository can be a string or { type, url }.
    let repository = '';
    if (typeof versionData.repository === 'string') repository = versionData.repository;
    else if (versionData.repository?.url) repository = versionData.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');

    // Weekly downloads — null when the optional fetch failed.
    let weeklyDownloads = null;
    if (dlRes && dlRes.status === 200) {
      try {
        const dl = JSON.parse(dlRes.body);
        if (typeof dl.downloads === 'number') weeklyDownloads = dl.downloads;
      } catch { /* tolerate */ }
    }

    const deps = versionData.dependencies || {};

    return {
      name: pkg,
      version: latest,
      description: versionData.description || registry.description || '',
      license: versionData.license || registry.license || 'UNKNOWN',
      author: author || 'unknown',
      homepage: versionData.homepage || registry.homepage || `https://www.npmjs.com/package/${pkg}`,
      repository: repository || '',
      keywords: Array.isArray(versionData.keywords) ? versionData.keywords.slice(0, 8) : [],
      dependency_count: Object.keys(deps).length,
      weekly_downloads: weeklyDownloads,
    };
  },
};
