/* Snippet gallery interactions: preview + copy + toast */
(function(){
  'use strict';

  const root = document;
  console.debug('[snippets] script loaded');

  function showToast(msg){
    try{
      const el = root.createElement('div');
      el.className = 'toast';
      el.setAttribute('role','status');
      el.setAttribute('aria-live','polite');
      el.textContent = msg;
      root.body.appendChild(el);
      setTimeout(()=>{ el.style.transition = 'opacity .3s ease'; el.style.opacity = '0'; }, 1200);
      setTimeout(()=> el.remove(), 1600);
    }catch(_){ }
  }

  function computeBase(){
    try {
      return new URL('.', location.href).href; // directory of current page
    } catch(e){ return '/'; }
  }

  function ensureBase(html){
    const baseHref = computeBase();
    if(/<base\s/i.test(html)) return html; // user provided base
    if(/<head[\s>]/i.test(html)){
      return html.replace(/<head(\s|>)/i, `<head><base href="${baseHref}">$1`);
    }
    // No head tag; wrap minimal document
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${baseHref}"></head><body>${html}</body></html>`;
  }

  async function handleCopy(btn){
    const card = btn.closest('.snippet-card');
    const ta = card && card.querySelector('textarea');
    const text = ta ? ta.value : '';
    try{
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
      showToast('Code copied to clipboard');
      setTimeout(()=> btn.textContent = 'Copy code', 1200);
    }catch(e){
      try{
        const hidden = root.createElement('textarea');
        hidden.style.position = 'fixed';
        hidden.style.left = '-9999px';
        hidden.value = text;
        root.body.appendChild(hidden);
        hidden.select();
        root.execCommand('copy');
        hidden.remove();
        btn.textContent = 'Copied!';
        showToast('Code copied');
        setTimeout(()=> btn.textContent = 'Copy code', 1200);
      }catch(err){
        const ok = prompt('Copy code:', text);
        if(ok !== null){ btn.textContent = 'Copied!'; showToast('Code copied'); setTimeout(()=> btn.textContent = 'Copy code', 1200); }
      }
    }
  }

  function handlePreview(btn){
    const card = btn.closest('.snippet-card');
    const iframe = card && card.querySelector('iframe');
    const ta = card && card.querySelector('textarea');
    if(!iframe || !ta) return;
    let html = (ta.value || '').trim();
    if(!html){
      html = '<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui;padding:16px;margin:0;background:#fff;color:#222}</style><p>No code to preview yet. Paste or type HTML and click Preview.</p>';
    } else {
      html = ensureBase(html);
    }

    // Prefer srcdoc where available
    try { iframe.removeAttribute('src'); iframe.srcdoc = html; } catch(e) {}

    // Blob fallback to ensure rendering in all browsers
    try{
      const blob = new Blob([html], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      iframe.src = url;
      setTimeout(()=> URL.revokeObjectURL(url), 5000);
    }catch(_){}
  }

  function handleOpen(btn){
    const card = btn.closest('.snippet-card');
    const ta = card && card.querySelector('textarea');
    if(!ta) return;
    let html = (ta.value || '').trim();
    if(!html){ html = '<!doctype html><meta charset="utf-8"><p>No code found.</p>'; }
    html = ensureBase(html);
    try{
      const blob = new Blob([html], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(()=> URL.revokeObjectURL(url), 8000);
    }catch(e){
      // Fallback: data URL
      try{
        const data = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        window.open(data, '_blank', 'noopener');
      }catch(_){}
    }
  }

  // Event delegation
  root.addEventListener('click', (e)=>{
    const t = e.target;
    if(!(t instanceof HTMLElement)) return;
    // bubble up to button if inner element clicked
    const btn = t.closest('button');
    const target = btn || t;
    if(!(target instanceof HTMLElement)) return;
    
    if(target.classList.contains('btn-preview')){ e.preventDefault(); console.debug('[snippets] preview click'); handlePreview(target); }
    else if(target.classList.contains('btn-copy')){ e.preventDefault(); console.debug('[snippets] copy click'); handleCopy(target); }
    else if(target.classList.contains('btn-open')){ e.preventDefault(); console.debug('[snippets] open click'); handleOpen(target); }
  });

  // Expose for inline onclick compatibility
  window.previewSnippet = handlePreview;
  window.copySnippet = handleCopy;
  window.openSnippet = handleOpen;
})();
