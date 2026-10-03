/* Shared chrome for pages that opt in to the Phase 1 partials. */
(() => {
  const nav = document.getElementById('fs-nav');
  const navToggle = document.getElementById('fs-nav-toggle');
  const servicesToggle = document.getElementById('fs-services-toggle');
  const servicesMenu = document.getElementById('fs-services-menu');

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-fs-cta]');
    if (!link) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'finasheet_cta_click',
      cta_name: link.dataset.fsCta,
      cta_location: link.dataset.fsCtaLocation || '',
    });
  });

  if (!nav || !navToggle || !servicesToggle || !servicesMenu) return;

  function closeServices() {
    servicesToggle.setAttribute('aria-expanded', 'false');
    servicesMenu.hidden = true;
  }

  function closeNav() {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation');
    closeServices();
  }

  navToggle.addEventListener('click', () => {
    const opening = navToggle.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', opening);
    navToggle.setAttribute('aria-expanded', String(opening));
    navToggle.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
    if (!opening) closeServices();
  });

  servicesToggle.addEventListener('click', () => {
    const opening = servicesToggle.getAttribute('aria-expanded') !== 'true';
    servicesToggle.setAttribute('aria-expanded', String(opening));
    servicesMenu.hidden = !opening;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!servicesMenu.hidden) {
      closeServices();
      servicesToggle.focus();
    } else if (nav.classList.contains('is-open')) {
      closeNav();
      navToggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.fs-header')) closeNav();
    else if (!event.target.closest('.fs-nav__service')) closeServices();
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeNav();
  });

})();
