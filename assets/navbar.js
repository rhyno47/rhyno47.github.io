// Unified navbar + footer injector and helpers
document.addEventListener('DOMContentLoaded', () => {
  // Render the canonical navbar. If a user is logged in (token in localStorage)
  // the nav will hide the Sign In link and show a small user area with Sign Out.
  function escapeHTML(s){ return String(s||'').replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[c])); }
  function renderNav(){
    const isLoggedIn = !!localStorage.getItem('token');
    let userName = '';
    try { const u = JSON.parse(localStorage.getItem('user') || 'null'); if (u) userName = u.name || u.username || u.email || ''; } catch(e){}

    const common = `
      <div class="logo"><a href="/index.html"><img src="/images/coding with tawfiq.jpg" alt="Coding with Tawfiq logo"></a></div>
      <button class="hamburger" aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <ul class="nav-links">
        <li><a href="/index.html">Home</a></li>
        <li><a href="/try-quiz.html">Practice</a></li>
        <li><a href="/findjobs.html">Find Jobs</a></li>
      </ul>`;

    const actions = isLoggedIn ? `
      <div class="nav-actions">
        <button class="search-btn" aria-label="Search"><img src="/images/the search logo.jpg" alt="Search"></button>
        <div class="card-link user-menu" role="menu">
          <span class="user-name">${escapeHTML(userName || 'Account')}</span>
          <button class="signout-btn" aria-label="Sign out" title="Sign out">Sign Out</button>
        </div>
      </div>` : `
      <div class="nav-actions">
        <button class="search-btn" aria-label="Search"><img src="/images/the search logo.jpg" alt="Search"></button>
        <a class="card-link" href="/public/login.html">Sign In</a>
      </div>`;

    document.querySelectorAll('.new-navbar').forEach(nav => { nav.innerHTML = common + actions; });
  }

  // Initial render and keep nav in sync with storage changes
  renderNav();
  window.addEventListener('storage', (e)=>{ if (e.key === 'token' || e.key === 'user') renderNav(); });

  // Global sign out handler (delegated) — clears auth and rerenders nav
  document.body.addEventListener('click', (e)=>{
    const btn = e.target.closest && e.target.closest('.signout-btn');
    if (btn) {
      try { localStorage.removeItem('token'); localStorage.removeItem('user'); sessionStorage.removeItem('token'); sessionStorage.removeItem('user'); } catch(e){}
      renderNav();
      // Optionally redirect to home after sign-out
      setTimeout(()=>{ if (location.pathname !== '/' ) location.href = '/'; }, 150);
    }
  });

  // If page lacks a footer#footer, inject a canonical footer at the end of body
  if (!document.getElementById('footer')) {
    const footer = document.createElement('footer');
    footer.id = 'footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="/index.html" aria-label="Coding with Tawfiq home"><img src="/images/coding with tawfiq.jpg" alt="Coding with Tawfiq logo"></a>
          <div class="footer-links">
            <a href="/about.html">About</a>
            <a href="/contact.html">Contact</a>
            <a href="/privacy.html">Privacy</a>
          </div>
        </div>
        <div class="footer-right">
          <div class="footer-copy">© <span id="footerYear"></span> Coding with Tawfiq. All rights reserved.</div>
          <div class="footer-social" aria-label="Social links">
            <a href="#" aria-label="Twitter"><i class="bi bi-twitter"></i></a>
            <a href="#" aria-label="Facebook"><i class="bi bi-facebook"></i></a>
            <a href="#" aria-label="GitHub"><i class="bi bi-github"></i></a>
          </div>
        </div>
      </div>`;
    document.body.appendChild(footer);
    const fy = document.getElementById('footerYear'); if(fy) fy.textContent = new Date().getFullYear();
  }

  // Now initialize interaction handlers (previous behavior)
  // Bootstrap-like toggler (keeps compatibility with pages that still use it)
  const bsToggler = document.querySelector('.navbar-toggler');
  const bsMenu = document.getElementById('navbarMenu');
  if (bsToggler && bsMenu) {
    bsToggler.addEventListener('click', () => { bsMenu.classList.toggle('show'); });
  }

  // Site-native navbar: toggle `nav-open` on the closest .new-navbar when hamburger clicked
  document.querySelectorAll('.new-navbar .hamburger').forEach(btn => {
    btn.addEventListener('click', () => {
      const navbar = btn.closest('.new-navbar');
      if (navbar) navbar.classList.toggle('nav-open');
    });
  });

  // Close native nav when a link is clicked (mobile friendly)
  document.querySelectorAll('.new-navbar .nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      const navbar = a.closest('.new-navbar');
      if (navbar && navbar.classList.contains('nav-open')) navbar.classList.remove('nav-open');
    });
  });

  // Search overlay: toggles a site-wide (client-side) search UI that scans page anchors and on-page headings
  function createSearchOverlay() {
    if (document.getElementById('site-search-overlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #site-search-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:flex-start;justify-content:center;padding:5vh 1rem;z-index:9999}
      #site-search-box{width:100%;max-width:780px;background:linear-gradient(180deg,#fff,#fbfbfb);border-radius:12px;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,0.35)}
      #site-search-box .row{display:flex;gap:8px;align-items:center}
      #site-search-input{flex:1;padding:10px 12px;border:1px solid #e5e5e5;border-radius:8px;font-size:15px}
      #site-search-close{background:#680202;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
      #site-search-results{margin-top:12px;max-height:45vh;overflow:auto}
      #site-search-results a{display:block;padding:8px;border-radius:6px;color:#111;text-decoration:none}
      #site-search-results a:hover{background:#f1f1f1}
      #site-search-no{color:#666;padding:8px}
    `;
    document.head.appendChild(style);
    const overlay = document.createElement('div');
    overlay.id = 'site-search-overlay';
    overlay.innerHTML = `
      <div id="site-search-box">
        <div class="row">
          <input id="site-search-input" placeholder="Search site (pages, links, headings)..." />
          <button id="site-search-close">Close</button>
        </div>
        <div id="site-search-results"><div id="site-search-no">Type to search</div></div>
      </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('site-search-input');
    const close = document.getElementById('site-search-close');
    const results = document.getElementById('site-search-results');
    function gatherIndex() {
      const anchors = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.getAttribute('href'), text: (a.textContent||a.getAttribute('title')||a.getAttribute('aria-label')||a.getAttribute('href')||'').trim() }))
        .filter(x => x.href && x.href.trim() !== '' )
        .reduce((map, item) => { if (!map.has(item.href)) map.set(item.href, item); return map; }, new Map());
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h => ({ href: `` + (h.id ? `#${h.id}` : ''), text: (h.textContent||'').trim() }));
      const index = [];
      for (const v of anchors.values()) index.push(v);
      headings.forEach(h => { if (h.text) index.push(h); });
      return index;
    }
    let index = gatherIndex();
    const STATIC_INDEX_URL = '/assets/search-index.json';
    (async function tryLoadStatic(){
      try {
        const res = await fetch(STATIC_INDEX_URL, { cache: 'no-cache' });
        if (!res.ok) return;
        const siteIndex = await res.json();
        const mapped = siteIndex.map(item => ({ href: item.path, text: ((item.title||'') + ' ' + (item.headings||[]).join(' ')).trim(), snippet: item.snippet }));
        index = mapped.concat(index);
      } catch (e) {}
    })();
    function closeOverlay() { overlay.remove(); style.remove(); document.removeEventListener('keydown', escHandler); }
    function escHandler(e){ if (e.key === 'Escape') closeOverlay(); }
    document.addEventListener('keydown', escHandler);
    close.addEventListener('click', closeOverlay);
    function debounce(fn, wait=150){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
    function renderResults(q){
      const term = String(q||'').trim().toLowerCase(); results.innerHTML = '';
      if (!term) { results.innerHTML = '<div id="site-search-no">Type to search</div>'; return; }
      index = gatherIndex();
      const matches = index.filter(item => { const t = (item.text||'') + ' ' + (item.href||''); return t.toLowerCase().includes(term); });
      if (!matches.length) { results.innerHTML = `<div id="site-search-no">No results. Try another term or navigate from the menu.</div>`; return; }
      matches.forEach(m => { const a = document.createElement('a'); let href = m.href; if (href.startsWith(window.location.origin)) href = new URL(href).pathname + new URL(href).search + new URL(href).hash; a.href = href; a.textContent = (m.text && m.text.length>0) ? m.text : href; a.addEventListener('click', () => closeOverlay()); results.appendChild(a); });
    }
    input.addEventListener('input', debounce(e => renderResults(e.target.value), 120));
    input.focus();
  }

  // toggle overlay when a search button is clicked
  document.querySelectorAll('.search-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (document.getElementById('site-search-overlay')) { document.getElementById('site-search-overlay').remove(); } else { createSearchOverlay(); }
    });
  });

  // --- Toast / notification helper (global) ---
  if (!document.getElementById('site-toast-container')) {
    const tc = document.createElement('div');
    tc.className = 'toast-container';
    tc.id = 'site-toast-container';
    document.body.appendChild(tc);
  }

  // expose a global helper to show toasts: showToast(type, title, message, opts)
  window.showToast = function(type = 'info', title = '', message = '', opts = {}) {
    try {
      const container = document.getElementById('site-toast-container');
      if (!container) return;
      const t = document.createElement('div');
      t.className = 'site-toast ' + (type || 'info');
      t.setAttribute('role','status');
      t.setAttribute('aria-live','polite');

      const icon = document.createElement('div'); icon.className = 'icon';
      icon.innerHTML = (type==='success')? '<i class="bi bi-check-lg"></i>' : (type==='error')? '<i class="bi bi-exclamation-lg"></i>' : '<i class="bi bi-info-lg"></i>';
      const content = document.createElement('div'); content.style.flex = '1';
      if (title) content.innerHTML = `<div class="title">${title}</div>`;
      if (message) content.innerHTML += `<div class="body">${message}</div>`;

      const close = document.createElement('button'); close.className = 'close-btn'; close.innerHTML = '&times;';
      close.addEventListener('click', () => removeToast(t));

      t.appendChild(icon); t.appendChild(content); t.appendChild(close);
      container.appendChild(t);

      // Auto-dismiss after timeout (default 3800ms)
      const ttl = (opts && opts.ttl) ? Number(opts.ttl) : 3800;
      let timeout = setTimeout(() => removeToast(t), ttl);

      // remove function with animation
      function removeToast(node){
        if (!node) return;
        node.classList.add('removing');
        // give animation time to play
        setTimeout(()=>{ try{ node.remove(); }catch(e){} }, 260);
        if (timeout) { clearTimeout(timeout); timeout = null; }
      }
      return t;
    } catch (e) { console.error('showToast error', e); }
  };

  // --- AI supporter widget (inject globally so FAB is on every page) ---
  // Inject a default hero section (copy of the site hero copy) on pages that request it.
  // Behavior:
  // - If a page already has an element with id="hero" we don't touch it.
  // - If a page contains one or more elements with class "page-hero" or attribute data-hero="default",
  //   we inject the default hero markup into any empty placeholder.
  // - If none of the above exist, we prepend the hero to the first `.page` element (if present),
  //   otherwise we insert it at the top of the <body>.
  (function injectDefaultHero(){
    try {
      // Allow pages to opt-out explicitly with data-no-hero="1" on <body>
      if (document.body && document.body.getAttribute && document.body.getAttribute('data-no-hero') === '1') return;

      // Skip injecting the default hero for specific pages where it's not desired
      const excludePaths = ['/public/login.html', '/public/register.html', '/findjobs.html', '/login.html', '/register.html'];
      if (excludePaths.includes(window.location.pathname)) return;

      if (document.getElementById('hero')) return; // a page provided its own hero
      const heroHTML = `
        <section id="hero" class="site-hero page-hero">
          <div class="hero-content">
            <h1>Learn web development — practical, project-based. 🚀</h1>
            <p>Practice with interactive quizzes, build projects, and get job-ready skills through guided lessons and hands-on tasks.</p>
            <div class="hero-actions">
              <a class="btn-primary" href="/try-quiz.html">Start Practice</a>
              <a class="btn-ghost" href="/findjobs.html">Find Jobs</a>
            </div>
          </div>
        </section>`;

      // Helper to insert markup into a node if it's basically empty
      function fillIfEmpty(node){
        if (!node) return false;
        // treat nodes with only whitespace or no children as empty
        const hasContent = Array.from(node.childNodes).some(n => {
          if (n.nodeType === Node.ELEMENT_NODE) return true;
          if (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length>0) return true;
          return false;
        });
        if (!hasContent) { node.innerHTML = heroHTML; return true; }
        return false;
      }

      // 1) Fill explicit placeholders: .page-hero (if empty) or [data-hero="default"]
      const placeholders = Array.from(document.querySelectorAll('.page-hero, [data-hero="default"]'));
      let injected = false;
      for (const ph of placeholders){ if (fillIfEmpty(ph)) injected = true; }

      // 2) If nothing requested a hero yet, try to prepend into the main .page container
      if (!injected){
        const pageEl = document.querySelector('.page');
        if (pageEl){
          // only prepend if there isn't already a hero child inside
          if (!pageEl.querySelector('#hero')){
            const wrapper = document.createElement('div');
            wrapper.innerHTML = heroHTML;
            pageEl.insertBefore(wrapper.firstElementChild, pageEl.firstChild);
            injected = true;
          }
        }
      }

      // 3) As a last resort, prepend to the body if still not injected
      if (!injected){
        const frag = document.createRange().createContextualFragment(heroHTML);
        document.body.insertBefore(frag, document.body.firstChild);
      }

      // keep accessibility: focus the first focusable CTA if the hero is visible and has no other focus set
    } catch (e) { console.error('Hero injector failed', e); }
  })();

  (function(){
    if (document.getElementById('aiFab')) return; // already injected
    try {
      const fab = document.createElement('div');
      fab.className = 'ai-fab';
      fab.id = 'aiFab';
      fab.setAttribute('role','button');
      fab.setAttribute('aria-label','Open AI helper');
      fab.innerHTML = `<span class="ai-label">AI</span>`;

      const card = document.createElement('div');
      card.className = 'ai-chat-card hidden';
      card.id = 'aiChat';
      card.innerHTML = `
        <div class="ai-chat-header">
          <div class="ai-chat-title">AI Supporter</div>
          <button class="ai-chat-close" id="aiClose" aria-label="Close">✕</button>
        </div>
        <div class="ai-chat-body" id="aiBody" aria-live="polite"></div>
        <div class="ai-chat-input">
          <textarea id="aiInput" placeholder="Type your question..." aria-label="Message"></textarea>
          <button id="aiSend">Ask</button>
        </div>`;

      document.body.appendChild(fab);
      document.body.appendChild(card);

      const closeBtn = card.querySelector('#aiClose');
      const body = card.querySelector('#aiBody');
      const input = card.querySelector('#aiInput');
      const send = card.querySelector('#aiSend');

      function appendMsg(text, who){
        const el = document.createElement('div');
        el.className = 'ai-msg ' + (who==='user' ? 'user' : 'bot');
        el.innerText = text;
        body.appendChild(el);
        body.scrollTop = body.scrollHeight;
      }

      function openChat(){
        card.classList.remove('hidden');
        if (!card.dataset.greeted){
          setTimeout(()=> appendMsg('Hi — how can I help? 😊', 'bot'), 150);
          card.dataset.greeted = '1';
        }
        input.focus();
      }
      function closeChat(){ card.classList.add('hidden'); }

      fab.addEventListener('click', ()=>{ if (card.classList.contains('hidden')) openChat(); else closeChat(); });
      closeBtn.addEventListener('click', closeChat);

      // Try to call server-side AI proxy; fall back to a local echo if unavailable
      async function queryAI(prompt){
        try{
          const res = await fetch('/api/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message:prompt}) });
          if (res.ok){ const j = await res.json(); if (j && j.reply) return j.reply; }
        }catch(e){ /* ignore network errors and fall through to local fallback */ }
        // local fallback: short delay and friendly echo
        await new Promise(r=>setTimeout(r, 600));
        return `I heard: "${prompt}" — try asking me to explain or show an example.`;
      }

      send.addEventListener('click', async ()=>{
        const text = input.value && input.value.trim();
        if (!text) return; appendMsg(text,'user'); input.value = '';
        const typing = document.createElement('div'); typing.className='ai-typing'; typing.innerText='AI is typing…'; body.appendChild(typing); body.scrollTop = body.scrollHeight;
        try{
          const reply = await queryAI(text);
          typing.remove(); appendMsg(reply,'bot');
        }catch(e){ typing.remove(); appendMsg('Sorry, something went wrong. Try again later.','bot'); }
      });

      input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send.click(); } });
    } catch (e) { console.error('AI widget injection failed', e); }
  })();
});
