#!/usr/bin/env node
/*
 * Build the real application CSS for research mocks from the repository sources.
 *
 * Usage (from the repository root):
 *   node .opencode/skills/design-research/assets/build-app-css.mjs --app admin \
 *     [--component frontend/lib/ui/design-system/panel/panel.component.ts ...]
 *
 * What it does, without touching frontend/ or the repo root:
 *   1. Reads frontend/angular.json for the app: global styles, includePaths, assets mapping.
 *   2. Installs sass and every package the styles import into .opencode/features/_app-css/<app>/node_modules,
 *      at the exact versions from frontend/package-lock.json, then the root package-lock.json.
 *   3. Compiles the global SCSS entry, inlines plain .css @imports (Sass leaves them as-is),
 *      drops @tailwind directives (Helios 2.0, scoped to .uc-base), rewrites url(/frontend/<app>/assets/...)
 *      to relative paths into the repository so the CSS works from file://.
 *   4. Compiles Angular component styles (styleUrls) given with --component, replacing :host with the
 *      component selector and removing ::ng-deep, into components.css.
 *   5. Writes <app>.css, components.css, README.md into the output folder and prints a short report.
 *
 * The GitHub Packages token is read from GITHUB_PACKAGE_TOKEN or from ~/.npmrc and passed only to npm.
 * It is never printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
function opt(name, def) { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; }
function opts(name) { const r = []; args.forEach((a, i) => { if (a === '--' + name) r.push(args[i + 1]); }); return r; }

const APP = opt('app', 'admin');
let REPO = path.resolve(opt('repo', process.cwd()));
while (!fs.existsSync(path.join(REPO, 'frontend', 'angular.json'))) {
  const up = path.dirname(REPO);
  if (up === REPO) fail('frontend/angular.json not found; run from the repository root or pass --repo');
  REPO = up;
}
const FE = path.join(REPO, 'frontend');
const OUT = path.resolve(opt('out', path.join(REPO, '.opencode', 'features', '_app-css', APP)));
const NM = path.join(OUT, 'node_modules');
const COMPONENTS = opts('component');

function fail(msg) { console.error('build-app-css: ' + msg); process.exit(1); }
function log(msg) { console.log(msg); }

/* ---------- npm with token, never printed ---------- */
const env = { ...process.env, npm_config_update_notifier: 'false' };
if (!env.GITHUB_PACKAGE_TOKEN) {
  try {
    const rc = fs.readFileSync(path.join(os.homedir(), '.npmrc'), 'utf8');
    const m = rc.match(/^\/\/npm\.pkg\.github\.com\/:_authToken=(.+)$/m);
    if (m && !m[1].startsWith('${')) env.GITHUB_PACKAGE_TOKEN = m[1].trim();
  } catch (e) { /* no ~/.npmrc */ }
}

fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(OUT, 'package.json'))) {
  fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({ name: 'app-css-' + APP, private: true }, null, 2));
}
fs.writeFileSync(path.join(OUT, '.npmrc'),
  '@lightspeed:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGE_TOKEN}\n');

const locks = [path.join(FE, 'package-lock.json'), path.join(REPO, 'package-lock.json')]
  .filter(f => fs.existsSync(f)).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
function lockVersion(name) {
  for (const l of locks) {
    const p = (l.packages || {})['node_modules/' + name] || (l.dependencies || {})[name];
    if (p && p.version) return p.version;
  }
  return null;
}
function pkgName(spec) {
  const s = spec.replace(/^~/, '');
  const parts = s.split('/');
  return s.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}
const installed = new Set();
function install(names) {
  const specs = [];
  for (const n of names) {
    if (installed.has(n)) continue;
    const v = lockVersion(n);
    if (!v) fail('no version for "' + n + '" in frontend/package-lock.json or package-lock.json');
    const pj = path.join(NM, n, 'package.json');
    if (fs.existsSync(pj) && JSON.parse(fs.readFileSync(pj, 'utf8')).version === v) { installed.add(n); continue; }
    specs.push(n + '@' + v);
  }
  if (!specs.length) return;
  log('install: ' + specs.join(' '));
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--legacy-peer-deps', '--save-exact', ...specs],
    { cwd: OUT, env, encoding: 'utf8' });
  if (r.status !== 0) {
    const err = (r.stderr || '').split('\n').filter(l => /ERR/.test(l)).slice(0, 6).join('\n');
    if (/E401|E403/.test(err)) fail('no access to GitHub Packages (E401/E403). See references/ds-setup.md, token section.\n' + err);
    fail('npm install failed:\n' + err);
  }
  names.forEach(n => installed.add(n));
}

