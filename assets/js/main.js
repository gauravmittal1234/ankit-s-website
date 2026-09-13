/* Arcus Design Build — site behaviour */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const P = window.ADB_PROJECTS || [];
  const CATS = window.ADB_CATEGORIES || {};
  const WA = "917827897695";
  const EMAIL = "ankit@thearcusdesignbuild.com";
  let io; // IntersectionObserver for reveal animations (declared early: used before the section below)
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ICON = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const solidAlways = nav && nav.dataset.solid === "true";
  function navState() {
    if (!nav) return;
    nav.classList.toggle("nav--solid", solidAlways || window.scrollY > 40);
  }
  navState();
  window.addEventListener("scroll", navState, { passive: true });

  const burger = $(".nav__burger");
  const menu = $(".menu");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    document.body.classList.toggle("no-scroll", open);
    burger && burger.setAttribute("aria-expanded", String(open));
  }
  burger && burger.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
  menu && $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- hero slideshow ---------- */
  const hero = $(".hero");
  if (hero) {
    const slides = $$(".hero__slides picture", hero);
    const dots = $(".hero__dots");
    const cap = $(".hero__caption b");
    let i = 0, timer;
    slides.forEach((s, k) => {
      if (dots) {
        const b = document.createElement("button");
        b.setAttribute("aria-label", "Show slide " + (k + 1));
        b.addEventListener("click", () => { go(k); restart(); });
        dots.appendChild(b);
      }
    });
    function go(k) {
      i = (k + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle("is-active", n === i));
      dots && $$("button", dots).forEach((b, n) => b.classList.toggle("is-active", n === i));
      if (cap) cap.textContent = slides[i].dataset.caption || "";
    }
    function restart() { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); }
    go(0); restart();
  }

  /* ---------- cards ---------- */
  function cardHTML(p) {
    return (
      '<a class="card reveal" href="#project=' + p.slug + '" data-slug="' + p.slug + '">' +
      '<div class="card__media"><img loading="lazy" decoding="async" src="' + p.cover + '" width="900" height="675" alt="' + esc(p.title + ", " + p.location) + '">' +
      '<span class="card__count">' + p.images.length + (p.images.length === 1 ? " view" : " views") + "</span></div>" +
      '<div class="card__body"><span class="card__tag">' + esc(p.catLabel) + "</span>" +
      '<h3 class="card__title">' + esc(p.title) + "</h3>" +
      '<p class="card__loc">' + esc(p.location) + "</p></div></a>"
    );
  }

  const featuredGrid = $("[data-featured]");
  if (featuredGrid) {
    const list = P.filter((p) => p.featured).slice(0, parseInt(featuredGrid.dataset.featured || "6", 10));
    featuredGrid.innerHTML = list.map(cardHTML).join("");
  }

  const workGrid = $("[data-work-grid]");
  const filters = $("[data-filters]");
  const countEl = $("[data-work-count]");
  if (workGrid) {
    let active = "all";
    const counts = {};
    P.forEach((p) => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    if (filters) {
      const chips = [["all", "All"]].concat(Object.keys(CATS).map((k) => [k, CATS[k]]));
      filters.innerHTML = chips.map(([k, label]) =>
        '<button class="filter" data-cat="' + k + '" aria-pressed="' + (k === active) + '">' + esc(label) +
        "<small>" + (k === "all" ? P.length : counts[k] || 0) + "</small></button>"
      ).join("");
      filters.addEventListener("click", (e) => {
        const b = e.target.closest(".filter");
        if (!b) return;
        active = b.dataset.cat;
        $$(".filter", filters).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        render();
      });
      // deep link: work.html#cat=food-court
      const m = location.hash.match(/cat=([\w-]+)/);
      if (m && CATS[m[1]]) { active = m[1]; $$(".filter", filters).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.cat === active))); }
    }
    function render() {
      const list = active === "all" ? P : P.filter((p) => p.cat === active);
      workGrid.innerHTML = list.map(cardHTML).join("");
      if (countEl) countEl.textContent = list.length + " project" + (list.length === 1 ? "" : "s");
      observeReveals();
    }
    render();
  }

  /* ---------- project modal ---------- */
  let modal, lightbox, current = null, lbIndex = 0;
  function buildModal() {
    modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML =
      '<div class="modal__bar"><button class="btn-icon" data-close>' + ICON.prev + "<span>Back to work</span></button>" +
      '<div class="modal__nav"><button data-prev aria-label="Previous project">' + ICON.prev + '</button><button data-next aria-label="Next project">' + ICON.next + "</button></div></div>" +
      '<div class="container"><div class="modal__head"><div><span class="eyebrow" data-cat></span><h2 class="modal__title" data-title></h2><div class="modal__meta"><span><b data-loc></b></span><span data-scope></span><span data-count></span></div></div><p class="modal__desc" data-desc></p></div>' +
      '<div class="gallery" data-gallery></div>' +
      '<div class="modal__foot"><a href="#" data-prev-link><small>Previous</small><span></span></a><a href="#" data-next-link><small>Next</small><span></span></a></div></div>';
    document.body.appendChild(modal);
    $("[data-close]", modal).addEventListener("click", closeProject);
    $("[data-prev]", modal).addEventListener("click", () => step(-1));
    $("[data-next]", modal).addEventListener("click", () => step(1));
    $("[data-prev-link]", modal).addEventListener("click", (e) => { e.preventDefault(); step(-1); });
    $("[data-next-link]", modal).addEventListener("click", (e) => { e.preventDefault(); step(1); });
    $("[data-gallery]", modal).addEventListener("click", (e) => {
      const f = e.target.closest("figure");
      if (f) openLightbox(parseInt(f.dataset.index, 10));
    });

    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML =
      '<img alt="">' +
      '<button class="lightbox__close" aria-label="Close">' + ICON.close + "</button>" +
      '<button class="lightbox__prev" aria-label="Previous image">' + ICON.prev + "</button>" +
      '<button class="lightbox__next" aria-label="Next image">' + ICON.next + "</button>" +
      '<span class="lightbox__count"></span>';
    document.body.appendChild(lightbox);
    $(".lightbox__close", lightbox).addEventListener("click", closeLightbox);
    $(".lightbox__prev", lightbox).addEventListener("click", () => lbGo(-1));
    $(".lightbox__next", lightbox).addEventListener("click", () => lbGo(1));
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
    let tx = 0, ty = 0;
    lightbox.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    lightbox.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) lbGo(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeLightbox();
    }, { passive: true });
  }

  function projectIndex(slug) { return P.findIndex((p) => p.slug === slug); }

  function openProject(slug, push) {
    const idx = projectIndex(slug);
    if (idx < 0) return;
    if (!modal) buildModal();
    const p = P[idx];
    current = idx;
    $("[data-cat]", modal).textContent = p.catLabel;
    $("[data-title]", modal).textContent = p.title;
    $("[data-loc]", modal).textContent = p.location;
    $("[data-scope]", modal).textContent = p.scope;
    $("[data-count]", modal).textContent = p.images.length + (p.images.length === 1 ? " view" : " views");
    const descEl = $("[data-desc]", modal);
    descEl.textContent = p.desc;
    applyClamp(descEl, 3, true);
    $("[data-gallery]", modal).innerHTML = p.images.map((im, i) =>
      '<figure data-index="' + i + '"' + (im.w / im.h > 2.2 ? ' class="wide"' : (im.w < 900 ? ' class="small"' : "")) + '><img ' + (i < 2 ? "" : 'loading="lazy" ') + 'decoding="async" src="' + im.src + '" width="' + im.w + '" height="' + im.h + '" alt="' + esc(p.title + " view " + (i + 1)) + '"></figure>'
    ).join("");
    const prev = P[(idx - 1 + P.length) % P.length], next = P[(idx + 1) % P.length];
    $("[data-prev-link] span", modal).textContent = prev.title + " · " + prev.location;
    $("[data-next-link] span", modal).textContent = next.title + " · " + next.location;
    modal.classList.add("open");
    modal.scrollTop = 0;
    document.body.classList.add("no-scroll");
    document.title = p.title + " · " + p.location + " — Arcus Design Build";
    if (push && location.hash !== "#project=" + slug) history.pushState({ project: slug }, "", "#project=" + slug);
  }
  function step(d) { if (current == null) return; openProject(P[(current + d + P.length) % P.length].slug, false); history.replaceState({ project: P[current].slug }, "", "#project=" + P[current].slug); }
  function closeProject() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.classList.remove("no-scroll");
    current = null;
    document.title = document.body.dataset.title || document.title;
    if (/project=/.test(location.hash)) history.replaceState({}, "", location.pathname + location.search);
  }
  function openLightbox(i) {
    lbIndex = i;
    lbShow();
    lightbox.classList.add("open");
  }
  function lbShow() {
    const p = P[current]; const im = p.images[lbIndex];
    const img = $("img", lightbox);
    img.src = im.src; img.alt = p.title + " view " + (lbIndex + 1);
    $(".lightbox__count", lightbox).textContent = (lbIndex + 1) + " / " + p.images.length;
    // preload neighbours
    [1, -1].forEach((d) => { const n = p.images[(lbIndex + d + p.images.length) % p.images.length]; if (n) { const pre = new Image(); pre.src = n.src; } });
  }
  function lbGo(d) { const p = P[current]; lbIndex = (lbIndex + d + p.images.length) % p.images.length; lbShow(); }
  function closeLightbox() { lightbox && lightbox.classList.remove("open"); }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href*='#project=']");
    if (!a) return;
    const slug = a.getAttribute("href").split("#project=")[1];
    // Links to another page (e.g. index → work.html#project=) navigate normally.
    const samePage = !a.getAttribute("href").includes(".html") || a.pathname === location.pathname;
    if (!samePage) return;
    e.preventDefault();
    openProject(slug, true);
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox && lightbox.classList.contains("open")) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") lbGo(1);
      if (e.key === "ArrowLeft") lbGo(-1);
      return;
    }
    if (modal && modal.classList.contains("open")) {
      if (e.key === "Escape") closeProject();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
  });
  window.addEventListener("popstate", () => {
    const m = location.hash.match(/project=([\w-]+)/);
    if (m) openProject(m[1], false); else if (lightbox && lightbox.classList.contains("open")) closeLightbox(); else closeProject();
  });
  document.body.dataset.title = document.title;
  (function initFromHash() {
    const m = location.hash.match(/project=([\w-]+)/);
    if (m) openProject(m[1], false);
  })();

  /* ---------- contact form → WhatsApp / email ---------- */
  const form = $("[data-enquiry]");
  if (form) {
    const val = (n) => (form.elements[n] && form.elements[n].value.trim()) || "";
    function compose() {
      const lines = [
        "Hi Arcus Design Build, I'd like to discuss a project.",
        val("name") && "Name: " + val("name"),
        val("phone") && "Phone: " + val("phone"),
        val("type") && "Project: " + val("type"),
        val("city") && "City: " + val("city"),
        val("message") && "Details: " + val("message"),
      ].filter(Boolean);
      return lines.join("\n");
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(compose()), "_blank", "noopener");
    });
    const mail = $("[data-email-instead]", form);
    mail && mail.addEventListener("click", () => {
      const subject = "Project enquiry" + (val("type") ? " — " + val("type") : "");
      location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(compose());
    });
  }

  /* ---------- mobile bar ---------- */
  const bar = $(".mobile-bar");
  if (bar) {
    document.body.classList.add("has-mobile-bar");
    const show = () => bar.classList.toggle("show", window.scrollY > (hero ? hero.offsetHeight * 0.6 : 120));
    show();
    window.addEventListener("scroll", show, { passive: true });
  }

  /* ---------- reveal on scroll ---------- */
  function observeReveals() {
    const els = $$(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    io = io || new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in"); else io.observe(el);
    });
    // Safety net: never leave content hidden if the observer does not fire.
    clearTimeout(observeReveals.t);
    observeReveals.t = setTimeout(() => $$(".reveal:not(.in)").forEach((el) => el.classList.add("in")), 4000);
  }
  observeReveals();

  /* ---------- read more (clamp) ---------- */
  function applyClamp(el, lines, reset) {
    if (reset) {
      const old = el.nextElementSibling;
      if (old && old.classList.contains("clamp-btn")) old.remove();
      el.classList.remove("open");
    }
    el.style.setProperty("--lines", lines);
    el.classList.add("clamp");
    const check = () => {
      if (el.classList.contains("open")) return;
      const overflows = el.scrollHeight > el.clientHeight + 2;
      let btn = el.nextElementSibling && el.nextElementSibling.classList.contains("clamp-btn") ? el.nextElementSibling : null;
      if (overflows && !btn) {
        btn = document.createElement("button");
        btn.type = "button"; btn.className = "clamp-btn"; btn.textContent = "Read more"; btn.setAttribute("aria-expanded", "false");
        btn.addEventListener("click", () => {
          const open = el.classList.toggle("open");
          btn.textContent = open ? "Show less" : "Read more";
          btn.setAttribute("aria-expanded", String(open));
        });
        el.insertAdjacentElement("afterend", btn);
      } else if (!overflows && btn) { btn.remove(); }
    };
    check();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(check);
  }
  $$("[data-clamp]").forEach((el) => applyClamp(el, parseInt(el.dataset.clamp, 10) || 3, false));
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => $$("[data-clamp]").forEach((el) => applyClamp(el, parseInt(el.dataset.clamp, 10) || 3, false)), 200); });

  /* ---------- service "what's included" toggles ---------- */
  $$(".service__toggle").forEach((btn) => {
    const list = btn.nextElementSibling;
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      if (list) list.hidden = !open;
    });
  });

  /* ---------- process tabs ---------- */
  const tabs = $$(".tab[data-tab]");
  if (tabs.length) {
    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      $$(".tab-panel[data-panel]").forEach((p) => p.classList.toggle("is-active", p.dataset.panel === t.dataset.tab));
    }));
  }

  /* ---------- case studies ---------- */
  const CS = window.ADB_CASE_STUDIES || [];
  const byslug = (slug) => P.find((p) => p.slug === slug) || {};
  const csTeaser = $("[data-cs-teaser]");
  if (csTeaser && CS.length) {
    const n = parseInt(csTeaser.dataset.csTeaser || "3", 10);
    csTeaser.innerHTML = CS.slice(0, n).map((c) => {
      const pr = byslug(c.project);
      return '<a class="cs-card reveal" href="case-studies.html#cs-' + c.id + '">' +
        '<div class="cs-card__media"><img loading="lazy" decoding="async" src="' + (pr.cover || "") + '" alt="' + esc(c.title) + '"></div>' +
        '<div class="cs-card__body"><span class="cs-card__theme">' + esc(c.theme) + '</span><h3 class="cs-card__title">' + esc(c.title) + '</h3>' +
        '<p class="cs-card__meta">' + esc(c.brand) + ' · ' + esc(c.location) + '</p>' +
        '<span class="link-more">Read the case study ' + ICON.arrow + '</span></div></a>';
    }).join("");
    observeReveals();
  }
  const csList = $("[data-cs-list]");
  if (csList && CS.length) {
    const nav = $("[data-theme-nav]");
    if (nav) nav.innerHTML = CS.map((c) => '<a href="#cs-' + c.id + '">' + esc(c.theme) + '</a>').join("");
    csList.innerHTML = CS.map((c, i) => {
      const pr = byslug(c.project);
      const li = (arr) => arr.map((x) => "<li>" + esc(x) + "</li>").join("");
      return '<article class="cs reveal" id="cs-' + c.id + '">' +
        '<div class="cs__top"><div class="cs__media"><img loading="' + (i < 2 ? "eager" : "lazy") + '" decoding="async" src="' + (pr.cover || "") + '" alt="' + esc(pr.title ? pr.title + ", " + pr.location : c.title) + '"></div>' +
        '<div class="cs__body"><span class="cs__theme">' + esc(c.theme) + '</span><h3 class="cs__title">' + esc(c.title) + '</h3>' +
        '<p class="cs__meta"><b>' + esc(c.brand) + '</b> · ' + esc(c.location) + '</p>' +
        '<p class="cs__challenge"><b>The brief.</b> ' + esc(c.challenge) + '</p></div></div>' +
        '<details class="cs__more"><summary>How ADB approached it, and what the client got</summary><div class="cs__detail">' +
        '<div><h4>Approach</h4><ul>' + li(c.approach) + '</ul></div><div><h4>Outcome</h4><ul>' + li(c.outcome) + '</ul></div>' +
        (pr.slug ? '<a class="link-more" href="work.html#project=' + pr.slug + '">See the ' + esc(pr.title) + ' gallery (' + pr.images.length + ' views) ' + ICON.arrow + '</a>' : "") +
        '</div></details></article>';
    }).join("");
    observeReveals();
    const openFromHash = () => {
      const m = location.hash.match(/#cs-([\w-]+)/);
      if (!m) return;
      const el = document.getElementById("cs-" + m[1]);
      if (!el) return;
      el.classList.add("in");
      const d = $("details", el); if (d) d.open = true;
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  }

  /* ---------- misc ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  $$("[data-project-count]").forEach((el) => { el.textContent = P.length; });
})();
