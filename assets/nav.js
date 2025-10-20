document.addEventListener('DOMContentLoaded', function () {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  // Create toggle button if not present
  let toggle = nav.querySelector('.nav-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Toggle menu');
    // set explicit button type to avoid accidental form submission
    toggle.type = 'button';
    // initial aria-expanded state
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
    nav.insertBefore(toggle, nav.firstChild);
  }

  function setOpen(open) {
    if (open) {
      nav.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      nav.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('nav-open'));
  });

  // keyboard support (Enter / Space)
  toggle.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(!nav.classList.contains('nav-open'));
    }
  });

  // Close menu when a link is clicked (mobile)
  nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('nav-open');
  }));
});
