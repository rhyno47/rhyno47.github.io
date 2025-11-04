// ads-manager.js
// Controls collapsible non-intrusive ad blocks and lazy-loads ad scripts when user requests.
(function(){
  function initAdBlock(ad) {
    const header = document.createElement('div');
    header.className = 'ad-header';
    const btn = document.createElement('button');
    btn.className = 'ad-toggle';
    btn.textContent = localStorage.getItem('ads_collapsed') === 'false' ? 'Hide ads' : 'Show ads';
    header.appendChild(btn);
    ad.insertBefore(header, ad.firstChild);

    const content = ad.querySelector('.ad-content');
    // default collapsed state: collapsed unless user preference says otherwise
    const collapsedPref = localStorage.getItem('ads_collapsed');
    if (collapsedPref === null) {
      ad.classList.add('collapsed');
    } else if (collapsedPref === 'false') {
      ad.classList.remove('collapsed');
      lazyLoadAd(content);
    }

    btn.addEventListener('click', function(){
      const isCollapsed = ad.classList.toggle('collapsed');
      btn.textContent = isCollapsed ? 'Show ads' : 'Hide ads';
      localStorage.setItem('ads_collapsed', isCollapsed);
      if (!isCollapsed) lazyLoadAd(content);
    });

    // on desktop (wider screens) load after 2s to avoid blocking the page
    if (window.innerWidth > 800 && ad.classList.contains('collapsed') === false) {
      setTimeout(()=> lazyLoadAd(content), 2000);
    }
  }

  function lazyLoadAd(container) {
    if (!container) return;
    if (container.dataset.loaded === 'true') return;
    // move any script tags from data-scripts to real script nodes
    const scriptsHtml = container.getAttribute('data-ad-scripts');
    if (scriptsHtml) {
      // Insert the HTML content (which may include ins and script src). Be careful.
      container.innerHTML = scriptsHtml;
      // For scripts with src, re-insert to force execution
      const scripts = container.querySelectorAll('script');
      scripts.forEach(s => {
        if (s.src) {
          const ns = document.createElement('script');
          ns.src = s.src;
          ns.async = s.async;
          document.body.appendChild(ns);
          s.remove();
        }
      });
      container.dataset.loaded = 'true';
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const ads = document.querySelectorAll('.non-intrusive-ad');
    ads.forEach(initAdBlock);
  });
})();
