/* =========================================================================
   Hibero Extintores — main.js
   Sem dependências. Todo o motion é feito à mão para não depender de lib
   nem herdar "cara de plugin".
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var raf = window.requestAnimationFrame.bind(window);

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
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var delta = Math.min(targetY, max) - startY;
    var dur = duration || Math.min(1200, Math.max(450, Math.abs(delta) * 0.55));
    var t0 = null;

    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      window.scrollTo(0, startY + delta * easeInOutCubic(p));
      if (p < 1) scrollAnim = raf(step); else scrollAnim = null;
    }
    scrollAnim = raf(step);
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
     3. Revelação ao rolar.

     Feito na mão, com checagem por rolagem, e não com IntersectionObserver:
     o IO com rootMargin negativo pode simplesmente NÃO disparar quando o
     usuário passa rápido por uma faixa curta (roda do mouse dá saltos), e
     aí o conteúdo fica invisível para sempre. Aqui a regra é absoluta —
     qualquer elemento cujo topo já cruzou 86% da tela está revelado —, o
     que torna impossível sobrar bloco escondido.

     O gatilho a 86% (e não assim que encosta na borda) é de propósito: a
     entrada precisa acontecer DENTRO do campo de visão, senão a animação
     termina fora da tela e a página parece estática.

     Stagger por setTimeout — transition-delay atrasaria o hover depois.
     --------------------------------------------------------------------- */
  var revealPend = $$('.reveal, .split, .kicker, #clientsGrid');
  var revealTicking = false;

  function runReveal() {
    revealTicking = false;
    var vh = window.innerHeight;
    var line = vh * 0.86;
    var batch = 0;
    for (var i = revealPend.length - 1; i >= 0; i--) {
      var el = revealPend[i];
      if (el.getBoundingClientRect().top >= line) continue;
      revealPend.splice(i, 1);
      (function (node, wait) {
        setTimeout(function () { node.classList.add('is-in'); }, wait);
      })(el, batch * 105);
      batch++;
    }
  }
  function queueReveal() {
    if (!revealTicking) { revealTicking = true; raf(runReveal); }
  }
  window.addEventListener('scroll', queueReveal, { passive: true });
  window.addEventListener('resize', queueReveal);
  window.addEventListener('load', queueReveal);

  // o que já está na primeira dobra revela na hora, sem espera
  $$('.hero .split, .hero .kicker').forEach(function (el) {
    el.classList.add('is-in');
    var k = revealPend.indexOf(el);
    if (k > -1) revealPend.splice(k, 1);
  });
  runReveal();

  /* índices para escalonar os brilhos decorativos */
  $$('.tile').forEach(function (t, i) { t.style.setProperty('--ti', i); });
  $$('.cli').forEach(function (c, i) { c.style.setProperty('--ci', i); });
  $$('.slide__chips li').forEach(function (li, i) { li.style.setProperty('--i', i % 4); });

  /* ---------------------------------------------------------------------
     4. Header: sombra, menu mobile, scrollspy e indicador deslizante
     --------------------------------------------------------------------- */
  var hdr = $('#hdr'), burger = $('#burger'), nav = $('#nav'), navInk = $('#navInk');

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
  var progBar = $('#progBar');
  var totop = $('#totop');
  var activeIdx = -1;

  function moveInk(el) {
    if (!navInk || !el || window.innerWidth <= 900) return;
    navInk.style.width = el.offsetWidth + 'px';
    navInk.style.transform = 'translateX(' + el.offsetLeft + 'px)';
    navInk.classList.add('is-on');
  }

  navLinks.forEach(function (a) {
    a.addEventListener('mouseenter', function () { moveInk(a); });
  });
  if (nav) nav.addEventListener('mouseleave', function () { moveInk(navLinks[activeIdx]); });

  function onScroll() {
    var y = window.pageYOffset;
    if (hdr) hdr.classList.toggle('is-stuck', y > 8);
    if (totop) totop.classList.toggle('is-on', y > 700);

    if (progBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }

    var probe = y + headerOffset() + 130, act = 0;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i] && sections[i].offsetTop <= probe) act = i;
    }
    if (act !== activeIdx) {
      activeIdx = act;
      navLinks.forEach(function (a, i) { a.classList.toggle('is-active', i === act); });
      moveInk(navLinks[act]);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { onScroll(); moveInk(navLinks[activeIdx]); });
  onScroll();
  setTimeout(function () { moveInk(navLinks[activeIdx < 0 ? 0 : activeIdx]); }, 350);

  if (totop) totop.addEventListener('click', function () { smoothScrollTo(0); });

  /* ---------------------------------------------------------------------
     5. Parallax.
     Escreve em --py e o CSS usa a propriedade `translate`, que é
     independente de `transform` — assim o parallax convive com os
     keyframes que já animam transform no mesmo elemento.
     --------------------------------------------------------------------- */
  var parItems = $$('[data-par]').map(function (el) {
    return { el: el, k: parseFloat(el.dataset.par) || 0 };
  });
  var parTicking = false;

  function parallax() {
    var vh = window.innerHeight;
    parItems.forEach(function (o) {
      var r = o.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var mid = r.top + r.height / 2 - vh / 2;
      o.el.style.setProperty('--py', (mid * o.k).toFixed(1) + 'px');
    });
    parTicking = false;
  }
  window.addEventListener('scroll', function () {
    if (!parTicking) { parTicking = true; raf(parallax); }
  }, { passive: true });
  parallax();

  /* ---------------------------------------------------------------------
     6. Botões magnéticos
     --------------------------------------------------------------------- */
  if (window.matchMedia('(pointer:fine)').matches) {
    $$('.magnet').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.28;
        var y = (e.clientY - r.top - r.height / 2) * 0.34;
        b.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      b.addEventListener('mouseleave', function () { b.style.translate = '0 0'; });
    });
  }

  /* ---------------------------------------------------------------------
     7. Hero: slider de 5s + poeira em canvas
     --------------------------------------------------------------------- */
  var SLIDE_MS = 5000;
  var slides = $$('.slide');
  var dots = $$('#heroDots button');
  var cur = 0, slideTimer = null;

  dots.forEach(function (d) { d.style.setProperty('--dur', SLIDE_MS + 'ms'); });

  function goSlide(n) {
    cur = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === cur); });
    // trocar aria-selected reinicia sozinho a barrinha (o keyframe está
    // preso a [aria-selected="true"]::after)
    dots.forEach(function (d, i) { d.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
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

  /* poeira: pontinhos vermelhos subindo devagar, discretos sobre o claro */
  var cv = $('#dust');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), parts = [], dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0, dustRaf = null;

    function mkPart(spread) {
      return {
        x: Math.random() * W,
        y: spread ? Math.random() * H : H + 12,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.12 + Math.random() * 0.42,
        vx: (Math.random() - 0.5) * 0.2,
        a: 0.06 + Math.random() * 0.22,
        hot: Math.random() > 0.5,
        ph: Math.random() * Math.PI * 2
      };
    }
    function sizeCanvas() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.max(24, Math.min(64, Math.round(W / 24)));
      parts = [];
      for (var i = 0; i < want; i++) parts.push(mkPart(true));
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy; p.ph += 0.018;
        p.x += p.vx + Math.sin(p.ph) * 0.2;
        if (p.y < -14) { parts[i] = mkPart(false); continue; }
        var fade = p.y / H;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hot
          ? 'rgba(225,10,20,' + (p.a * fade).toFixed(3) + ')'
          : 'rgba(14,14,20,' + (p.a * fade * 0.5).toFixed(3) + ')';
        ctx.fill();
      }
      dustRaf = raf(draw);
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    draw();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(dustRaf); dustRaf = null; }
      else if (!dustRaf) draw();
    });
  }

  /* ---------------------------------------------------------------------
     8. Diferenciais: destaque rotativo a cada 3s (pausa no hover)
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
    diffs.forEach(function (c, i) {
      c.addEventListener('mouseenter', function () { dPaused = true; setDiff(i); });
      c.addEventListener('mouseleave', function () { dPaused = false; });
    });
    var dIO = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !dStarted) {
        dStarted = true; setDiff(0);
        dTimer = setInterval(function () { if (!dPaused) setDiff(di + 1); }, 3000);
      }
    }, { threshold: 0.25 });
    dIO.observe($('#diffs'));
  }

  /* ---------------------------------------------------------------------
     9. Carrossel genérico (normas e produtos)
     --------------------------------------------------------------------- */
  function makeCarousel(opts) {
    var view = $(opts.view), track = $(opts.track);
    if (!view || !track) return null;
    var prev = opts.prev && $(opts.prev), next = opts.next && $(opts.next);
    var idx = 0, timer = null, paused = false;

    function step() {
      var card = track.firstElementChild;
      if (!card) return 320;
      var gap = parseFloat(getComputedStyle(track).gap) || 16;
      return card.getBoundingClientRect().width + gap;
    }
    function maxIdx() {
      var n = track.children.length;
      var visible = Math.max(1, Math.floor(view.clientWidth / step()));
      return Math.max(0, n - visible);
    }
    function apply(animate) {
      track.style.transition = animate === false ? 'none' : '';
      track.style.transform = 'translateX(' + (-idx * step()) + 'px)';
      if (prev) prev.disabled = !opts.loop && idx <= 0;
      if (next) next.disabled = !opts.loop && idx >= maxIdx();
    }
    function go(n) {
      var m = maxIdx();
      if (opts.loop) idx = n > m ? 0 : (n < 0 ? m : n);
      else idx = Math.max(0, Math.min(m, n));
      apply(true);
    }
    function start() {
      if (!opts.every) return;
      clearInterval(timer);
      timer = setInterval(function () { if (!paused) go(idx + 1); }, opts.every);
    }

    if (prev) prev.addEventListener('click', function () { go(idx - 1); start(); });
    if (next) next.addEventListener('click', function () { go(idx + 1); start(); });
    view.addEventListener('mouseenter', function () { paused = true; });
    view.addEventListener('mouseleave', function () { paused = false; });
    window.addEventListener('resize', function () { go(idx); });
    apply(false);
    start();

    // arrastar (mouse e toque)
    if (opts.drag) {
      var down = false, startX = 0, startT = 0, moved = 0;
      view.addEventListener('pointerdown', function (e) {
        down = true; moved = 0; startX = e.clientX; startT = -idx * step();
        view.classList.add('is-drag'); track.style.transition = 'none';
        if (view.setPointerCapture) view.setPointerCapture(e.pointerId);
      });
      view.addEventListener('pointermove', function (e) {
        if (!down) return;
        moved = e.clientX - startX;
        track.style.transform = 'translateX(' + (startT + moved) + 'px)';
      });
      var end = function () {
        if (!down) return;
        down = false; view.classList.remove('is-drag'); track.style.transition = '';
        if (Math.abs(moved) > step() * 0.22) go(idx + (moved < 0 ? 1 : -1));
        else apply(true);
      };
      view.addEventListener('pointerup', end);
      view.addEventListener('pointercancel', end);
      view.addEventListener('pointerleave', end);
      view.addEventListener('dragstart', function (e) { e.preventDefault(); });
    }
    return { go: go };
  }

  makeCarousel({ view: '.norms__view', track: '#normTrack', prev: '#normPrev', next: '#normNext', every: 3200, loop: true });
  makeCarousel({ view: '#prodCarou', track: '#prodTrack', prev: '#prodPrev', next: '#prodNext', every: 5200, loop: true, drag: true });

  /* ---------------------------------------------------------------------
     10. Contadores
     --------------------------------------------------------------------- */
  var statsBox = $('#stats');
  if (statsBox) {
    var sIO = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      sIO.disconnect();
      $$('b[data-count]', statsBox).forEach(function (b, i) {
        var to = parseInt(b.dataset.count, 10);
        var pre = b.dataset.pre || '', suf = b.dataset.suffix || '';
        var t0 = null, dur = 1800 + i * 240;
        function tick(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var v = Math.round(to * (1 - Math.pow(1 - p, 3)));
          b.textContent = pre + v.toLocaleString('pt-BR') + suf;
          if (p < 1) raf(tick);
        }
        raf(tick);
      });
    }, { threshold: 0.35 });
    sIO.observe(statsBox);
  }

  /* ---------------------------------------------------------------------
     11. Classes de incêndio: abas + rodízio automático A → B → C → D → K.
     O extintor é um só; o que troca é o selo (triângulo, quadrado, círculo,
     estrela, hexágono), que é a simbologia real de cada classe.
     --------------------------------------------------------------------- */
  var cUi = $('#classes-ui');
  if (cUi) {
    var cTabs = $$('.classes__tabs button', cUi);
    var cPanels = $$('.classes__panel', cUi);
    var cBadges = $$('.badge', cUi);
    var cWrap = $('.classes__panels', cUi);

    /* Todos os painéis são absolutos (senão o que sai e o que entra ficam
       um por cima do outro durante a troca). Como absoluto não empurra o
       contêiner, a altura vem do painel mais alto, medida aqui. */
    function sizePanels() {
      if (!cWrap) return;
      cWrap.style.minHeight = '0px';
      var max = 0;
      cPanels.forEach(function (p) { max = Math.max(max, p.offsetHeight); });
      cWrap.style.minHeight = max + 'px';
    }
    sizePanels();
    window.addEventListener('load', sizePanels);
    var cResize = null;
    window.addEventListener('resize', function () {
      clearTimeout(cResize);
      cResize = setTimeout(sizePanels, 180);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizePanels);
    var cInk = $('#classesInk');
    var cColors = ['#00A24E', '#E10A14', '#1B6FD1', '#EFA400', '#15151D'];
    var ci = 0, cTimer = null, cPaused = false, cStarted = false;

    function setClass(n) {
      ci = (n + cTabs.length) % cTabs.length;
      cTabs.forEach(function (o, j) {
        o.classList.toggle('is-active', j === ci);
        o.setAttribute('aria-selected', j === ci ? 'true' : 'false');
      });
      cPanels.forEach(function (p, j) { p.classList.toggle('is-on', j === ci); });
      cBadges.forEach(function (b, j) { b.classList.toggle('is-on', j === ci); });
      if (cInk) {
        cInk.style.transform = 'translateX(' + (ci * 100) + '%)';
        cInk.style.background = cColors[ci] || 'var(--red)';
      }
    }
    function startClasses() {
      clearInterval(cTimer);
      cTimer = setInterval(function () { if (!cPaused) setClass(ci + 1); }, 3800);
    }

    cTabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setClass(i); startClasses(); });
    });
    cUi.addEventListener('mouseenter', function () { cPaused = true; });
    cUi.addEventListener('mouseleave', function () { cPaused = false; });

    var cIO = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !cStarted) { cStarted = true; startClasses(); }
    }, { threshold: 0.3 });
    cIO.observe(cUi);
  }

  /* ---------------------------------------------------------------------
     12. Brilho que segue o cursor na faixa de clientes
     --------------------------------------------------------------------- */
  var cliGlow = $('#clientsGlow'), cliSec = $('#clientes');
  if (cliGlow && cliSec && window.matchMedia('(pointer:fine)').matches) {
    cliSec.addEventListener('mousemove', function (e) {
      var r = cliSec.getBoundingClientRect();
      cliGlow.style.transform = 'translate(' + (e.clientX - r.left) + 'px,' + (e.clientY - r.top) + 'px)';
    });
  }

  /* ---------------------------------------------------------------------
     13. FAQ: só um aberto por vez + altura animada
     --------------------------------------------------------------------- */
  var faqItems = $$('#faq-ui .faq__i');
  faqItems.forEach(function (d) {
    var sum = d.querySelector('summary');

    function expand(el) {
      el.open = true;
      var b = el.querySelector('.faq__a');
      b.animate([{ height: '0px', opacity: 0 }, { height: b.scrollHeight + 'px', opacity: 1 }],
        { duration: 440, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    function collapse(el) {
      var b = el.querySelector('.faq__a');
      var an = b.animate([{ height: b.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: 320, easing: 'cubic-bezier(.16,.84,.32,1)' });
      an.onfinish = function () { el.open = false; };
    }

    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var willOpen = !d.open;
      faqItems.forEach(function (o) { if (o !== d && o.open) collapse(o); });
      if (willOpen) expand(d); else collapse(d);
    });
  });

  /* ---------------------------------------------------------------------
     14. Formulário → WhatsApp (sem backend)
     --------------------------------------------------------------------- */
  var WHATS = '5511944578141'; // Valéria (extintores/mangueiras) — só usado se o select sumir
  var form = $('#form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, bad = false;
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

      // quem recebe é escolha de quem preenche, não adivinhação nossa
      var destino = (f.destino && f.destino.value) || WHATS;
      window.open('https://wa.me/' + destino + '?text=' + encodeURIComponent(txt), '_blank', 'noopener');
    });
    $$('#form input, #form textarea').forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('is-bad'); });
    });
  }

  /* ---------------------------------------------------------------------
     15. Aviso de cookies + Consent Mode.
     A escolha fica no localStorage do próprio visitante — não há servidor
     aqui para guardar isso. Enquanto ele não decide, o consentimento
     declarado no <head> segue negado e o Google não grava cookie de
     publicidade.
     --------------------------------------------------------------------- */
  var CK_KEY = 'hibero:cookies';
  var ck = $('#ck');

  function lerEscolha() {
    try { return localStorage.getItem(CK_KEY); } catch (e) { return null; }
  }
  function aplicarConsentimento(escolha) {
    if (typeof window.gtag !== 'function') return;
    var v = escolha === 'aceito' ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v
    });
  }
  function mostrarBanner() {
    if (!ck) return;
    ck.hidden = false;
    // 2 quadros para o transform sair do estado inicial e a entrada animar
    raf(function () { raf(function () { ck.classList.add('is-on'); }); });
  }
  function esconderBanner() {
    if (!ck) return;
    ck.classList.remove('is-on');
    setTimeout(function () { ck.hidden = true; }, 620);
  }

  if (ck) {
    if (!lerEscolha()) setTimeout(mostrarBanner, 900);

    $$('#ck [data-ck]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var escolha = btn.dataset.ck;
        try { localStorage.setItem(CK_KEY, escolha); } catch (e) {}
        aplicarConsentimento(escolha);
        esconderBanner();
      });
    });
  }

  // botão "rever minha escolha", na página da política
  var reabrir = $('#reabrirCookies');
  if (reabrir) {
    reabrir.addEventListener('click', function () {
      try { localStorage.removeItem(CK_KEY); } catch (e) {}
      aplicarConsentimento('recusado');
      mostrarBanner();
    });
  }

  /* ---------------------------------------------------------------------
     16. Miudezas
     --------------------------------------------------------------------- */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();

})();
