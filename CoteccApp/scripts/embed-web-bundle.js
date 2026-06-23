// CoteccApp/scripts/embed-web-bundle.js
const {execSync} = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Guard: Metro/expo-export output can differ across Node majors; the repo pins Node 22.
if (parseInt(process.versions.node, 10) < 22) {
  console.error(`requires Node >= 22 (see .nvmrc); running ${process.version}`);
  process.exit(1);
}

const DIST = path.join(__dirname, '..', 'dist-embedded');
const MANIFEST = path.join(DIST, 'embed-manifest.json');

const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

const buildManifest = () => {
  const files = walk(DIST)
    .filter(p => p !== MANIFEST) // never hash the manifest itself
    .map(p => ({path: path.relative(DIST, p).split(path.sep).join('/'), sha256: sha256(fs.readFileSync(p))}))
    .sort((a, b) => a.path.localeCompare(b.path));
  // bundleHash is OVER the files only — generatedAt is excluded so re-runs are stable.
  const bundleHash = sha256(files.map(f => `${f.path}:${f.sha256}`).join('\n'));
  return {files, bundleHash};
};

execSync('npx expo export --platform web --output-dir dist-embedded', {stdio: 'inherit', cwd: path.join(__dirname, '..')});
const {files, bundleHash} = buildManifest();
fs.writeFileSync(MANIFEST, JSON.stringify({generatedAt: new Date().toISOString(), bundleHash, files}, null, 2));
console.log(`embed-manifest.json written: ${files.length} files, bundleHash ${bundleHash}`);
