/* Shared site header: mobile menu + Services dropdown. */
(function () {
  function init() {
    var mb = document.getElementById('sh-menu-btn');
    var mp = document.getElementById('sh-m-panel');
    var dd = document.getElementById('sh-svc-dd');

    if (mb && mp) {
      var closeM = function () {
        mp.hidden = true;
        mb.setAttribute('aria-expanded', 'false');
        mb.setAttribute('aria-label', 'Open menu');
      };
      mb.addEventListener('click', function () {
        if (mp.hidden) {
          mp.hidden = false;
          mb.setAttribute('aria-expanded', 'true');
          mb.setAttribute('aria-label', 'Close menu');
        } else closeM();
      });
      mp.addEventListener('click', function (e) { if (e.target.closest('a')) closeM(); });
      window.addEventListener('resize', function () { if (window.innerWidth > 1240 && !mp.hidden) closeM(); });
    }

    if (dd) {
      document.addEventListener('click', function (e) { if (dd.open && !dd.contains(e.target)) dd.open = false; });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && dd.open) { dd.open = false; dd.querySelector('summary').focus(); }
      });
      dd.addEventListener('click', function (e) { if (e.target.closest('a')) dd.open = false; });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
