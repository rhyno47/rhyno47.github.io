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
          const wrap = slot.closest('.ad-mid'); if(wrap) wrap.setAttribute('data-init','1');
        }catch(e){ /* swallow */ }
        obs.unobserve(slot);
      });
    }, { rootMargin: '120px 0px' });
    document.querySelectorAll('ins.adsbygoogle[data-lazy]:not([data-init])').forEach(el=> obs.observe(el));
  }
  function init(){
    loadScriptIfMissing();
    // Delay slot init slightly to allow script load if it was missing.
    const onLoad = ()=>{ setTimeout(()=>{ initSlots(); lazyInit(); }, 150); };
    if(document.readyState === 'complete') onLoad(); else window.addEventListener('load', onLoad);
  }
  window.AdHelper = { init, initSlots, lazyInit };
  // Auto-init.
  init();
})();
