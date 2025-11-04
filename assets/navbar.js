// Lightweight navbar toggler to replace Bootstrap's collapse JS for this project
// Finds buttons with class 'navbar-toggler' and toggles the target specified in
// data-bs-target or aria-controls. Toggles the 'show' class and updates aria-expanded.

(function () {
  function initNavbarTogglers() {
    const togglers = document.querySelectorAll('.navbar-toggler');
    togglers.forEach(btn => {
      // Avoid attaching multiple handlers
      if (btn.__navbarInit) return;
      btn.__navbarInit = true;

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const targetSelector = btn.getAttribute('data-bs-target') || '#' + (btn.getAttribute('aria-controls') || 'navbarMenu');
        const target = document.querySelector(targetSelector);
        if (!target) return;

        const isShown = target.classList.contains('show');
        if (isShown) {
          target.classList.remove('show');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          target.classList.add('show');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbarTogglers);
  } else {
    initNavbarTogglers();
  }
})();
