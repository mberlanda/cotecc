// CoteccApp/scripts/verify-embedded-bundle.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const DIST = path.join(__dirname, '..', 'dist-embedded');
const MANIFEST = path.join(DIST, 'embed-manifest.json');

if (!fs.existsSync(MANIFEST)) {
  console.error('FAIL: dist-embedded/embed-manifest.json missing — run npm run embed:web');
  process.exit(1);
}
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const recorded = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const files = walk(DIST)
  .filter(p => p !== MANIFEST)
  .map(p => ({path: path.relative(DIST, p).split(path.sep).join('/'), sha256: sha256(fs.readFileSync(p))}))
  .sort((a, b) => a.path.localeCompare(b.path));
const bundleHash = sha256(files.map(f => `${f.path}:${f.sha256}`).join('\n'));
if (bundleHash !== recorded.bundleHash) {
  const recMap = new Map(recorded.files.map(f => [f.path, f.sha256]));
  files.filter(f => recMap.get(f.path) !== f.sha256).forEach(f => console.error(`  changed/new: ${f.path}`));
  recorded.files.filter(f => !files.find(x => x.path === f.path)).forEach(f => console.error(`  removed: ${f.path}`));
  console.error(`FAIL: bundle hash mismatch (recorded ${recorded.bundleHash}, actual ${bundleHash})`);
  process.exit(1);
}
console.log('OK: embedded bundle matches manifest');
