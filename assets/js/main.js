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

  /* ── GA4 click tracking ──
     優先順位で1回だけ発火（重複計上を避ける）:
     1) Amazonアフィリンク → affiliate_click
     2) KANEX問い合わせCTA(data-kanex-cta) → kanex_contact_click
     3) tel: → phone_click / mailto: → email_click
     4) contact.html への一般リンク → cta_click
     ※ 個人情報は送信しない。 */
  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!link || typeof window.gtag !== 'function') return;
    var href = link.getAttribute('href') || '';

    if (link.hasAttribute('data-asin') || link.getAttribute('data-destination') === 'amazon') {
      window.gtag('event', 'affiliate_click', {
        asin: link.getAttribute('data-asin') || '',
        product_name: link.getAttribute('data-product-name') || '',
        article_slug: (location.pathname.split('/').pop() || '').replace('.html', ''),
        category: link.getAttribute('data-category') || '',
        position: link.getAttribute('data-position') || '',
        destination: 'amazon',
        associate_tag: link.getAttribute('data-associate-tag') || ''
      });
      return;
    }
    if (link.hasAttribute('data-kanex-cta')) {
      window.gtag('event', 'kanex_contact_click', {
        article_slug: link.getAttribute('data-article-slug') || (location.pathname.split('/').pop() || '').replace('.html', ''),
        service_type: link.getAttribute('data-service-type') || '',
        position: link.getAttribute('data-position') || ''
      });
      return;
    }
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
