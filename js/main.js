/* Opus 5.5, explicado — interações e movimento (GSAP 3.13) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reduceMQ.matches;
  const G = window.gsap;
  const hasGsap = !!(G && window.ScrollTrigger);
  const fmt = (n, d = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  if (hasGsap) {
    G.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, Flip, Draggable, DrawSVGPlugin, CustomEase);
    CustomEase.create('opusOut', '0.16, 1, 0.3, 1');
    CustomEase.create('opusInOut', '0.76, 0, 0.24, 1');
  }

  const top = $('[data-top]');
  const opening = $('.opening');

  /* ------------------------------------------------------------
     Rolagem suave (só com mouse e quando o movimento é permitido)
     ------------------------------------------------------------ */
  let smoother = null;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasGsap && !reduced() && finePointer) {
    smoother = ScrollSmoother.create({ wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: 0.4, effects: false, smoothTouch: false });
  }

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 ? $(id) : null;
      if (!target) return;
      if (smoother) {
        e.preventDefault();
        smoother.scrollTo(target, true, 'top top');
        history.replaceState(null, '', id);
      }
    });
  });

  /* ------------------------------------------------------------
     Preloader: a frase enrolada perde uma palavra a cada passo do
     carregamento até sobrar "Opus 5.5"; depois a tela escura encolhe
     e vira a faixa do título.
     ------------------------------------------------------------ */
  const loaderEl = $('[data-loader]');
  const announceLoaded = () => {
    if (window.__opusLoaded) return;
    window.__opusLoaded = true;
    dispatchEvent(new Event('opus:loaded'));
  };
  const loaderDone = (() => {
    if (!loaderEl) { announceLoaded(); return Promise.resolve(false); }
    if (!hasGsap || reduced() || location.hash.length > 1 || window.__opusLoaded) {
      loaderEl.remove();
      announceLoaded();
      return Promise.resolve(false);
    }

    let seen = false;
    try { seen = sessionStorage.getItem('opus-loader') === '1'; sessionStorage.setItem('opus-loader', '1'); } catch { /* sem armazenamento: versão completa */ }
    const MIN = seen ? 0.8 : 1.7; // segundos mínimos para a frase ser lida
    const GAP = seen ? 0.045 : innerWidth < 600 ? 0.12 : 0.09; // intervalo entre cortes (mais calmo no celular)

    // a rolagem fica parada, sem esconder a barra (o layout não pula)
    const keys = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End']);
    const stopWheel = (e) => e.preventDefault();
    const stopKeys = (e) => { if (keys.has(e.key)) e.preventDefault(); if (e.key === 'Escape') finish(); };
    addEventListener('wheel', stopWheel, { passive: false });
    addEventListener('touchmove', stopWheel, { passive: false });
    addEventListener('keydown', stopKeys);
    if (smoother) smoother.paused(true);
    const unblock = () => {
      removeEventListener('wheel', stopWheel);
      removeEventListener('touchmove', stopWheel);
      removeEventListener('keydown', stopKeys);
      if (smoother) smoother.paused(false);
    };

    const line = $('.loader__line', loaderEl);
    const note = $('[data-loader-note]', loaderEl);
    const words = $$('.loader__w', loaderEl);
    const fillers = words.filter((w) => !w.classList.contains('is-key'));
    const t0 = performance.now();

    // o que a página realmente espera
    const wait = (promise, ms) => Promise.race([promise, new Promise((r) => setTimeout(r, ms))]);
    const tasks = [
      { label: 'Carregando as fontes', p: document.fonts ? document.fonts.ready : Promise.resolve() },
      { label: 'Carregando as imagens', p: document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true })) },
      { label: 'Montando as cenas 3D', p: new Promise((r) => { if (window.__opus3dReady) r(); else addEventListener('opus:3d-ready', r, { once: true }); }) },
    ];
    tasks.forEach((t) => { t.done = false; wait(t.p, 4500).then(() => { t.done = true; }); });

    let resolveDone;
    const done = new Promise((r) => { resolveDone = r; });
    done.then(announceLoaded);
    let removed = 0;
    let lastCut = 0;
    let finished = false;

    const visibleWords = () => words.filter((w) => !w.classList.contains('is-gone'));
    const cut = (w) => {
      w.classList.add('is-cut');
      G.to(w, {
        autoAlpha: 0, duration: 0.16, delay: 0.08, ease: 'power1.in',
        onComplete: () => {
          const state = Flip.getState(visibleWords());
          w.classList.add('is-gone');
          Flip.from(state, { duration: 0.55, ease: 'opusOut', overwrite: 'auto' });
        },
      });
    };

    const collapse = () => {
      const slot = $('.hero__slot');
      const r = slot.getBoundingClientRect();
      const box = loaderEl.getBoundingClientRect();
      const inView = r.width > 40 && r.bottom > 0 && r.top < innerHeight;
      const tl = G.timeline({
        onComplete: () => { loaderEl.remove(); unblock(); ScrollTrigger.refresh(); },
      });
      tl.to('.loader__foot', { autoAlpha: 0, duration: 0.25 }, 0);
      if (inView) {
        // "Opus 5.5" vai para dentro da faixa, e a tela escura encolhe até ela
        const lr = line.getBoundingClientRect();
        const scale = Math.min(1, (r.height * 0.46) / lr.height, (r.width * 0.8) / lr.width);
        tl.to(line, {
          x: r.left + r.width / 2 - (lr.left + lr.width / 2),
          y: r.top + r.height / 2 - (lr.top + lr.height / 2),
          scale, duration: 1.05, ease: 'opusInOut',
        }, 0.1)
          .fromTo(loaderEl, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }, {
            clipPath: `inset(${r.top - box.top}px ${box.right - r.right}px ${box.bottom - r.bottom}px ${r.left - box.left}px round 14px)`,
            duration: 1.1, ease: 'opusInOut',
          }, 0.1)
          .add(() => resolveDone(true), 0.35)
          .to(line, { autoAlpha: 0, duration: 0.3 }, 1.05);
      } else {
        tl.to(loaderEl, { autoAlpha: 0, duration: 0.45 }, 0).add(() => resolveDone(true), 0);
      }
    };

    function tick() {
      const el = (performance.now() - t0) / 1000;
      const ready = tasks.filter((t) => t.done).length;
      const timeFrac = Math.min(1, el / MIN);
      const frac = ready === tasks.length ? timeFrac : Math.min(timeFrac, (ready / tasks.length) * 0.85 + timeFrac * 0.1);
      const target = Math.floor(frac * fillers.length);
      const pending = tasks.find((t) => !t.done);
      note.textContent = pending ? pending.label : 'Cortando a enrolação';
      if (removed < target && el - lastCut >= GAP) { cut(fillers[removed]); removed += 1; lastCut = el; }
      if (removed >= fillers.length && ready === tasks.length && el - lastCut > 0.35) finish();
    }

    function finish() {
      if (finished) return;
      finished = true;
      G.ticker.remove(tick);
      note.textContent = 'Pronto';
      // o que ainda sobrou de enrolação sai de uma vez
      const rest = fillers.filter((w) => !w.classList.contains('is-gone'));
      if (rest.length) {
        G.killTweensOf(rest);
        const state = Flip.getState(visibleWords());
        rest.forEach((w) => w.classList.add('is-gone'));
        Flip.from(state, { duration: 0.45, ease: 'opusOut', overwrite: 'auto' });
        G.delayedCall(0.5, collapse);
      } else G.delayedCall(0.2, collapse);
    }

    G.ticker.add(tick);
    $('[data-loader-skip]', loaderEl).addEventListener('click', finish);
    setTimeout(finish, 8000);
    return done;
  })();

  /* ------------------------------------------------------------
     A faixa do título: tarefas reais do anúncio, uma por vez
     ------------------------------------------------------------ */
  const tickerItems = $$('.strip__item');
  let tickerIndex = 0;
  let tickerTimer = null;
  const tick = () => {
    const cur = tickerItems[tickerIndex];
    tickerIndex = (tickerIndex + 1) % tickerItems.length;
    const next = tickerItems[tickerIndex];
    if (hasGsap) {
      G.timeline()
        .to(cur, { yPercent: -45, autoAlpha: 0, duration: 0.45, ease: 'power2.in' })
        .fromTo(next, { yPercent: 55, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'opusOut' }, '-=0.12');
    } else {
      cur.classList.remove('is-on');
      next.classList.add('is-on');
    }
  };
  const startTicker = () => { if (!tickerTimer && !reduced()) tickerTimer = setInterval(tick, 2900); };
  const stopTicker = () => { clearInterval(tickerTimer); tickerTimer = null; };
  if (tickerItems.length > 1) {
    new IntersectionObserver(([e]) => (e.isIntersecting ? startTicker() : stopTicker())).observe($('.hero__slot'));
  }

  /* ------------------------------------------------------------
     Demo "menos papo": a mesma resposta, com e sem enrolação (Flip)
     ------------------------------------------------------------ */
  const answer = $('[data-answer]');
  let autoplay = () => {};
  if (answer) {
    $$('[data-role]', answer).forEach((chunk) => {
      const words = chunk.textContent.trim().split(/\s+/);
      chunk.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    });
    const words = $$('.w', answer);
    const buttons = $$('.toggle__btn');
    const count = $('[data-count]');
    const modelLabel = $('[data-model-label]');
    const capChunk = $('[data-cap]', answer);
    const capWord = $('.w', capChunk);
    const capLower = capWord.textContent;
    const capUpper = capChunk.dataset.cap;
    let mode = 'long';
    let touched = false;
    let played = false;
    const countWords = (m) => words.filter((w) => w.textContent !== '›' && (m === 'long' || !w.closest('[data-role="filler"]'))).length;
    count.textContent = countWords('long');

    const setMode = (m) => {
      if (m === mode) return;
      const animate = hasGsap && !reduced();
      const state = animate ? Flip.getState(words) : null;
      const h0 = answer.offsetHeight;
      mode = m;
      answer.classList.toggle('is-short', m === 'short');
      answer.classList.toggle('is-long', m === 'long');
      capWord.textContent = m === 'short' ? capUpper : capLower;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
      modelLabel.textContent = m === 'short' ? 'estilo Opus 5.5' : 'estilo prolixo';
      const n = countWords(m);
      if (!animate) { count.textContent = n; return; }
      const h1 = answer.offsetHeight;
      G.fromTo(answer, { height: h0 }, { height: h1, duration: 0.9, ease: 'opusOut', clearProps: 'height' });
      Flip.from(state, {
        duration: 0.9,
        ease: 'opusOut',
        absolute: true,
        stagger: 0.003,
        onEnter: (els) => G.fromTo(els, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.3, stagger: 0.008, ease: 'opusOut' }),
        onLeave: (els) => G.to(els, { autoAlpha: 0, y: -8, duration: 0.3, stagger: 0.004, ease: 'power1.in' }),
      });
      const o = { v: Number(count.textContent) || 0 };
      G.to(o, { v: n, duration: 0.9, ease: 'opusOut', onUpdate: () => { count.textContent = Math.round(o.v); } });
    };
    buttons.forEach((b) => b.addEventListener('click', () => { touched = true; setMode(b.dataset.mode); }));
    autoplay = () => {
      if (played || touched) return;
      played = true;
      setTimeout(() => { if (!touched) setMode('short'); }, 700);
    };
  }

  /* ------------------------------------------------------------
     Comparativo: as provas e os resultados publicados
     ------------------------------------------------------------ */
  const MODELS = ['Opus 5.5', 'Fable 5.1', 'Opus 5', 'GPT-6 Astra', 'GPT-5.6 Sol'];
  const BENCH = [
    { n: 'Terminal-Bench 4.0', w: 'Programar sozinho usando o terminal, aquela tela de comandos do computador.', v: [66.4, 55.8, 52.3, 57.9, 37.3] },
    { n: 'FrontierCode v1.1', w: 'Resolver problemas de programação difíceis, do tipo que trava engenheiros experientes.', v: [54.4, 50.3, 48.0, 53.3, 47.5] },
    { n: 'CursorBench 4.0', w: 'Trabalhar dentro de um editor de código, como um programador no dia a dia.', v: [57.8, 51.8, 46.6, null, 41.7] },
    { n: 'GDPval-AA v2.1', w: 'Trabalho de escritório de verdade: relatórios, planilhas e apresentações. A nota é Elo, como no ranking do xadrez.', v: [1846, 1735, 1708, 1542, 1588], elo: true },
    { n: 'AutomationBench', w: 'Automatizar processos de empresa, passo a passo, passando por vários sistemas.', v: [40.0, 31.4, 26.9, 41.4, 28.8] },
    { n: 'Humanity’s Last Exam', w: 'Perguntas dificílimas de várias áreas, escritas por especialistas. Feita com acesso a ferramentas.', v: [67.7, 65.6, 63.6, 57.2, null] },
    { n: 'Terminal-Bench-Science 0.1', w: 'Fazer pesquisa científica como agente: rodar análises e experimentos no computador.', v: [58.7, 52.6, 29.0, 64.6, 22.4] },
    { n: 'OSWorld 2.1', w: 'Usar o computador como uma pessoa: clicar, abrir programas e preencher telas. Resultado parcial.', v: [81.8, 80.7, 74.0, null, null] },
    { n: 'Chartography', w: 'Ler e interpretar gráficos, com acesso a ferramentas.', v: [89.0, 88.4, 83.4, null, null] },
  ];
  const pts = (d, elo) => {
    const s = elo ? String(Math.round(d)) : fmt(d);
    return `${s} ${d < 2 ? 'ponto' : 'pontos'}`;
  };
  const verdict = (b) => {
    const gpts = [3, 4].filter((k) => b.v[k] != null).sort((a, c) => b.v[c] - b.v[a]);
    if (!gpts.length) return 'Sem resultado publicado do GPT nesta prova. Entre os Claude, o Opus 5.5 lidera.';
    const best = gpts[0];
    const d = b.v[0] - b.v[best];
    return d >= 0
      ? `Opus 5.5 na frente, ${pts(d, b.elo)} acima do melhor GPT (${MODELS[best]}).`
      : `${MODELS[best]} na frente, ${pts(-d, b.elo)} acima do Opus 5.5.`;
  };

  const score = $('[data-score]');
  const nameButtons = $$('[data-names] button');
  let benchIndex = 0;
  let benchTouched = false;
  const renderBench = (i, animate = true) => {
    const b = BENCH[i];
    benchIndex = i;
    $('[data-score-name]').textContent = b.n;
    $('[data-score-what]').textContent = b.w;
    $('[data-score-verdict]').textContent = verdict(b);
    nameButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(Number(btn.dataset.b) === i)));
    const max = b.elo ? Math.max(...b.v.filter((x) => x != null)) * 1.04 : 100;
    $$('.bar', score).forEach((li, k) => {
      const v = b.v[k];
      const fill = $('.bar__fill', li);
      li.classList.toggle('is-none', v == null);
      $('.bar__val', li).textContent = v == null ? 'sem dado' : b.elo ? String(v) : `${fmt(v)}%`;
      const s = v == null ? 0 : v / max;
      if (hasGsap && animate && !reduced()) G.to(fill, { scaleX: s, duration: 0.9, delay: k * 0.05, ease: 'opusOut', overwrite: true });
      else fill.style.transform = `scaleX(${s})`;
    });
  };
  if (score) {
    nameButtons.forEach((btn) => btn.addEventListener('click', () => { benchTouched = true; renderBench(Number(btn.dataset.b)); }));
    let cycle = null;
    const startCycle = () => {
      if (cycle || benchTouched || reduced()) return;
      cycle = setInterval(() => { if (benchTouched) return stopCycle(); renderBench((benchIndex + 1) % BENCH.length); }, 2600);
    };
    const stopCycle = () => { clearInterval(cycle); cycle = null; };
    new IntersectionObserver(([e]) => (e.isIntersecting ? startCycle() : stopCycle()), { threshold: 0.4 }).observe($('.proof__body'));
    score.addEventListener('pointerenter', () => { stopCycle(); });
    score.addEventListener('pointerleave', () => { startCycle(); });
  }

  /* ------------------------------------------------------------
     Seletor de esforço (Draggable + DrawSVG)
     ------------------------------------------------------------ */
  const dial = $('[data-dial]');
  let dialIntro = null;
  if (dial) {
    const face = $('[data-dial-face]', dial);
    const knob = $('[data-dial-knob]', dial);
    const arc = $('[data-dial-arc]', dial);
    const nameEl = $('[data-dial-name]', dial);
    const meter = $('[data-meter]', dial);
    const texts = $$('[data-level-text]', dial);
    const steps = $$('[data-level]', dial);
    const NAMES = ['Baixo', 'Médio', 'Alto', 'Extra-alto', 'Máximo'];
    const angle = (l) => -120 + (l - 1) * 60;
    const levelOf = (a) => Math.min(5, Math.max(1, Math.round((a + 120) / 60) + 1));
    let level = 2;

    const show = (l) => {
      nameEl.textContent = NAMES[l - 1];
      face.setAttribute('aria-valuenow', String(l));
      face.setAttribute('aria-valuetext', NAMES[l - 1]);
      texts.forEach((t) => t.classList.toggle('is-on', Number(t.dataset.levelText) === l));
      steps.forEach((s) => s.setAttribute('aria-pressed', String(Number(s.dataset.level) === l)));
      if (hasGsap) G.to(meter, { scaleX: l / 5, duration: 0.6, ease: 'opusOut', overwrite: true });
      else meter.style.transform = `scaleX(${l / 5})`;
    };
    const syncArc = () => {
      if (!hasGsap) return;
      const a = G.getProperty(knob, 'rotation');
      G.set(arc, { drawSVG: `0% ${Math.max(0.4, ((a + 120) / 240) * 100)}%` });
    };
    const go = (l, animate = true) => {
      level = Math.min(5, Math.max(1, l));
      show(level);
      if (!hasGsap) { knob.setAttribute('transform', `rotate(${angle(level)} 160 160)`); return; }
      G.to(knob, { rotation: angle(level), svgOrigin: '160 160', duration: animate && !reduced() ? 0.7 : 0, ease: 'opusOut', onUpdate: syncArc, onComplete: syncArc, overwrite: true });
    };

    if (hasGsap) {
      G.set(knob, { svgOrigin: '160 160', rotation: angle(level) });
      syncArc();
      Draggable.create(knob, {
        type: 'rotation',
        trigger: face,
        bounds: { minRotation: -120, maxRotation: 120 },
        onPress() { G.killTweensOf(knob); },
        onDrag() {
          syncArc();
          const l = levelOf(this.rotation);
          if (l !== level) { level = l; show(l); }
        },
        onRelease() { go(levelOf(this.rotation)); },
      });
      dialIntro = () => {
        if (reduced()) return;
        G.fromTo(knob, { rotation: -120 }, { rotation: angle(level), svgOrigin: '160 160', duration: 1.4, ease: 'opusOut', delay: 0.2, onUpdate: syncArc });
      };
    }
    steps.forEach((s) => s.addEventListener('click', () => go(Number(s.dataset.level))));
    face.addEventListener('keydown', (e) => {
      const map = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
      if (e.key in map) { e.preventDefault(); go(level + map[e.key]); }
      if (e.key === 'Home') { e.preventDefault(); go(1); }
      if (e.key === 'End') { e.preventDefault(); go(5); }
    });
    show(level);
  }

  /* ------------------------------------------------------------
     Copiar link, vídeo, perguntas
     ------------------------------------------------------------ */
  const copyBtn = $('[data-copy]');
  if (copyBtn) {
    const label = $('[data-copy-label]', copyBtn);
    const setLabel = (t) => { label.textContent = t; label.dataset.label = t; };
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(copyBtn.dataset.url || location.href.split('#')[0]); setLabel('Link copiado'); }
      catch { setLabel('Não deu para copiar'); }
      setTimeout(() => setLabel('Copiar o link'), 2600);
    });
  }

  const loop = $('[data-loop]');
  if (loop) {
    if (reduced()) { loop.removeAttribute('autoplay'); loop.pause(); }
    else new IntersectionObserver(([e]) => (e.isIntersecting ? loop.play().catch(() => {}) : loop.pause())).observe(loop);
  }

  $$('.faq details').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (d.open && hasGsap && !reduced()) G.from($('.faq__a', d), { autoAlpha: 0, y: -10, duration: 0.45, ease: 'opusOut' });
    });
  });

  // a linha "leu quase tudo" troca de cor onde cruza a foto
  const l2 = $('.intro__l2');
  const photoFrame = $('.intro__photo .pic__frame');
  const setSplit = () => {
    if (!l2 || !photoFrame) return;
    const a = l2.getBoundingClientRect();
    const p = photoFrame.getBoundingClientRect();
    const overlaps = a.bottom > p.top + 4 && a.right > p.left;
    l2.style.setProperty('--split', overlaps ? `${Math.max(0, p.left - a.left)}px` : '300vw');
  };
  setSplit();
  addEventListener('resize', setSplit);
  if (document.fonts) document.fonts.ready.then(setSplit);

  /* ------------------------------------------------------------
     Sem GSAP: a página já está completa; só ligamos o essencial
     ------------------------------------------------------------ */
  if (!hasGsap) {
    if (answer) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { autoplay(); o.disconnect(); } }, { threshold: 0.6 }).observe(answer);
    return;
  }

  /* ------------------------------------------------------------
     Cabeçalho: cor por capítulo e some ao descer
     ------------------------------------------------------------ */
  const setTheme = (t) => { if (top.dataset.theme !== t) top.dataset.theme = t; };
  $$('main > section[data-theme], footer[data-theme]').forEach((sec) => {
    ScrollTrigger.create({ trigger: sec, start: 'top 40px', end: 'bottom 40px', onToggle: (s) => { if (s.isActive) setTheme(sec.dataset.theme); } });
  });
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (s) => {
      top.classList.toggle('is-hidden', s.direction === 1 && s.scroll() > innerHeight * 0.5 && !top.contains(document.activeElement));
      top.classList.toggle('is-solid', s.scroll() > 40);
    },
  });

  /* ------------------------------------------------------------
     Movimento (só quando o sistema permite)
     ------------------------------------------------------------ */
  const mm = G.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // 1. Abertura em 1,2 s: o nome sobe, a faixa abre como obturador
    const heroWords = $$('[data-hero-word]');
    const split = SplitText.create(heroWords, { type: 'chars', mask: 'chars' });
    const heroIn = G.timeline({ defaults: { ease: 'opusOut' }, paused: true })
      .from(split.chars, { yPercent: 115, duration: 1, stagger: 0.035 }, 0.05)
      .from('.hero__lead, .hero__cta', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.07 }, 0.45)
      .from(top.children, { autoAlpha: 0, y: -12, duration: 0.5, stagger: 0.05 }, 0.35);
    loaderDone.then((viaLoader) => {
      // sem preloader, a faixa abre como obturador; com ele, a faixa já é a tela que encolheu
      if (!viaLoader) heroIn.fromTo('.hero__slot', { clipPath: 'inset(0% 50% 0% 50% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.1, ease: 'opusInOut' }, 0.1);
      heroIn.play();
    });

    // Revelação segura: o estado inicial só é aplicado quando o elemento está
    // prestes a entrar na tela (borda de baixo), e a animação toca logo depois.
    // Conteúdo longe da tela nunca fica escondido.
    const reveal = (trigger, build, start = 'top 88%') => {
      let tl = null;
      const make = () => { if (!tl) { tl = build(); tl.pause(0); } return tl; };
      ScrollTrigger.create({ trigger, start: 'top bottom', once: true, onEnter: make });
      ScrollTrigger.create({ trigger, start, once: true, onEnter: () => make().play() });
    };

    const setupReveals = () => {
      // 2. Títulos de seção: linhas sobem de trás da própria linha de base
      $$('[data-split]').forEach((el) => {
        reveal(el, () => {
          const s = SplitText.create(el, { type: 'lines' });
          return G.timeline({ onComplete: () => s.revert() })
            .fromTo(s.lines,
              { yPercent: 32, clipPath: 'inset(100% -5% -15% -5%)' },
              { yPercent: 0, clipPath: 'inset(-15% -5% -15% -5%)', duration: 0.8, stagger: 0.08, ease: 'opusOut' });
        });
      });

      // 3. Texto e blocos: chegam em ordem de leitura, cada um com um pequeno atraso
      $$('[data-rise]').forEach((el) => {
        const sibs = $$('[data-rise]', el.closest('section, footer') || document.body);
        const i = Math.max(0, sibs.indexOf(el));
        reveal(el, () => G.timeline().fromTo(el, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.85, delay: Math.min(i, 3) * 0.07, ease: 'opusOut' }), 'top 92%');
      });

      // 4. A foto da biblioteca abre como obturador (o momento assinatura da página)
      reveal('.intro', () => G.timeline()
        .fromTo('[data-intro-line]', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, stagger: 0.1, ease: 'opusOut' }, 0)
        .fromTo('.intro__photo .pic__frame', { clipPath: 'inset(0% 100% 0% 0% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 1.25, ease: 'opusInOut', onComplete: setSplit }, 0.1)
        .fromTo('.intro__photo img', { scale: 1.32 }, { scale: 1.12, duration: 1.6, ease: 'power3.out' }, 0.1)
        .fromTo('.intro__photo figcaption', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'opusOut' }, 0.8), 'top 72%');

      // 5. As outras imagens assentam ao entrar
      $$('[data-pic]').forEach((fig) => {
        if (fig.classList.contains('intro__photo')) return;
        const frame = $('.pic__frame', fig);
        const media = $('img, video', frame);
        reveal(fig, () => G.timeline()
          .fromTo(frame, { clipPath: 'inset(16% 0% 16% 0% round 14px)', autoAlpha: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', autoAlpha: 1, duration: 1.1, ease: 'opusOut' }, 0)
          .fromTo(media, { scale: 1.32 }, { scale: 1.12, duration: 1.5, ease: 'power3.out' }, 0)
          .fromTo($('figcaption', fig), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'opusOut' }, 0.35));
      });

      // 7. Seletor de esforço: liga girando até o nível padrão
      if (dialIntro) ScrollTrigger.create({ trigger: dial, start: 'top 80%', once: true, onEnter: dialIntro });

      // 8. Números que rolam até o valor
      $$('[data-roll]').forEach((dt) => {
        const target = parseFloat(dt.dataset.roll);
        const whole = $('.fig__whole', dt);
        const dec = $('.fig__dec', dt);
        const decimal = target % 1 !== 0;
        const o = { v: 0 };
        const paint = () => {
          if (decimal) { whole.textContent = Math.floor(o.v); dec.textContent = ',' + Math.floor((o.v % 1) * 10 + 1e-6); }
          else whole.textContent = Math.round(o.v);
        };
        reveal(dt.parentElement, () => G.timeline().fromTo(o, { v: 0 }, {
          v: target, duration: 1.6, ease: 'power3.out', onUpdate: paint,
          onComplete: () => { whole.textContent = Math.floor(target); if (decimal) dec.textContent = ',' + String(target).split('.')[1]; },
        }), 'top 90%');
      });

      // 9. Barras do comparativo crescem ao entrar
      reveal(score, () => G.timeline().from($$('.bar__fill', score), { scaleX: 0, duration: 1.1, stagger: 0.07, ease: 'opusOut', immediateRender: true }), 'top 80%');

      // 10. O preço antigo rola para o novo
      const roll = $('[data-price-roll]');
      reveal('.price', () => {
        G.set(roll, { y: 0, yPercent: 0 });
        return G.timeline()
          .fromTo('[data-price-line]', { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.1, ease: 'opusOut' })
          .fromTo('.price__tag', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', duration: 0.7, ease: 'opusInOut' }, 0.25)
          .to(roll, { yPercent: -50, duration: 0.9, ease: 'opusInOut' }, 1.05);
      }, 'top 72%');
    };
    if (document.fonts && document.fonts.status !== 'loaded') {
      let done = false;
      const go = () => { if (!done) { done = true; setupReveals(); ScrollTrigger.refresh(); } };
      document.fonts.ready.then(go);
      setTimeout(go, 1500);
    } else setupReveals();

    // 6. Fotos derivam devagar dentro da moldura
    $$('[data-drift]').forEach((img) => {
      G.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.closest('.pic__frame'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // 11. A pergunta final chega pelas duas bordas
    G.fromTo('.cta__line--top', { xPercent: -14 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top top', scrub: true } });
    G.fromTo('.cta__line--bottom', { xPercent: 14 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top top', scrub: true } });

    // 12. O nome sobe no rodapé, cortado pela borda
    G.fromTo('[data-foot-mark]', { yPercent: 55 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    return () => { split.revert(); };
  });

  // A abertura vira uma cena: a faixa do título se abre na conversa inteira
  mm.add('(min-width: 900px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)', () => {
    const slot = $('.hero__slot');
    const demo = $('.demo');
    const words = $$('[data-hero-word]');
    const parts = $$('[data-part]', demo);
    opening.classList.add('is-scene');

    const inset = () => {
      const o = opening.getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      return `inset(${r.top - o.top}px ${o.right - r.right}px ${o.bottom - r.bottom}px ${r.left - o.left}px round 14px)`;
    };

    // a conversa fica escondida enquanto a faixa abre na carga da página
    G.set(demo, { autoAlpha: 0 });
    loaderDone.then(() => G.delayedCall(1.15, () => G.set(demo, { autoAlpha: 1 })));

    const tl = G.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: opening,
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (s) => {
          setTheme(s.progress > 0.3 ? 'dark' : 'orange');
          if (s.progress > 0.78) autoplay();
        },
        onLeaveBack: () => setTheme('orange'),
        onEnterBack: () => setTheme('dark'),
      },
    });
    tl.fromTo(demo, { clipPath: inset }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.6, ease: 'power2.inOut' }, 0)
      .fromTo('.hero__lead, .hero__cta', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, duration: 0.12, immediateRender: false }, 0)
      .to(slot, { autoAlpha: 0, duration: 0.16 }, 0.04)
      .to(words[0], { xPercent: -170, duration: 0.55, ease: 'power2.in' }, 0)
      .to(words[1], { xPercent: 200, duration: 0.55, ease: 'power2.in' }, 0)
      .from(parts, { y: 48, autoAlpha: 0, duration: 0.22, stagger: 0.05, ease: 'power2.out' }, 0.42)
      .to({}, { duration: 0.25 });

    return () => { opening.classList.remove('is-scene'); };
  });

  // Fora da cena (celular, janela baixa ou movimento reduzido): a conversa é uma seção comum
  mm.add('(max-width: 899px), (max-height: 619px), (prefers-reduced-motion: reduce)', () => {
    ['.hero', '.demo'].forEach((sel) => {
      const sec = $(sel);
      ScrollTrigger.create({ trigger: sec, start: 'top 40px', end: 'bottom 40px', onToggle: (s) => { if (s.isActive) setTheme(sec.dataset.theme); } });
    });
    ScrollTrigger.create({ trigger: answer, start: 'top 75%', once: true, onEnter: () => autoplay() });
    if (!reduced()) G.from($$('[data-part]', $('.demo')), { y: 30, autoAlpha: 0, duration: 0.85, stagger: 0.08, ease: 'opusOut', scrollTrigger: { trigger: '.demo', start: 'top 75%', once: true } });
  });

  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
