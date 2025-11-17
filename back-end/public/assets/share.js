// Global unified share button injector
(function(){
  const CARD_SELECTOR = '.card, .card-feed, .lesson-card, .info-card, .code-card, .pdf-card, .resource-card, .notice, .warning, .info-callout, .try-card';
  const SHARE_IMG = '/images/share logo.jpg';

  function ensureId(el, idx){
    if(!el) return '';
    if(el.id) return el.id;
    const gen = 'card-' + (idx != null ? idx+1 : Math.floor(Math.random()*1e6));
    el.id = gen;
    return gen;
  }

  function computeShareUrl(card){
    const base = window.location.origin + window.location.pathname;
    const postId = card && (card.dataset.postId || card.getAttribute('data-post-id'));
    if(postId) return base + '?post=' + encodeURIComponent(postId);
    const id = ensureId(card);
    return base + '#' + encodeURIComponent(id);
  }

  function buildShareRow(card){
    const row = document.createElement('div');
    row.className = 'inline-share-actions';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn share-btn';
    btn.innerHTML = `<img src="${SHARE_IMG}" alt="Share" class="share-icon" onerror="this.style.display='none'"/><span class="share-label">Share</span>`;
    row.appendChild(btn);
    card.appendChild(row);
    return btn;
  }

  function injectButtons(){
    const cards = Array.from(document.querySelectorAll(CARD_SELECTOR))
      // allow per-card opt-out via attribute or class
      .filter(card => !(card.hasAttribute('data-no-share') || card.classList.contains('no-share')));
    cards.forEach((card, idx) => {
      // If card already contains a share button, just ensure it has proper class
      const existing = card.querySelector('.share-btn, .icon-btn .share-icon');
      if(existing){
        const btn = existing.closest('.share-btn') || existing.closest('.icon-btn');
        if(btn && !btn.classList.contains('share-btn')) btn.classList.add('share-btn');
        ensureId(card, idx);
        return;
      }
      // Skip if already has an inline row
      if(card.querySelector('.inline-share-actions')) return;
      ensureId(card, idx);
      buildShareRow(card);
    });
  }

  function showLinkInline(card, url){
    let panel = card.querySelector('.shared-link-display');
    if(!panel){
      panel = document.createElement('div');
      panel.className = 'shared-link-display';
      panel.innerHTML = `<input type="text" readonly value="${url}" aria-label="Shareable link" /><button type="button" class="copy-link-btn">Copy</button>`;
      card.appendChild(panel);
      const copyBtn = panel.querySelector('.copy-link-btn');
      const input = panel.querySelector('input');
      copyBtn.addEventListener('click', ()=>{
        input.select();
        const done = ()=>{ copyBtn.textContent='Copied!'; setTimeout(()=>copyBtn.textContent='Copy',1400); };
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(input.value).then(done).catch(()=>fallbackCopy(input.value, done));
        } else fallbackCopy(input.value, done);
      });
    } else {
      const input = panel.querySelector('input'); if(input) input.value = url;
    }
  }

  function fallbackCopy(text, done){
    try{ const ta = document.createElement('textarea'); ta.value = text; ta.style.position='absolute'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }catch(e){}
    done && done();
  }

  function handleShare(btn){
    const card = btn.closest(CARD_SELECTOR.split(',').join(',')) || btn.closest('[id]');
    const heading = card ? card.querySelector('h1,h2,h3,h4') : null;
    const title = heading ? heading.textContent.trim() : (document.title || 'Share');
    const url = computeShareUrl(card);
    const labelEl = btn.querySelector('.share-label');

    function afterCopy(status){
      if(labelEl){ labelEl.textContent = status; setTimeout(()=>{ labelEl.textContent='Share'; }, 1400); }
      showLinkInline(card, url);
      try{ document.dispatchEvent(new Event('post:share')); }catch(_e){}
    }

    if(navigator.share){
      navigator.share({ title, text: 'Check this out on Coding with Tawfiq', url })
        .then(()=> afterCopy('Shared'))
        .catch(()=>{
          if(navigator.clipboard && navigator.clipboard.writeText){
            navigator.clipboard.writeText(url).finally(()=> afterCopy('Copied!'));
          } else { fallbackCopy(url, ()=> afterCopy('Copied!')); }
        });
    } else {
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).finally(()=> afterCopy('Copied!'));
      } else { fallbackCopy(url, ()=> afterCopy('Copied!')); }
    }
  }

  // Delegated click handling
  document.addEventListener('click', e => {
    const btn = e.target.closest('.share-btn');
    if(!btn) return;
    const card = btn.closest('.card-feed');
    // Let findjobs' native handler run on feed cards to avoid double sharing
    if(card) return;
    e.preventDefault();
    handleShare(btn);
  });

  document.addEventListener('DOMContentLoaded', injectButtons);
})();
