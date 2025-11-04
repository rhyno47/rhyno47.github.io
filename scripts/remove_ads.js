const fs = require('fs');
const path = require('path');
const glob = require('glob');

const repoRoot = path.resolve(__dirname, '..');
const backupRoot = path.join(repoRoot, 'backups', 'ads_removal_backup_' + Date.now());
fs.mkdirSync(backupRoot, { recursive: true });

const htmlFiles = glob.sync('**/*.html', { cwd: repoRoot, nodir: true, ignore: ['node_modules/**', 'backups/**'] });
const adsTxtFiles = glob.sync('**/ads.txt', { cwd: repoRoot, nodir: true, ignore: ['node_modules/**', 'backups/**'] });

const filesToProcess = [...new Set([...htmlFiles, ...adsTxtFiles])];

const results = { modified: [], skipped: [], deleted: [] };

function backupFile(relPath) {
  const src = path.join(repoRoot, relPath);
  const dest = path.join(backupRoot, relPath + '.bak');
  const destDir = path.dirname(dest);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

function removeAdTagsFromHtml(content) {
  let out = content;

  // Remove Google AdSense script tags that load pagead2.googlesyndication
  out = out.replace(/<script[^>]*pagead2\.googlesyndication[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove any <script ... custom-element="amp-auto-ads" ...> tags
  out = out.replace(/<script[^>]*custom-element="amp-auto-ads"[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove <ins class="adsbygoogle" ...>...</ins> blocks
  out = out.replace(/<ins[^>]*class\s*=\s*"[^"]*adsbygoogle[^"]*"[\s\S]*?<\/ins>/gi, '');

  // Remove (adsbygoogle = window.adsbygoogle || []).push(...); lines
  out = out.replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\([^\)]*\);?/gi, '');

  // Remove <amp-auto-ads ...> tags (self-closing or not)
  out = out.replace(/<amp-auto-ads[^>]*>\s*<\/amp-auto-ads>/gi, '');
  out = out.replace(/<amp-auto-ads[^>]*\/?\s*>/gi, '');

  // Remove attributes like data-ad-client on tags
  out = out.replace(/\sdata-ad-client="[^"]*"/gi, '');

  // Remove empty lines left by removals
  out = out.replace(/^[ \t]*\n/gm, '');

  return out;
}

filesToProcess.forEach(relPath => {
  const absPath = path.join(repoRoot, relPath);
  try {
    if (path.basename(relPath).toLowerCase() === 'ads.txt') {
      // Backup then delete ads.txt
      backupFile(relPath);
      fs.unlinkSync(absPath);
      results.deleted.push(relPath);
      console.log('Deleted', relPath);
      return;
    }

    const content = fs.readFileSync(absPath, 'utf8');
    const newContent = removeAdTagsFromHtml(content);

    if (newContent !== content) {
      backupFile(relPath);
      fs.writeFileSync(absPath, newContent, 'utf8');
      results.modified.push(relPath);
      console.log('Modified', relPath);
    } else {
      results.skipped.push(relPath);
    }
  } catch (err) {
    console.error('Error processing', relPath, err.message);
  }
});

console.log('\nSummary:');
console.log('Backups saved to:', backupRoot);
console.log('Modified files:', results.modified.length);
results.modified.forEach(f => console.log('  -', f));
console.log('Deleted (ads.txt):', results.deleted.length);
results.deleted.forEach(f => console.log('  -', f));
console.log('Skipped (no changes):', results.skipped.length);

// Exit with 0
process.exit(0);
