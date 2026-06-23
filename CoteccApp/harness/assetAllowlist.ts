// Shared static-serving policy for the embedded host (Node harness + native host).
// Maps extensions to MIME types, serves files ONLY under the export root, rejects
// path traversal, and falls back to index.html for SPA routes (e.g. /join, /game).
// Phase 1A §1.2 (FE-006), §4.1.
import * as fs from 'fs';
import * as path from 'path';

// Allowlisted extension -> MIME. Anything not here is served as octet-stream only
// if the file genuinely exists under the root (never inferred for fallbacks).
export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

export const mimeFor = (filePath: string): string =>
  MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';

export interface AssetResult {
  // 200 serve filePath; 403 traversal/forbidden; 404 not found; 400 bad request.
  status: 200 | 400 | 403 | 404;
  filePath?: string;
  mime?: string;
}

// Resolve a request URL path to a file under distRoot, with SPA fallback.
export const resolveAsset = (
  distRoot: string,
  rawUrlPath: string,
): AssetResult => {
  let urlPath: string;
  try {
    urlPath = decodeURIComponent(rawUrlPath.split('?')[0]);
  } catch {
    return {status: 400};
  }
  if (urlPath === '' || urlPath === '/') {
    urlPath = '/index.html';
  }

  const rootResolved = path.resolve(distRoot);
  const rel = urlPath.replace(/^\/+/, '');
  const resolved = path.resolve(rootResolved, rel);

  // Containment check: reject anything that escapes the export root.
  if (
    resolved !== rootResolved &&
    !resolved.startsWith(rootResolved + path.sep)
  ) {
    return {status: 403};
  }

  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    return {status: 200, filePath: resolved, mime: mimeFor(resolved)};
  }

  // SPA fallback: a route-like request (no asset extension, or an .html that does
  // not exist) is served the app shell so client routing can take over.
  const ext = path.extname(resolved).toLowerCase();
  if (ext === '' || ext === '.html') {
    const index = path.join(rootResolved, 'index.html');
    if (fs.existsSync(index)) {
      return {status: 200, filePath: index, mime: MIME['.html']};
    }
  }

  return {status: 404};
};
