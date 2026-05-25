/* ═══════════════════════════════════════════════════════════════
   Paraíso VIP Estamparia — Landing de conversão
   - Links WhatsApp centralizados
   - Reveal on scroll
   - Fallback para imagens que não carregam
════════════════════════════════════════════════════════════════ */

/* Troque pelo número real quando tiver (formato: 55 + DDD + número, só dígitos) */
const WHATSAPP_NUMERO = "5511968779018";
const WHATSAPP_MENSAGEM = "Oi, quero um orçamento da Paraíso VIP Estamparia";
const buildWhatsAppLink = (message = WHATSAPP_MENSAGEM) =>
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(message)}`;

const IMAGE_FALLBACK = "assets/placeholder-real.svg";


/* ── Aplica link do WhatsApp em todos os CTAs ────────────────── */
document.querySelectorAll(".js-whatsapp-link").forEach((el) => {
  const customMessage = el.dataset.whatsappMessage || WHATSAPP_MENSAGEM;
  el.setAttribute("href", buildWhatsAppLink(customMessage));
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener noreferrer");
});


/* ── Scroll reveal ──────────────────────────────────────────── */
const supportsIO = "IntersectionObserver" in window;

if (supportsIO) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
}


/* ── Fallback para imagens que não carregarem ───────────────── */
document.querySelectorAll("img:not(.topbar-logo)").forEach((img) => {
  img.addEventListener("error", () => {
    if (!img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = "true";
      img.src = IMAGE_FALLBACK;
      img.style.opacity = ".35";
    }
  });
});


/* ── Hero parallax floating ─────────────────────────────────────
   Portado do componente React "parallax-floating" para vanilla JS.
   - Apenas em desktop (≥ 900px)
   - Respeita prefers-reduced-motion
   - Sensitivity negativa: imagens se movem na direção oposta do cursor
───────────────────────────────────────────────────────────────── */
(function initHeroParallax() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 899px)").matches;
  if (prefersReduced || isMobile) return;

  const hero = document.querySelector(".hero");
  if (!hero) return;

  const items = Array.from(hero.querySelectorAll(".fx"));
  if (!items.length) return;

  const SENSITIVITY = -1;   // negativo = movimento contrário ao cursor (efeito profundidade)
  const EASING      = 0.06; // menor = mais "manteiga", maior = mais rápido

  const positions = items.map(() => ({ x: 0, y: 0 }));
  const target    = { x: 0, y: 0 };

  let rect = hero.getBoundingClientRect();
  const updateRect = () => { rect = hero.getBoundingClientRect(); };
  window.addEventListener("resize", updateRect, { passive: true });
  window.addEventListener("scroll", updateRect, { passive: true });

  hero.addEventListener("mousemove", (e) => {
    target.x = e.clientX - rect.left - rect.width  / 2;
    target.y = e.clientY - rect.top  - rect.height / 2;
  }, { passive: true });

  hero.addEventListener("mouseleave", () => {
    target.x = 0;
    target.y = 0;
  });

  let rafId = null;
  let heroInView = true;

  function shouldRun() {
    return heroInView && !document.hidden;
  }

  function tick() {
    if (!shouldRun()) {
      rafId = null;
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const depth = parseFloat(item.dataset.depth) || 1;
      const strength = (depth * SENSITIVITY) / 20;

      const tx = target.x * strength;
      const ty = target.y * strength;

      positions[i].x += (tx - positions[i].x) * EASING;
      positions[i].y += (ty - positions[i].y) * EASING;

      item.style.transform =
        `translate3d(${positions[i].x.toFixed(2)}px, ${positions[i].y.toFixed(2)}px, 0)`;
    }
    rafId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (rafId != null || !shouldRun()) {
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        heroInView = e.isIntersecting;
        if (shouldRun()) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { root: null, threshold: 0, rootMargin: "0px" }
    );
    io.observe(hero);
  }

  function onVisibility() {
    if (document.hidden) {
      stopLoop();
    } else if (shouldRun()) {
      updateRect();
      startLoop();
    }
  }
  document.addEventListener("visibilitychange", onVisibility, { passive: true });

  startLoop();
})();


/* ── Topbar transparente → opaca ────────────────────────────────
   A topbar começa transparente sobre o hero escuro e vira branca
   translúcida assim que o usuário rola além da metade do hero. */
(function initTopbarScroll() {
  const topbar = document.querySelector(".topbar");
  const hero   = document.querySelector(".hero");
  if (!topbar || !hero) return;

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const threshold = hero.offsetHeight * 0.55;
      topbar.classList.toggle("is-scrolled", window.scrollY > threshold);
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();


/* ── Marquee infinito ───────────────────────────────────────────
   Duplica o conteúdo do track pra garantir loop perfeito (o CSS
   anima translateX de 0 até -50%, ou seja, uma "cópia" inteira).
   Suporta data-speed (segundos) individual em cada track. */
(function initMarquees() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-marquee-track]").forEach((track) => {
    const original = Array.from(track.children);
    original.forEach((child) => {
      const clone = child.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    const speed = parseFloat(track.dataset.speed);
    if (!Number.isNaN(speed) && speed > 0) {
      track.style.animationDuration = speed + "s";
    }

    if (prefersReduced) {
      track.style.animation = "none";
    }
  });
})();
