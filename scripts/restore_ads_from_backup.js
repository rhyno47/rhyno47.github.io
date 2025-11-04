const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backupRoot = path.join(repoRoot, 'backups', 'ads_removal_backup_1762249156198'); // use the existing backup folder

if (!fs.existsSync(backupRoot)) {
  console.error('Backup folder not found:', backupRoot);
  process.exit(1);
}

const targets = [
  'index.html',
  'pyhome.html',
  'databasehome.html',
  'webdevhome.html'
];

// include all files in python/ directory
const pythonDir = path.join(repoRoot, 'python');
if (fs.existsSync(pythonDir)) {
  const files = fs.readdirSync(pythonDir).filter(f => f.toLowerCase().endsWith('.html'));
  files.forEach(f => targets.push(path.posix.join('python', f)));
}

// helper to read backup file path
function backupPathFor(rel) {
  return path.join(backupRoot, rel + '.bak');
}

function extractAdBlocks(content) {
  let adParts = [];
  // pagead2 googlesyndication scripts
  const scripts = content.match(/<script[^>]*pagead2\.googlesyndication[^>]*>[\s\S]*?<\/script>/gi);
  if (scripts) adParts.push(...scripts);
  // amp-auto-ads block
  const amp = content.match(/<amp-auto-ads[\s\S]*?<\/amp-auto-ads>/gi);
  if (amp) adParts.push(...amp);
  // ins adsbygoogle
  const ins = content.match(/<ins[^>]*class\s*=\s*\"[^\"]*adsbygoogle[^\"]*\"[\s\S]*?<\/ins>/gi);
  if (ins) adParts.push(...ins);
  // (adsbygoogle = ...).push(...) lines
  const pushes = content.match(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\([^\)]*\);?/gi);
  if (pushes) adParts.push(...pushes);

  // any script tags that reference googlesyndication or ad-client
  const moreScripts = content.match(/<script[^>]*src=[^>]*googlesyndication[^>]*><\/script>/gi);
  if (moreScripts) adParts.push(...moreScripts);

  return adParts.join('\n');
}

function insertAdContainerIntoFile(relPath, adHtml) {
  const abs = path.join(repoRoot, relPath);
  if (!fs.existsSync(abs)) {
    console.warn('Target file not found, skipping:', relPath);
    return false;
  }
  const content = fs.readFileSync(abs, 'utf8');

  // prepare wrapper: we will put data-ad-scripts attr with escaped HTML to lazy load
  const safeAdHtml = adHtml.replace(/"/g, '&quot;').replace(/\n/g, '');
  const wrapper = `\n<!-- non-intrusive ad inserted by restore script -->\n<div class="non-intrusive-ad" aria-hidden="true">\n  <div class="ad-content" data-ad-scripts="${safeAdHtml}"></div>\n</div>\n`;

  // Add link to assets/ads.css and script to public/ads-manager.js (if not present)
  let newContent = content;
  if (!/assets\/ads\.css/.test(newContent)) {
    // insert link before closing </head>
    newContent = newContent.replace(/<\/head>/i, `  <link rel="stylesheet" href="assets/ads.css">\n</head>`);
  }
  if (!/ads-manager\.js/.test(newContent)) {
    // insert script before closing </body>
    newContent = newContent.replace(/<\/body>/i, `  <script src="public/ads-manager.js"></script>\n</body>`);
  }

  // Insert wrapper before closing </body>
  newContent = newContent.replace(/<\/body>/i, wrapper + '</body>');

  // backup current file
  const bakDir = path.join(repoRoot, 'backups', 'ads_restore_backup_' + Date.now());
  fs.mkdirSync(bakDir, { recursive: true });
  const bakPath = path.join(bakDir, relPath + '.bak');
  fs.mkdirSync(path.dirname(bakPath), { recursive: true });
  fs.copyFileSync(abs, bakPath);

  // write file
  fs.writeFileSync(abs, newContent, 'utf8');
  console.log('Inserted ad container into', relPath, 'backup saved to', bakPath);
  return true;
}

// Run restore
const modified = [];
for (const rel of targets) {
  const bpath = backupPathFor(rel);
  if (!fs.existsSync(bpath)) {
    console.warn('Backup missing for', rel, '- skipping');
    continue;
  }
  const backupContent = fs.readFileSync(bpath, 'utf8');
  const adHtml = extractAdBlocks(backupContent);
  if (!adHtml || adHtml.trim() === '') {
    console.warn('No ad HTML found in backup for', rel);
    continue;
  }
  const ok = insertAdContainerIntoFile(rel, adHtml);
  if (ok) modified.push(rel);
}

console.log('\nRestore finished. Modified files:', modified.length);
modified.forEach(f => console.log('-', f));

process.exit(0);
