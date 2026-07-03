/* KANEX Corporation — Main JavaScript */
(function () {
  'use strict';

  /* ── Header scroll effect ── */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ── Hamburger menu ── */
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function () {
      const isOpen = mobileNav.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // Close on link click
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Scroll reveal ── */
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { observer.observe(el); });
  }

  /* ── GA4 click tracking (phone / email / contact CTA) ── */
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!link || typeof window.gtag !== 'function') return;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) {
      window.gtag('event', 'phone_click', { link_url: href, page_path: location.pathname });
    } else if (href.indexOf('mailto:') === 0) {
      window.gtag('event', 'email_click', { link_url: href, page_path: location.pathname });
    } else if (href.indexOf('contact.html') !== -1) {
      window.gtag('event', 'cta_click', {
        link_text: (link.textContent || '').trim().slice(0, 50),
        page_path: location.pathname
      });
    }
  }, true);
})();
