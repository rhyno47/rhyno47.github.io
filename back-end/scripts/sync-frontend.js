// Copies selected frontend files from repo root to back-end/public so Render can serve the full site at the backend URL
// Usage: npm run sync-frontend
// You can run this locally or as part of a build step on Render (Build Command).

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEST = path.join(__dirname, '..', 'public');

// List of top-level files to copy (root files). If a file exists in destination, it will be overwritten.
const FILES = [
  'index.html',
  'findjobs.html',
  'createpost.html',
  'try-quiz.html',
  'webdevhome.html',
  'pyhome.html',
  'login.html',
  'register.html'
];

// List of folders to mirror recursively
const FOLDERS = [
  'assets',
  'images',
  'pages',
  'python',
  'public'
];

async function copyFile(src, dst){
  await fsp.mkdir(path.dirname(dst), { recursive: true });
  await fsp.copyFile(src, dst);
  console.log('copied', path.relative(ROOT, src), '->', path.relative(ROOT, dst));
}

async function copyDir(srcDir, dstDir){
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  await fsp.mkdir(dstDir, { recursive: true });
  for(const e of entries){
    const srcPath = path.join(srcDir, e.name);
    const dstPath = path.join(dstDir, e.name);
    if(e.isDirectory()){
      await copyDir(srcPath, dstPath);
    }else if(e.isFile()){
      await copyFile(srcPath, dstPath);
    }
  }
}

async function main(){
  // Clean dest except uploads folder
  try{
    const items = await fsp.readdir(DEST);
    for(const name of items){
      if(name === 'uploads') continue; // preserve runtime uploads
      await fsp.rm(path.join(DEST, name), { recursive: true, force: true });
    }
  }catch(_e){}

  // Copy folders
  for(const folder of FOLDERS){
    const src = path.join(ROOT, folder);
    try{
      const st = await fsp.stat(src);
      if(st.isDirectory()){
        await copyDir(src, path.join(DEST, folder));
      }
    }catch(e){
      // ignore missing
    }
  }

  // Copy root files (overwrite destination index.html so backend shows full site)
  for(const file of FILES){
    const src = path.join(ROOT, file);
    try{
      const st = await fsp.stat(src);
      if(st.isFile()){
        await copyFile(src, path.join(DEST, path.basename(file)));
      }
    }catch(e){
      // ignore missing
    }
  }

  // Ensure env.js exists in assets (frontend expects window.API_BASE)
  const envJs = path.join(DEST, 'assets', 'env.js');
  try{
    await fsp.access(envJs);
  }catch(_e){
    await fsp.mkdir(path.dirname(envJs), { recursive: true });
    const apiBase = process.env.API_BASE || '';
    await fsp.writeFile(envJs, `window.API_BASE = '${apiBase}';\n`);
    console.log('generated assets/env.js');
  }

  console.log('Frontend sync complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
