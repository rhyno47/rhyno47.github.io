// Bulk ad injection utility
// - Adds Google Auto Ads script to <head> if missing
// - Adds non-intrusive bottom display ad slot if no <ins class="adsbygoogle"> exists
// - Adds ads.css link if missing
// - Adds /assets/ads.js at end of body if missing
// Skips files in backups/; processes others inclusively

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = 'ca-pub-1523965413574724';
const DISPLAY_SLOT = '2315208152'; // kept for reference; not directly injected anymore

const AUTO_ADS_SCRIPT = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}"\n     crossorigin="anonymous"></script>`;
const ADS_CSS_LINK = `<link rel="stylesheet" href="/assets/ads.css">`;
const ADS_JS_SCRIPT = `<script defer src="/assets/ads.js"></script>`;
// We no longer insert static ad <ins> blocks here; runtime script (assets/ads.js) injects one auto + one native.

function walk(dir){
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for(const e of entries){
    const p = path.join(dir, e.name);
    if(e.isDirectory()){
      // skip backups directory
      if(e.name.toLowerCase().includes('backup')) continue;
      files = files.concat(walk(p));
    } else if(e.isFile() && e.name.toLowerCase().endsWith('.html')){
      files.push(p);
    }
  }
  return files;
}

function ensureHead(html){
  // Add AUTO ADS in <head> if missing
  if(!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=/.test(html)){
    html = html.replace(/<head(\b[^>]*)>/i, (m)=>`${m}\n  ${AUTO_ADS_SCRIPT}`);
  }
  // Add ads.css if missing
  if(!/assets\/ads\.css/.test(html)){
    html = html.replace(/<head(\b[^>]*)>/i, (m)=>`${m}\n  ${ADS_CSS_LINK}`);
  }
  return html;
}

function ensureBodyTail(html){
  // Remove any existing manual <ins class="adsbygoogle"> to avoid duplicates; the runtime will add standardized ones
  html = html.replace(/<ins\s+class=["']adsbygoogle["'][\s\S]*?<\/ins>\s*/gi, '');
  // Add ads.js loader if missing
  if(!/\/assets\/ads\.js/.test(html)){
    html = html.replace(/<\/body>/i, `  ${ADS_JS_SCRIPT}\n</body>`);
  }
  return html;
}

function processFile(file){
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = ensureHead(html);
  html = ensureBodyTail(html);
  if(html !== before){
    fs.writeFileSync(file, html, 'utf8');
    return true;
  }
  return false;
}

function main(){
  const files = walk(ROOT);
  let changed = 0;
  for(const f of files){
    try{
      if(processFile(f)) changed++;
    } catch (e){
      console.error('Failed to process', f, e.message);
    }
  }
  console.log(`Processed ${files.length} HTML files. Modified ${changed}.`);
}

if(require.main === module){
  main();
}
