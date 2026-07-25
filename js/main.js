/* =========================================================================
   Hibero Extintores — main.js
   Sem dependências. Todo o motion é feito à mão para não depender de lib
   nem herdar "cara de plugin".
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------------
     1. Rolagem suave própria.
     O `behavior:'smooth'` nativo é silenciosamente ignorado quando o SO
     está com "reduzir movimento" ligado — o clique teleporta em vez de
     rolar. Esta implementação por requestAnimationFrame é imune a isso.
     --------------------------------------------------------------------- */
  var scrollAnim = null;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY, duration) {
    if (scrollAnim) cancelAnimationFrame(scrollAnim);
    var startY = window.pageYOffset;
    var delta  = targetY - startY;
    var max    = document.documentElement.scrollHeight - window.innerHeight;
    if (targetY > max) { delta = max - startY; }
    var dur = duration || Math.min(1100, Math.max(420, Math.abs(delta) * 0.55));
    var t0  = null;

    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      window.scrollTo(0, startY + delta * easeInOutCubic(p));
      if (p < 1) scrollAnim = requestAnimationFrame(step);
      else scrollAnim = null;
    }
    scrollAnim = requestAnimationFrame(step);
  }

  function headerOffset() {
    var h = $('#hdr');
    return h ? h.getBoundingClientRect().height - 1 : 0;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    var y = el.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    smoothScrollTo(Math.max(0, y));
    history.replaceState(null, '', id);
  });

  /* ---------------------------------------------------------------------
     2. Títulos: quebra em palavras para a revelação linha a linha
     --------------------------------------------------------------------- */
  $$('.split').forEach(function (h) {
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach(function (w, i) {
      var outer = document.createElement('span');
      var inner = document.createElement('i');
      inner.textContent = w;
      outer.style.setProperty('--wi', i);
      outer.appendChild(inner);
      h.appendChild(outer);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------------------------------------------------------------------
     3. Revelação ao rolar (stagger via setTimeout — usar transition-delay
        deixaria o hover atrasado depois que o elemento já apareceu)
     --------------------------------------------------------------------- */
  var io = new IntersectionObserver(function (entries) {
    var d = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      var wait = d; d += 90;
      setTimeout(function () { el.classList.add('is-in'); }, wait);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  $$('.reveal, .split').forEach(function (el) { io.observe(el); });
  // o h1 do hero já está na tela: revela na hora
  $$('.hero .split').forEach(function (el) { el.classList.add('is-in'); io.unobserve(el); });

  /* ---------------------------------------------------------------------
     4. Header: sombra ao rolar, menu mobile, scrollspy
     --------------------------------------------------------------------- */
  var hdr = $('#hdr'), burger = $('#burger'), nav = $('#nav');

  function closeMenu() {
    if (!nav) return;
    nav.classList.remove('is-open');
    if (burger) { burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
    document.body.style.overflow = '';
  }

  if (burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  var navLinks = $$('.nav > a[href^="#"]');
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var progress = $('.scroll-progress i');
  var totop = $('#totop');

  function onScroll() {
    var y = window.pageYOffset;
    if (hdr) hdr.classList.toggle('is-stuck', y > 8);
    if (totop) totop.classList.toggle('is-on', y > 700);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }

    var probe = y + headerOffset() + 120, active = 0;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i] && sections[i].offsetTop <= probe) active = i;
    }
    navLinks.forEach(function (a, i) { a.classList.toggle('is-active', i === active); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (totop) totop.addEventListener('click', function () { smoothScrollTo(0); });

  /* ---------------------------------------------------------------------
     5. Hero: slider (5s por slide), partículas e brilho que segue o mouse
     --------------------------------------------------------------------- */
  var SLIDE_MS = 5000;
  var slides = $$('.slide');
  var dots   = $$('#heroDots button');
  var cur = 0, slideTimer = null;

  $$('.slide__chips li').forEach(function (li, i) { li.style.setProperty('--i', i % 4); });
  dots.forEach(function (d) { d.style.setProperty('--dur', SLIDE_MS + 'ms'); });

  function goSlide(n) {
    cur = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === cur); });
    // trocar aria-selected reinicia sozinho a animação da barrinha (a regra
    // do keyframe está presa a [aria-selected="true"]::after)
    dots.forEach(function (d, i) {
      d.setAttribute('aria-selected', i === cur ? 'true' : 'false');
    });
    restartSlides();
  }

  function restartSlides() {
    clearInterval(slideTimer);
    if (slides.length > 1) slideTimer = setInterval(function () { goSlide(cur + 1); }, SLIDE_MS);
  }

  dots.forEach(function (d) {
    d.addEventListener('click', function () { goSlide(parseInt(d.dataset.go, 10)); });
  });
  restartSlides();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearInterval(slideTimer); else restartSlides();
  });

  var glow = $('#heroGlow'), hero = $('.hero');
  if (glow && hero && window.matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      glow.style.transform = 'translate(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top) + 'px)';
    });
  }

  /* --- partículas: brasas subindo, bem discretas --- */
  var cv = $('#sparks');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), parts = [], dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0;

    function sizeCanvas() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.max(26, Math.min(70, Math.round(W / 22)));
      parts = [];
      for (var i = 0; i < want; i++) parts.push(mkPart(true));
    }

    function mkPart(spread) {
      return {
        x: Math.random() * W,
        y: spread ? Math.random() * H : H + 12,
        r: 0.6 + Math.random() * 1.9,
        vy: 0.16 + Math.random() * 0.55,
        vx: (Math.random() - 0.5) * 0.24,
        a: 0.12 + Math.random() * 0.55,
        hot: Math.random() > 0.55,
        ph: Math.random() * Math.PI * 2
      };
    }

    var raf = null;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy;
        p.ph += 0.02;
        p.x += p.vx + Math.sin(p.ph) * 0.22;
        if (p.y < -14) { parts[i] = mkPart(false); continue; }
        var fade = p.y / H;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hot
          ? 'rgba(245,17,26,' + (p.a * fade).toFixed(3) + ')'
          : 'rgba(255,214,180,' + (p.a * fade * 0.65).toFixed(3) + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    draw();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) draw();
    });
  }

  /* ---------------------------------------------------------------------
     6. Diferenciais: destaque rotativo a cada 3s (pausa no hover)
     --------------------------------------------------------------------- */
  var diffs = $$('#diffs .diff');
  if (diffs.length) {
    var di = 0, dTimer = null, dPaused = false, dStarted = false;

    function setDiff(n) {
      di = (n + diffs.length) % diffs.length;
      diffs.forEach(function (c, i) {
        c.classList.remove('is-on');
        if (i === di) { void c.offsetWidth; c.classList.add('is-on'); }
      });
    }
    function startDiff() {
      clearInterval(dTimer);
      dTimer = setInterval(function () { if (!dPaused) setDiff(di + 1); }, 3000);
    }

    diffs.forEach(function (c, i) {
      c.addEventListener('mouseenter', function () { dPaused = true; setDiff(i); });
      c.addEventListener('mouseleave', function () { dPaused = false; });
    });

    var dIO = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !dStarted) { dStarted = true; setDiff(0); startDiff(); }
    }, { threshold: 0.3 });
    dIO.observe($('#diffs'));
  }

  /* ---------------------------------------------------------------------
     7. Contadores
     --------------------------------------------------------------------- */
  var statsBox = $('#stats');
  if (statsBox) {
    var sIO = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      sIO.disconnect();
      $$('b[data-count]', statsBox).forEach(function (b, i) {
        var to = parseInt(b.dataset.count, 10);
        var pre = b.dataset.pre || '', suf = b.dataset.suffix || '';
        var t0 = null, dur = 1700 + i * 220;
        function tick(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var v = Math.round(to * (1 - Math.pow(1 - p, 3)));
          b.textContent = pre + v.toLocaleString('pt-BR') + suf;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    sIO.observe(statsBox);
  }

  /* ---------------------------------------------------------------------
     8. Classes de incêndio: abas
     --------------------------------------------------------------------- */
  var cTabs = $$('#classes-ui .classes__tabs button');
  var cPanels = $$('#classes-ui .classes__panel');
  var cInk = $('#classesInk');

  function setClass(n) {
    cTabs.forEach(function (t, i) {
      t.classList.toggle('is-active', i === n);
      t.setAttribute('aria-selected', i === n ? 'true' : 'false');
    });
    cPanels.forEach(function (p, i) { p.classList.toggle('is-on', i === n); });
    if (cInk) cInk.style.transform = 'translateX(' + (n * 100) + '%)';
  }
  cTabs.forEach(function (t, i) { t.addEventListener('click', function () { setClass(i); }); });

  /* ---------------------------------------------------------------------
     9. Carrossel de produtos: setas, arrastar e roda do mouse
     --------------------------------------------------------------------- */
  var carou = $('#prodCarou'), track = $('#prodTrack');
  if (carou && track) {
    var prev = $('#prodPrev'), next = $('#prodNext');
    var idx = 0;

    function step() {
      var card = track.querySelector('.prod');
      if (!card) return 360;
      var gap = parseFloat(getComputedStyle(track).gap) || 20;
      return card.getBoundingClientRect().width + gap;
    }
    function maxIdx() {
      var cards = track.querySelectorAll('.prod').length;
      var visible = Math.max(1, Math.floor(carou.clientWidth / step()));
      return Math.max(0, cards - visible);
    }
    function apply(animate) {
      track.style.transition = animate === false ? 'none' : '';
      track.style.transform = 'translateX(' + (-idx * step()) + 'px)';
      if (prev) prev.disabled = idx <= 0;
      if (next) next.disabled = idx >= maxIdx();
    }
    function go(n) { idx = Math.max(0, Math.min(maxIdx(), n)); apply(true); }

    if (prev) prev.addEventListener('click', function () { go(idx - 1); });
    if (next) next.addEventListener('click', function () { go(idx + 1); });
    window.addEventListener('resize', function () { go(idx); });
    apply(false);

    // arrastar (mouse e toque)
    var down = false, startX = 0, startT = 0, moved = 0;
    function px(e) { return e.touches ? e.touches[0].clientX : e.clientX; }

    carou.addEventListener('pointerdown', function (e) {
      down = true; moved = 0; startX = px(e); startT = -idx * step();
      carou.classList.add('is-drag'); track.style.transition = 'none';
      carou.setPointerCapture && carou.setPointerCapture(e.pointerId);
    });
    carou.addEventListener('pointermove', function (e) {
      if (!down) return;
      moved = px(e) - startX;
      track.style.transform = 'translateX(' + (startT + moved) + 'px)';
    });
    function endDrag() {
      if (!down) return;
      down = false; carou.classList.remove('is-drag'); track.style.transition = '';
      if (Math.abs(moved) > step() * 0.22) go(idx + (moved < 0 ? 1 : -1));
      else apply(true);
    }
    carou.addEventListener('pointerup', endDrag);
    carou.addEventListener('pointercancel', endDrag);
    carou.addEventListener('pointerleave', endDrag);
    carou.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ---------------------------------------------------------------------
     10. FAQ: só um aberto por vez + altura animada
     --------------------------------------------------------------------- */
  $$('#faq-ui .faq__i').forEach(function (d) {
    var sum = d.querySelector('summary');
    var body = d.querySelector('.faq__a');
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var willOpen = !d.open;
      $$('#faq-ui .faq__i').forEach(function (o) {
        if (o !== d && o.open) { collapse(o); }
      });
      if (willOpen) expand(d); else collapse(d);
    });

    function expand(el) {
      el.open = true;
      var b = el.querySelector('.faq__a');
      var h = b.scrollHeight;
      b.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
        { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    function collapse(el) {
      var b = el.querySelector('.faq__a');
      var h = b.scrollHeight;
      var an = b.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: 320, easing: 'cubic-bezier(.16,.84,.32,1)' });
      an.onfinish = function () { el.open = false; };
    }
    void body;
  });

  /* ---------------------------------------------------------------------
     11. Formulário → WhatsApp (sem backend)
     --------------------------------------------------------------------- */
  var WHATS = '5511972325189';
  var form = $('#form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      var bad = false;
      ['nome', 'fone'].forEach(function (n) {
        var el = f[n];
        var ok = el.value.trim().length > 2;
        el.classList.toggle('is-bad', !ok);
        if (!ok && !bad) { el.focus(); bad = true; }
      });
      if (bad) return;

      var txt =
        'Olá, Hibero Extintores! Vim pelo site.\n\n' +
        '*Nome:* ' + f.nome.value.trim() + '\n' +
        '*Telefone:* ' + f.fone.value.trim() + '\n' +
        (f.empresa.value.trim() ? '*Empresa:* ' + f.empresa.value.trim() + '\n' : '') +
        '*Assunto:* ' + f.assunto.value + '\n' +
        (f.msg.value.trim() ? '\n' + f.msg.value.trim() : '');

      window.open('https://wa.me/' + WHATS + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
    });

    $$('#form input, #form textarea').forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('is-bad'); });
    });
  }

  /* ---------------------------------------------------------------------
     12. Miudezas
     --------------------------------------------------------------------- */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

})();