/* ---------- angular.json ---------- */
const ng = JSON.parse(fs.readFileSync(path.join(FE, 'angular.json'), 'utf8'));
const proj = ng.projects[APP];
if (!proj) fail('no project "' + APP + '" in angular.json');
const bo = proj.architect.build.options;
const loadPaths = ((bo.stylePreprocessorOptions || {}).includePaths || [])
  .map(p => /node_modules/.test(p) ? NM : path.join(FE, p))
  .concat([NM]);
const assetMap = (bo.assets || []).map(a => typeof a === 'string'
  ? { prefix: 'assets/', dir: path.join(FE, a) }
  : { prefix: (a.output || '').replace(/^\/+/, '').replace(/\/?$/, '/'), dir: path.join(FE, a.input) });

install(['sass']);
const SASS = path.join(NM, '.bin', 'sass');

function compile(file) {
  for (let i = 0; i < 40; i++) {
    const r = spawnSync(SASS, ['--no-source-map', '--quiet', ...loadPaths.map(p => '--load-path=' + p), file],
      { cwd: FE, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status === 0) return r.stdout.replace(/\/\*(?!!)[\s\S]*?\*\/\n?/g, '');
    const m = /Can't find stylesheet to import/.test(r.stderr) &&
      r.stderr.split('\n').filter(l => l.includes('│')).join('\n').match(/@(?:import|use|forward)\s+["']~?([^"']+)["']/);
    if (!m) fail('sass error in ' + path.relative(REPO, file) + ':\n' + r.stderr.split('\n').slice(0, 12).join('\n'));
    install([pkgName(m[1])]);
  }
  fail('too many missing imports in ' + file);
}

/* ---------- post-processing ---------- */
function rel(abs) { return path.relative(OUT, abs).split(path.sep).join('/'); }
const unresolved = new Set();

function rewriteAppUrls(css) {
  return css.replace(/url\((["']?)\/[^)"']*?\/(assets\/[^)"'?#]+)([^)"']*)\1\)/g, (all, q, asset, suffix) => {
    for (const a of assetMap) {
      if (!asset.startsWith(a.prefix)) continue;
      const f = path.join(a.dir, asset.slice(a.prefix.length));
      if (fs.existsSync(f)) return 'url(' + q + rel(f) + suffix + q + ')';
    }
    unresolved.add(asset);
    return all;
  });
}
function rewriteRelativeUrls(css, fromDir) {
  return css.replace(/url\((["']?)(?!data:|https?:|\/|#)([^)"'?#]+)([^)"']*)\1\)/g,
    (all, q, p, suffix) => 'url(' + q + rel(path.resolve(fromDir, p)) + suffix + q + ')');
}
const remote = [];
const inlined = [];
function inlineImports(css, seen = new Set()) {
  return css.replace(/^\s*@import\s+(?:url\()?["']([^"']+)["']\)?\s*;?\s*$/gm, (all, spec) => {
    if (/^https?:/.test(spec)) { if (!remote.includes(spec)) remote.push(spec); return ''; }
    const s = spec.replace(/^~/, '');
    let f = path.join(NM, s);
    if (!fs.existsSync(f)) { install([pkgName(s)]); }
    if (!fs.existsSync(f)) { unresolved.add(spec); return all; }
    if (seen.has(f)) return '';
    seen.add(f);
    inlined.push(s);
    const body = rewriteRelativeUrls(fs.readFileSync(f, 'utf8'), path.dirname(f));
    return '/* inlined: ' + s + ' */\n' + inlineImports(body, seen) + '\n';
  });
}
function finish(css) {
  css = css.replace(/^\s*@tailwind[^;]*;\s*$/gm, '');
  css = inlineImports(css);
  css = rewriteAppUrls(css);
  return css;
}

/* ---------- global styles ---------- */
let global = '';
/* Stylesheets linked from the app index.html (fonts, icon fonts) are part of the shipped CSS too. */
const indexFile = bo.index && path.join(FE, typeof bo.index === 'string' ? bo.index : bo.index.input);
if (indexFile && fs.existsSync(indexFile)) {
  const ih = fs.readFileSync(indexFile, 'utf8');
  for (const tag of ih.match(/<link\b[^>]*>/g) || []) {
    if (!/stylesheet/.test(tag)) continue;
    const href = (tag.match(/href="([^"]+)"/) || [])[1];
    if (!href) continue;
    if (/^https?:/.test(href)) { if (!remote.includes(href)) remote.push(href.replace(/&amp;/g, '&')); continue; }
    const asset = href.replace(/^\/+/, '');
    const hit = assetMap.map(a => asset.startsWith(a.prefix) && path.join(a.dir, asset.slice(a.prefix.length))).find(f => f && fs.existsSync(f));
    if (!hit) { unresolved.add(href); continue; }
    inlined.push('index.html:' + href);
    global += '/* index.html: ' + href + ' */\n' + rewriteRelativeUrls(fs.readFileSync(hit, 'utf8'), path.dirname(hit)) + '\n';
  }
}
for (const entry of bo.styles || []) {
  const input = typeof entry === 'string' ? entry : entry.input;
  if (/^node_modules\//.test(input)) {
    const spec = input.replace(/^node_modules\//, '');
    install([pkgName(spec)]);
    const f = path.join(NM, spec);
    global += '/* entry: ' + spec + ' */\n' + rewriteRelativeUrls(fs.readFileSync(f, 'utf8'), path.dirname(f)) + '\n';
  } else if (/\.s[ac]ss$/.test(input)) {
    log('compile: frontend/' + input);
    global += compile(path.join(FE, input)) + '\n';
  } else {
    global += fs.readFileSync(path.join(FE, input), 'utf8') + '\n';
  }
}
global = finish(global);
global = remote.map(u => '@import url("' + u + '");').join('\n') + '\n' + global;
fs.writeFileSync(path.join(OUT, APP + '.css'), global);

/* ---------- component styles ---------- */
const compDone = [];
if (COMPONENTS.length) {
  let out = '';
  for (const c of COMPONENTS) {
    const ts = path.resolve(REPO, c);
    const src = fs.readFileSync(ts, 'utf8');
    const sel = (src.match(/selector:\s*['"`]([^'"`]+)['"`]/) || [])[1];
    const urls = ((src.match(/styleUrls:\s*\[([^\]]*)\]/) || [])[1] || '').match(/['"`]([^'"`]+)['"`]/g) || [];
    if (!sel) fail('no selector in ' + c);
    for (const u of urls) {
      const scss = path.resolve(path.dirname(ts), u.slice(1, -1));
      let css = compile(scss);
      css = css.replace(/:host-context\(([^)]+)\)/g, '$1 ' + sel)
        .replace(/:host\(([^)]+)\)/g, sel + '$1')
        .replace(/:host/g, sel)
        .replace(/::ng-deep\s*/g, '');
      out += '/* component: ' + sel + ' (' + path.relative(REPO, scss) + ') */\n' + finish(css) + '\n';
      compDone.push(sel);
    }
  }
  fs.writeFileSync(path.join(OUT, 'components.css'), out);
}

/* ---------- report ---------- */
const size = fs.statSync(path.join(OUT, APP + '.css')).size;
const checks = ['.fl-button', '[layout=row]', '.alert-success'].map(s => s + ':' + (global.includes(s) ? 'ok' : 'MISSING'));
const readme = [
  '# App CSS: ' + APP,
  '',
  'Built ' + new Date().toISOString().slice(0, 10) + ' by `.opencode/skills/design-research/assets/build-app-css.mjs` from `frontend/angular.json` (project `' + APP + '`).',
  'Packages: exact versions from `frontend/package-lock.json` / `package-lock.json`, installed here only.',
  '',
  '- `' + APP + '.css` - global styles, ' + Math.round(size / 1024) + ' KB. Inlined CSS imports: ' + (inlined.join(', ') || 'none') + '.',
  '- Remote imports kept: ' + (remote.join(', ') || 'none') + '.',
  '- `components.css` - Angular component styles (:host replaced by selector): ' + (compDone.join(', ') || 'none') + '.',
  '- Not built: Tailwind layer (Helios 2.0, scoped to `.uc-base`).',
  '- Unresolved: ' + ([...unresolved].join(', ') || 'none') + '.',
  '',
  'Link from `.opencode/features/<feature>/mock/index.html`:',
  '',
  '```html',
  '<link rel="stylesheet" href="../../_app-css/' + APP + '/' + APP + '.css">',
  COMPONENTS.length ? '<link rel="stylesheet" href="../../_app-css/' + APP + '/components.css">' : null,
  '```',
  '',
  'Repository assets from a mock: `../../../../frontend/<path>` (for example `../../../../frontend/lib/ui/assets/images/vendor/google.svg`).',
  ''
].filter(l => l !== null).join('\n') + '\n';
fs.writeFileSync(path.join(OUT, 'README.md'), readme);

log('out: ' + path.relative(REPO, OUT));
log(APP + '.css: ' + Math.round(size / 1024) + ' KB; checks ' + checks.join(' '));
log('inlined: ' + inlined.length + '; remote: ' + remote.length + '; components: ' + compDone.length + '; unresolved: ' + unresolved.size);
if (unresolved.size) log('unresolved: ' + [...unresolved].slice(0, 10).join(', '));
