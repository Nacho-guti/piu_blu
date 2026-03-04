/* ─────────────────────────────────────────
   piu blu — app.js
   Scroll-driven vending machine experience
───────────────────────────────────────── */

'use strict';

// ─── CONFIG ───────────────────────────────
const FRAME_COUNT = 169;
const FRAME_EXT   = 'jpg';
const FRAME_SPEED = 2.0;    // animation completes at ~50% scroll
const IMAGE_SCALE = 0.72;   // pulled in — gives clear side zones for text
const BG_COLOR    = '#ffffff'; // matches video background exactly

// ─── ELEMENTS ─────────────────────────────
const canvas        = document.getElementById('canvas');
const ctx           = canvas.getContext('2d');
const hero          = document.getElementById('hero');
const scrollCont    = document.getElementById('scroll-container');
const loader        = document.getElementById('loader');
const loaderBar     = document.getElementById('loader-bar');
const loaderPct     = document.getElementById('loader-percent');
const siteHeader    = document.getElementById('site-header');
const marqueeWrap   = document.getElementById('marquee');
const marqueeText   = marqueeWrap.querySelector('.marquee-text');

// ─── STATE ────────────────────────────────
const frames = new Array(FRAME_COUNT).fill(null);
let loadedCount  = 0;
let currentFrame = 0;


/* ═══════════════════════════════════════
   CANVAS
═══════════════════════════════════════ */

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w   = window.innerWidth;
  const h   = window.innerHeight;
  canvas.width        = w * dpr;
  canvas.height       = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFrame(currentFrame);
}

function drawFrame(index) {
  const img = frames[index];
  const w   = window.innerWidth;
  const h   = window.innerHeight;

  // Always fill with page bg — ensures seamless blend with white background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  if (!img || !img.complete || !img.naturalWidth) return;

  const iw    = img.naturalWidth;
  const ih    = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * IMAGE_SCALE;
  const dw    = iw * scale;
  const dh    = ih * scale;
  const dx    = (w - dw) / 2;
  const dy    = (h - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}


/* ═══════════════════════════════════════
   PRELOADER — Two-phase loading
═══════════════════════════════════════ */

function loadFrames() {
  return new Promise(resolve => {
    // Load all frames, draw first immediately when ready
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img    = new Image();
      const padded = String(i).padStart(4, '0');
      img.src = `frames/frame_${padded}.${FRAME_EXT}`;
      frames[i - 1] = img;

      img.onload = () => {
        loadedCount++;
        const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
        loaderBar.style.width     = pct + '%';
        loaderPct.textContent     = pct + '%';

        // Draw first frame as soon as it's ready
        if (i === 1) drawFrame(0);

        if (loadedCount === FRAME_COUNT) resolve();
      };

      img.onerror = () => {
        // Count errors too so we don't hang
        loadedCount++;
        if (loadedCount === FRAME_COUNT) resolve();
      };
    }
  });
}


/* ═══════════════════════════════════════
   LENIS SMOOTH SCROLL
═══════════════════════════════════════ */

