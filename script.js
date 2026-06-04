(function () {
  'use strict';

  const doc = document.documentElement;
  const body = document.body;
  const nav = document.querySelector('.nav');
  const progress = document.querySelector('.scroll-progress');
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorFollower = document.querySelector('.cursor-follower');
  const pointerFine = window.matchMedia('(pointer:fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Reemplaza este valor por la liga real de Stripe Payment Link de KOA.
  window.KOA_STRIPE_PAYMENT_LINK = window.KOA_STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/REEMPLAZAR_LINK_DE_PAGO_XHOCK';

  const lerp = (start, end, amount) => (1 - amount) * start + amount * end;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let follower = { x: mouse.x, y: mouse.y };

  /* ---------- Scroll UI: progress, nav, parallax ---------- */
  function updateScrollUi() {
    const max = doc.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progress) progress.style.width = `${pct}%`;
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);

    document.querySelectorAll('[data-parallax]').forEach(item => {
      const rect = item.getBoundingClientRect();
      const viewProgress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      const offset = (viewProgress - .5) * 26;
      item.style.transform = `translate3d(0, ${offset}px, 0)`;
    });

    document.querySelectorAll('[data-parallax-bg]').forEach(media => {
      const sec = media.closest('section') || media;
      const rect = sec.getBoundingClientRect();
      const prog = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      const img = media.querySelector('img') || media;
      img.style.transform = `translate3d(0, ${(prog - .5) * 64}px, 0) scale(1.06)`;
    });

    document.querySelectorAll('[data-parallax-soft]').forEach(item => {
      const img = item.querySelector('img');
      if (!img) return;
      const rect = item.getBoundingClientRect();
      const prog = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      img.style.transform = `translate3d(0, ${(prog - .5) * 30}px, 0) scale(1.08)`;
    });
  }
  window.addEventListener('scroll', updateScrollUi, { passive: true });
  window.addEventListener('resize', updateScrollUi);
  updateScrollUi();

  /* ---------- Robust reveal system (works headless + on scroll) ---------- */
  const revealEls = [...document.querySelectorAll('.reveal, .split-title, .fade-up, .counter')];
  function runReveal() {
    const vh = window.innerHeight;
    revealEls.forEach(el => {
      if (el.classList.contains('is-visible')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -40) {
        el.classList.add('is-visible');
        if (el.classList.contains('counter') && !el.dataset.animated) animateCounter(el);
        // After the entrance finishes, lock the final state so it renders in any
        // context (print, PDF, non-compositing capture) without relying on the transition.
        setTimeout(function () { el.classList.add('is-settled'); }, 1000);
      }
    });
  }
  window.addEventListener('scroll', runReveal, { passive: true });
  window.addEventListener('resize', runReveal);
  runReveal();
  requestAnimationFrame(runReveal);
  window.addEventListener('load', () => { runReveal(); setTimeout(runReveal, 250); });

  function animateCounter(el) {
    el.dataset.animated = 'true';
    const end = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || '';
    const duration = 1300;
    const startTime = performance.now();
    const formatter = new Intl.NumberFormat('es-MX');
    if (reduceMotion) { el.textContent = `${formatter.format(end)}${suffix}`; return; }
    function tick(now) {
      const t = clamp((now - startTime) / duration, 0, 1);
      const value = Math.round(easeOutCubic(t) * end);
      el.textContent = `${formatter.format(value)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Custom cursor ---------- */
  if (pointerFine && cursorDot && cursorFollower) {
    window.addEventListener('mousemove', event => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      cursorDot.style.transform = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%, -50%)`;
    });
    function animateCursor() {
      follower.x = lerp(follower.x, mouse.x, 0.16);
      follower.y = lerp(follower.y, mouse.y, 0.16);
      cursorFollower.style.transform = `translate(${follower.x}px, ${follower.y}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
    document.querySelectorAll('a, button, .tilt-card, .faq-item, .tab-btn, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => body.classList.add('cursor-active'));
      el.addEventListener('mouseleave', () => body.classList.remove('cursor-active'));
    });
  }

  /* ---------- Button ripple origin ---------- */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('pointermove', event => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--x', `${event.clientX - rect.left}px`);
      btn.style.setProperty('--y', `${event.clientY - rect.top}px`);
    });
  });

  /* ---------- Magnetic pull (non-button elements) ---------- */
  if (pointerFine && !reduceMotion) {
    document.querySelectorAll('.magnetic:not(.btn)').forEach(el => {
      el.addEventListener('pointermove', event => {
        const r = el.getBoundingClientRect();
        const mx = (event.clientX - r.left - r.width / 2) / r.width;
        const my = (event.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = `translate(${mx * 10}px, ${my * 10}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector('.nav__toggle');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('menu-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- 3D tilt ---------- */
  if (pointerFine && !reduceMotion) {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateX = (0.5 - y) * 8;
        const rotateY = (x - 0.5) * 10;
        card.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Particles ---------- */
  function initParticles(canvas) {
    if (reduceMotion) return;
    const ctx = canvas.getContext('2d');
    const colors = ['rgba(235,226,102,.68)', 'rgba(255,127,25,.48)', 'rgba(226,6,19,.38)', 'rgba(255,255,255,.28)'];
    const state = { particles: [], width: 0, height: 0, dpr: Math.min(window.devicePixelRatio || 1, 2) };
    function resize() {
      const rect = canvas.getBoundingClientRect();
      state.width = Math.max(1, rect.width);
      state.height = Math.max(1, rect.height);
      canvas.width = Math.floor(state.width * state.dpr);
      canvas.height = Math.floor(state.height * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      const base = canvas.dataset.particles === 'hero' ? 58 : 34;
      const count = Math.round(base * Math.min(state.width / 1200, 1.35));
      state.particles = Array.from({ length: count }, () => ({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        r: Math.random() * 2.2 + 0.6,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        color: colors[Math.floor(Math.random() * colors.length)],
        line: Math.random() > 0.72
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, state.width, state.height);
      state.particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -12) p.x = state.width + 12;
        if (p.x > state.width + 12) p.x = -12;
        if (p.y < -12) p.y = state.height + 12;
        if (p.y > state.height + 12) p.y = -12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        if (p.line) {
          for (let j = i + 1; j < state.particles.length; j++) {
            const q = state.particles[j];
            const dx = p.x - q.x, dy = p.y - q.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 115) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.strokeStyle = `rgba(235,226,102,${0.075 * (1 - dist / 115)})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      });
      requestAnimationFrame(draw);
    }
    resize();
    draw();
    window.addEventListener('resize', resize);
  }
  document.querySelectorAll('.particle-canvas').forEach(initParticles);

  /* ---------- Tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach(tabs => {
    const buttons = tabs.querySelectorAll('.tab-btn');
    const panels = tabs.querySelectorAll('.tab-panel');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tab;
        buttons.forEach(item => {
          const active = item === btn;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', String(active));
        });
        panels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === id));
      });
    });
  });

  /* ---------- Accordion ---------- */
  document.querySelectorAll('[data-accordion]').forEach(accordion => {
    accordion.querySelectorAll('.faq-item button').forEach(button => {
      button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        const isActive = item.classList.toggle('active');
        button.setAttribute('aria-expanded', String(isActive));
      });
    });
  });

  /* ---------- Image fallback ---------- */
  function applyImageFallback(img) {
    const parent = img.closest('figure, .visual-card__media, .phone-card, .context__media, .method__mini-grid, .bento-card, .cta-banner__media');
    if (parent) parent.classList.add('image-fallback');
    img.style.opacity = '0';
  }
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => applyImageFallback(img), { once: true });
    if (img.complete && img.naturalWidth === 0) applyImageFallback(img);
  });

  /* ---------- Lead form → gracias.html ---------- */
  const form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        sessionStorage.setItem('koa-xhock-lead', JSON.stringify({ ...payload, date: new Date().toISOString() }));
      } catch (error) { /* privacy mode */ }
      const submit = form.querySelector('button[type="submit"]');
      if (submit) { submit.classList.add('is-loading'); submit.disabled = true; }
      const stripeUrl = form.dataset.stripeUrl || window.KOA_STRIPE_PAYMENT_LINK || '';
      setTimeout(() => {
        if (stripeUrl && !stripeUrl.includes('REEMPLAZAR_LINK_DE_PAGO_XHOCK')) {
          window.location.href = stripeUrl;
        } else {
          alert('Falta configurar la liga real de Stripe en index.html o script.js. Por ahora se abrirá la página de gracias.');
          window.location.href = 'gracias.html';
        }
      }, 420);
    });
  }
})();
