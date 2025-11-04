const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backupRoot = path.join(repoRoot, 'backups', 'ads_removal_backup_' + Date.now());
fs.mkdirSync(backupRoot, { recursive: true });

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      const base = path.basename(filePath);
      if (base === 'node_modules' || base === 'backups') return; // skip
      results = results.concat(walk(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function isHtmlOrAds(file) {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file).toLowerCase();
  return ext === '.html' || base === 'ads.txt';
}

function rel(p) { return path.relative(repoRoot, p).replace(/\\/g, '/'); }

function backupFile(absPath) {
  const relative = rel(absPath);
  const dest = path.join(backupRoot, relative + '.bak');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(absPath, dest);
}

function removeAdTagsFromHtml(content) {
  let out = content;

  out = out.replace(/<script[^>]*pagead2\.googlesyndication[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<script[^>]*custom-element="amp-auto-ads"[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<ins[^>]*class\s*=\s*"[^"]*adsbygoogle[^"]*"[\s\S]*?<\/ins>/gi, '');
  out = out.replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\([^\)]*\);?/gi, '');
  out = out.replace(/<amp-auto-ads[^>]*>\s*<\/amp-auto-ads>/gi, '');
  out = out.replace(/<amp-auto-ads[^>]*\/?\s*>/gi, '');
  out = out.replace(/\sdata-ad-client="[^"]*"/gi, '');
  out = out.replace(/^[ \t]*\n/gm, '');

  return out;
}

const allFiles = walk(repoRoot);
const targets = allFiles.filter(isHtmlOrAds);

const modified = [];
const deleted = [];
const skipped = [];

for (const abs of targets) {
  const relative = rel(abs);
  try {
    if (path.basename(abs).toLowerCase() === 'ads.txt') {
      backupFile(abs);
      fs.unlinkSync(abs);
      deleted.push(relative);
      console.log('Deleted', relative);
      continue;
    }
    const content = fs.readFileSync(abs, 'utf8');
    const newContent = removeAdTagsFromHtml(content);
    if (newContent !== content) {
      backupFile(abs);
      fs.writeFileSync(abs, newContent, 'utf8');
      modified.push(relative);
      console.log('Modified', relative);
    } else {
      skipped.push(relative);
    }
  } catch (err) {
    console.error('Error processing', relative, err.message);
  }
}

console.log('\nSummary:');
console.log('Backups saved to:', backupRoot);
console.log('Modified files:', modified.length);
modified.forEach(f => console.log('  -', f));
console.log('Deleted (ads.txt):', deleted.length);
deleted.forEach(f => console.log('  -', f));
console.log('Skipped (no changes):', skipped.length);
process.exit(0);