function initLenis() {
  const lenis = new Lenis({
    duration:    1.2,
    easing:      t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}


/* ═══════════════════════════════════════
   HERO FADE — disappears as scroll begins
═══════════════════════════════════════ */

function initHeroFade() {
  ScrollTrigger.create({
    trigger:    scrollCont,
    start:      'top top',
    end:        'bottom bottom',
    onUpdate(self) {
      const p = self.progress;
      // Fade out over the first 8% of scroll
      const opacity = Math.max(0, 1 - p / 0.08);
      hero.style.opacity = opacity;
    },
  });
}


/* ═══════════════════════════════════════
   FRAME → SCROLL BINDING
═══════════════════════════════════════ */

function initFrameScroll() {
  ScrollTrigger.create({
    trigger: scrollCont,
    start:   'top top',
    end:     'bottom bottom',
    scrub:   true,
    onUpdate(self) {
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(
        Math.floor(accelerated * FRAME_COUNT),
        FRAME_COUNT - 1
      );
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
    },
  });
}


/* ═══════════════════════════════════════
   MARQUEE — ghost text, scroll-driven
═══════════════════════════════════════ */

function initMarquee() {
  // Translate marquee text on scroll
  gsap.to(marqueeText, {
    xPercent: -30,
    ease:     'none',
    scrollTrigger: {
      trigger: scrollCont,
      start:   'top top',
      end:     'bottom bottom',
      scrub:   true,
    },
  });

  // Fade marquee in and out: visible between 28%–72% scroll
  ScrollTrigger.create({
    trigger: scrollCont,
    start:   'top top',
    end:     'bottom bottom',
    onUpdate(self) {
      const p = self.progress;
      let opacity = 0;

      if (p > 0.26 && p <= 0.30) {
        opacity = (p - 0.26) / 0.04;
      } else if (p > 0.30 && p < 0.70) {
        opacity = 1;
      } else if (p >= 0.70 && p < 0.74) {
        opacity = 1 - (p - 0.70) / 0.04;
      }

      marqueeWrap.style.opacity = opacity;
    },
  });
}


/* ═══════════════════════════════════════
   SECTION ANIMATIONS
═══════════════════════════════════════ */

function animateIn(children, type) {
  const base = { stagger: 0.11, duration: 0.85, ease: 'power3.out', overwrite: true };

  switch (type) {
    case 'slide-left':
      gsap.from(children, { ...base, x: -55, opacity: 0 });
      break;
    case 'slide-right':
      gsap.from(children, { ...base, x: 55, opacity: 0 });
      break;
    case 'fade-up':
      gsap.from(children, { ...base, y: 40, opacity: 0 });
      break;
    case 'clip-reveal':
      gsap.from(children, {
        ...base,
        clipPath: 'inset(100% 0 0 0)',
        opacity:   0,
        duration:  1.0,
        ease:      'power4.inOut',
      });
      break;
    case 'scale-up':
      gsap.from(children, {
        ...base,
        scale:    0.88,
        opacity:  0,
        ease:     'power2.out',
        duration: 0.95,
      });
      break;
    default:
      gsap.from(children, { ...base, y: 30, opacity: 0 });
  }
}

function initSections() {
  document.querySelectorAll('.scroll-section').forEach(section => {
    const type    = section.dataset.animation;
    const persist = section.dataset.persist === 'true';
    const enter   = parseFloat(section.dataset.enter) / 100;
    const leave   = parseFloat(section.dataset.leave) / 100;
    const targets = section.querySelectorAll(
      '.section-label, .section-heading, .section-body, .cta-button'
    );

    let isVisible = false;
    let hasPlayed = false;

    ScrollTrigger.create({
      trigger: scrollCont,
      start:   'top top',
      end:     'bottom bottom',
      onUpdate(self) {
        const p       = self.progress;
        const inRange = p >= enter && (persist || p < leave);

        if (inRange && !isVisible) {
          // Show section
          isVisible = true;
          gsap.to(section, { opacity: 1, duration: 0.15 });
          section.classList.add('is-visible');

          // Play entrance animation once (or reset on re-entry if not persist)
          if (!hasPlayed) {
            hasPlayed = true;
            animateIn(targets, type);
          }
        }

        if (!inRange && isVisible) {
          // Hide section
          isVisible = false;
          gsap.to(section, { opacity: 0, duration: 0.35 });
          section.classList.remove('is-visible');

          // Allow re-animation on next entry (unless persist)
          if (!persist) {
            hasPlayed = false;
            gsap.set(targets, { clearProps: 'all' });
          }
        }
      },
    });
  });
}


/* ═══════════════════════════════════════
   NAV — border appears on scroll
═══════════════════════════════════════ */

function initNav() {
  ScrollTrigger.create({
    trigger:    scrollCont,
    start:      'top top-=10',
    onEnter:    () => siteHeader.classList.add('scrolled'),
    onLeaveBack: () => siteHeader.classList.remove('scrolled'),
  });
}


/* ═══════════════════════════════════════
   HERO ENTRANCE ANIMATION
═══════════════════════════════════════ */

function animateHero() {
  const words   = hero.querySelectorAll('.hero-heading .word');
  const tagline = hero.querySelector('.hero-tagline');
  const label   = hero.querySelector('.hero-label');
  const scroll  = hero.querySelector('.scroll-indicator');

  // Label
  gsap.to(label, {
    opacity: 1,
    duration: 0.7,
    delay: 0.2,
    ease: 'power2.out',
  });

  // Words — staggered slide up
  gsap.from(words, {
    y:        45,
    opacity:  0,
    stagger:  0.08,
    duration: 1.0,
    delay:    0.35,
    ease:     'power3.out',
  });

  // Tagline
  gsap.to(tagline, {
    opacity: 1,
    y:       0,
    duration: 0.8,
    delay:    0.85,
    ease:     'power2.out',
  });
  gsap.set(tagline, { opacity: 0, y: 18 });

  // Scroll indicator
  gsap.to(scroll, {
    opacity: 1,
    duration: 0.7,
    delay: 1.3,
  });
}


/* ═══════════════════════════════════════
   MAIN INIT
═══════════════════════════════════════ */

async function init() {
  // Block scroll during load
  document.body.style.overflow = 'hidden';

  // Setup canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load all frames
  await loadFrames();

  // Hide loader with fade
  await new Promise(resolve => {
    gsap.to(loader, {
      opacity:  0,
      duration: 0.55,
      ease:     'power1.in',
      onComplete() {
        loader.style.display = 'none';
        document.body.style.overflow = '';
        resolve();
      },
    });
  });

  // Boot everything
  ScrollTrigger.registerPlugin && void 0; // ensure registered
  initLenis();
  ScrollTrigger.refresh();

  initHeroFade();
  initFrameScroll();
  initMarquee();
  initSections();
  initNav();

  // Hero entrance (slight delay so first frame is visible)
  requestAnimationFrame(animateHero);
}

init();
