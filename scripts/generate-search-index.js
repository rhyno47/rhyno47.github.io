const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'assets', 'search-index.json');

function isIgnored(dir) {
  const ign = ['backups', 'back-end', 'node_modules', '.git'];
  return ign.some(i => dir.includes(path.sep + i + path.sep) || dir.endsWith(path.sep + i));
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list) {
    const full = path.join(dir, ent.name);
    if (isIgnored(full)) continue;
    if (ent.isDirectory()) {
      results = results.concat(walk(full));
    } else if (ent.isFile() && ent.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function extract(html) {
  // naive extraction, OK for static index
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  const hMatches = Array.from(html.matchAll(/<(h1|h2|h3)[^>]*>(.*?)<\/(?:h1|h2|h3)>/gi)).map(m => m[2].replace(/<[^>]+>/g,'').trim());
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const snippet = pMatch ? pMatch[1].replace(/<[^>]+>/g,'').trim().slice(0,160) : '';
  return { title, headings: hMatches, snippet };
}

(function main(){
  console.log('Scanning HTML files...');
  const files = walk(root);
  const index = files.map(f => {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    const html = fs.readFileSync(f, 'utf8');
    const info = extract(html);
    return { path: rel, title: info.title || path.basename(f), headings: info.headings, snippet: info.snippet };
  }).filter(Boolean);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), 'utf8');
  console.log('Wrote', outPath, 'with', index.length, 'entries');
})();
