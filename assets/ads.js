/* Central AdSense helper
 * Responsibilities:
 * 1. Ensure the Google AdSense script (auto ads) is loaded (added in <head> by pages).
 * 2. Initialize any <ins class="adsbygoogle"> slots that have not yet been pushed.
 * 3. Provide a lightweight API for future dynamic ad insertion.
 *
 * Usage: include with <script defer src="/assets/ads.js"></script> near end of body.
 * Optional: window.AdHelper.init(); to force re-scan after dynamically adding ad slots.
 */
(function(){
  const CLIENT_ID = 'ca-pub-1523965413574724';
  const AUTO_AD_SLOT = '2315208152'; // reuse an existing fluid/auto slot id
  const NATIVE_AD_SLOT = '1588668042'; // existing native/auto slot id from index
  const ONE_AD_ONLY = true; // enforce a single ad per page view
  const INFEED_SLOT = '4582278842';
  const INFEED_LAYOUT_KEY = '-fg+5w+4i-d0+6y';
  function loadScriptIfMissing(){
    if(!document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')){
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
      s.setAttribute('crossorigin','anonymous');
      document.head.appendChild(s);
    }
  }
  // Initialize non-lazy slots immediately; lazy ones are handled via IntersectionObserver
  function initSlots(){
    if(!window.adsbygoogle){ window.adsbygoogle = []; }
    const slots = document.querySelectorAll('ins.adsbygoogle:not([data-init]):not([data-lazy])');
    slots.forEach(slot => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        slot.setAttribute('data-init','1');
        const wrap = slot.closest('.ad-slot'); if(wrap) wrap.setAttribute('data-init','1');
      } catch(e){ console.debug('Ad init error', e); }
    });
  }

  // Frequency cap: allow only one fluid mid-content ad per page view (session)
  function canShowFluidOnce(){
    try{
      const key = 'fluid-shown:' + location.pathname;
      if(sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
      return true;
    }catch(_e){ return true; }
  }

  function lazyInit(){
    if(!('IntersectionObserver' in window)){
      // Fallback: if no IO, initialize lazy slots but still honor frequency cap
      const cap = canShowFluidOnce();
      document.querySelectorAll('ins.adsbygoogle[data-lazy]:not([data-init])').forEach(slot=>{
        if(!cap && slot.dataset.adFormat === 'fluid') return;
        try{ (window.adsbygoogle = window.adsbygoogle || []).push({}); slot.setAttribute('data-init','1'); }catch(e){ }
      });
      return;
    }
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        const slot = entry.target;
        if(slot.getAttribute('data-init')){ obs.unobserve(slot); return; }
        // Frequency cap for fluid ads
        if((slot.getAttribute('data-ad-format')||'').toLowerCase()==='fluid'){
          if(!canShowFluidOnce()){ obs.unobserve(slot); return; }
        }
        try{
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          slot.setAttribute('data-init','1');
          const wrap = slot.closest('.ad-slot, .ad-mid'); if(wrap) wrap.setAttribute('data-init','1');
        }catch(e){ /* swallow */ }
        obs.unobserve(slot);
      });
    }, { rootMargin: '120px 0px' });
    document.querySelectorAll('ins.adsbygoogle[data-lazy]:not([data-init])').forEach(el=> obs.observe(el));
  }
  function init(){
    loadScriptIfMissing();
    // Delay slot init slightly to allow script load if it was missing.
  const onLoad = ()=>{ setTimeout(()=>{ ensureOneAutoAndNative(); insertInFeedAdIfNoticePage(); pruneExtraAds(); initSlots(); lazyInit(); attachAuthAndPostListeners(); }, 150); };
    if(document.readyState === 'complete') onLoad(); else window.addEventListener('load', onLoad);
  }
  window.AdHelper = { init, initSlots, lazyInit, action: showActionAd };
  // Auto-init.
  init();

  // Ensure a single ad per page (auto by default). If ONE_AD_ONLY=false, also add native.
  function ensureOneAutoAndNative(){
    try{
      const hasAuto = !!document.querySelector('ins.adsbygoogle[data-auto-ad="1"]');
      const hasNative = !!document.querySelector('ins.adsbygoogle[data-native-ad="1"]');
      const container = pickAdContainer();
      if(!hasAuto){
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.setAttribute('data-ad-client', CLIENT_ID);
        ins.setAttribute('data-ad-slot', AUTO_AD_SLOT);
        ins.setAttribute('data-ad-format', 'auto');
        ins.setAttribute('data-full-width-responsive', 'true');
        ins.setAttribute('data-auto-ad','1');
        container.appendChild(wrapInSlot(ins));
      }
      if(!ONE_AD_ONLY && !hasNative){
        const ins2 = document.createElement('ins');
        ins2.className = 'adsbygoogle';
        ins2.style.display = 'block';
        ins2.setAttribute('data-ad-client', CLIENT_ID);
        ins2.setAttribute('data-ad-slot', NATIVE_AD_SLOT);
        ins2.setAttribute('data-ad-format', 'auto');
        ins2.setAttribute('data-full-width-responsive', 'true');
        ins2.setAttribute('data-native-ad','1');
        container.appendChild(wrapInSlot(ins2));
      }
    }catch(_e){ /* ignore */ }
  }

  // Remove any additional <ins.adsbygoogle> beyond the single auto + single native requirement.
  function pruneExtraAds(){
    const all = Array.from(document.querySelectorAll('ins.adsbygoogle'))
      .filter(el => !el.closest('#interaction-ad-box')); // don't touch floating action ad
    const hasNotice = !!document.querySelector('.notice, .warning, .info-callout');
    // Determine keep set
    const auto = document.querySelector('ins.adsbygoogle[data-auto-ad="1"]');
    const infeed = document.querySelector('ins.adsbygoogle[data-infeed-ad="1"]');
    let keep = new Set();
    if(hasNotice && infeed){
      // On notice pages, keep in-feed; also keep one auto ad if present
      if(auto) keep.add(auto);
      keep.add(infeed);
    } else {
      // Default: keep only one auto ad
      if(auto) keep.add(auto);
      else if(all.length){ keep.add(all[0]); all[0].setAttribute('data-auto-ad','1'); }
    }
    all.forEach(el=>{
      if(keep.has(el)) return;
      const parent = el.parentElement;
      el.remove();
      if(parent && parent.classList && parent.classList.contains('ad-slot') && parent.children.length === 0){ parent.remove(); }
    });
  }

  function pickAdContainer(){
    // Prefer a known ad container; else, place below hero or at end of main content
    const page = document.querySelector('.page') || document.body;
    const hero = document.querySelector('#hero, .site-hero');
    const anchor = document.createElement('div');
    // neutral anchor to avoid double .ad-slot nesting; mark hero placement for CSS sizing
    anchor.className = 'ad-anchor ad-center ad-between ad-hero';
    if(hero && hero.parentElement){ hero.parentElement.insertBefore(anchor, hero.nextSibling); return anchor; }
    page.appendChild(anchor); return anchor;
  }

  function wrapInSlot(ins){
    const wrap = document.createElement('div');
    wrap.className = 'ad-slot ad-center ad-between';
    // propagate identifying data attributes to wrapper for CSS selectors
    if(ins.hasAttribute('data-native-ad')) wrap.setAttribute('data-native-ad','1');
    if(ins.hasAttribute('data-auto-ad')) wrap.setAttribute('data-auto-ad','1');
    if(ins.hasAttribute('data-infeed-ad')) wrap.setAttribute('data-infeed-ad','1');
    wrap.appendChild(ins);
    return wrap;
  }

  // Insert a compact in-feed (fluid) ad on pages that contain notice-like content.
  function insertInFeedAdIfNoticePage(){
    try{
      const hasNotice = document.querySelector('.notice, .warning, .info-callout');
      if(!hasNotice) return;
      if(document.querySelector('ins.adsbygoogle[data-infeed-ad="1"]')) return; // already present
      // choose anchor: after the first notice element
      const firstNotice = document.querySelector('.notice, .warning, .info-callout');
      if(!firstNotice || !firstNotice.parentElement) return;
      const anchor = document.createElement('div');
      anchor.className = 'ad-slot ad-center ad-between ad-infeed';
      // Build in-feed ad (lazy)
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', CLIENT_ID);
      ins.setAttribute('data-ad-slot', INFEED_SLOT);
      ins.setAttribute('data-ad-format', 'fluid');
      ins.setAttribute('data-ad-layout-key', INFEED_LAYOUT_KEY);
      ins.setAttribute('data-infeed-ad','1');
      ins.setAttribute('data-lazy','1');
      anchor.appendChild(ins);
      // insert after the notice block
      if(firstNotice.nextSibling){ firstNotice.parentElement.insertBefore(anchor, firstNotice.nextSibling); }
      else { firstNotice.parentElement.appendChild(anchor); }
    }catch(_e){}
  }

  // Interaction-triggered ad logic (login, logout, post create/delete/share)
  const ACTION_SLOT = AUTO_AD_SLOT; // reuse auto slot id for quick display
  const actionCooldownMs = 60_000; // 1 minute cooldown per action type
  const lastActionShown = {};

  function showActionAd(action){
    const now = Date.now();
    if(lastActionShown[action] && (now - lastActionShown[action]) < actionCooldownMs) return; // cooldown
    lastActionShown[action] = now;
    // Create (or reuse) a floating container
    let box = document.getElementById('interaction-ad-box');
    if(!box){
      box = document.createElement('div');
      box.id = 'interaction-ad-box';
      box.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999;background:#111c;border:1px solid #222;padding:4px 8px;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,0.35);max-width:360px;width:min(360px,90vw);';
      document.body.appendChild(box);
    }
    box.innerHTML = ''; // ensure single ad instance
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display='block';
    ins.setAttribute('data-ad-client', CLIENT_ID);
    ins.setAttribute('data-ad-slot', ACTION_SLOT);
    ins.setAttribute('data-ad-format','auto');
    ins.setAttribute('data-full-width-responsive','true');
    box.appendChild(ins);
    try{ (window.adsbygoogle = window.adsbygoogle || []).push({}); ins.setAttribute('data-init','1'); }catch(e){}
    // Auto-hide after some time
    setTimeout(()=>{ if(box && box.parentElement) box.parentElement.removeChild(box); }, 15000);
  }

  function attachAuthAndPostListeners(){
    // Login / Register form submit triggers
    document.querySelectorAll('form[id*="login"], form[id*="signin"], form[id*="register"], form[id*="signup"]').forEach(f=>{
      f.addEventListener('submit', ()=> showActionAd('login-or-register'));
    });
    // Post create forms
    document.querySelectorAll('form[id*="createpost"], form[id*="newpost"], form[action*="createpost"]').forEach(f=>{
      f.addEventListener('submit', ()=>{
        document.dispatchEvent(new Event('post:create'));
      });
    });
    // Logout buttons/links
    document.querySelectorAll('[data-action="logout"], .logout-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> showActionAd('logout'));
    });
    // Delegated delete (for dynamic content)
    document.addEventListener('click', e=>{
      const del = e.target.closest('[data-action="delete-post"], .delete-post-btn');
      if(del){ document.dispatchEvent(new Event('post:delete')); }
    });
    // Generic post action hooks (developers can dispatch custom events)
    ['post:create','post:delete','post:share'].forEach(evt=>{
      document.addEventListener(evt, ()=> showActionAd(evt));
    });
  }
})();
