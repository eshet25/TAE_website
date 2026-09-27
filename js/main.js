/* Tsion A. Eshetu, personal site
   Two small features: the interactive sky banner and the photo lightbox.
   The page works fully without this file. */
(function () {
  "use strict";

  syncHeaderHeight();
  window.addEventListener("resize", debounce(syncHeaderHeight, 120));
  window.addEventListener("load", syncHeaderHeight);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(syncHeaderHeight); }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  function syncHeaderHeight() {
    var header = document.querySelector(".site-header");
    if (!header) { return; }
    document.documentElement.style.setProperty("--header-h", header.getBoundingClientRect().height + "px");
  }

  var sky = document.getElementById("sky");
  if (sky) { initSky(sky); }
  initGallery();
  initTabs();
  initTheme();

  /* ---------------- Theme (light / dark / auto) ----------------
     "Auto" (the default) follows the visitor's system setting. A choice is
     remembered on this device only, and only in the browser's local storage,
     never sent anywhere. */
  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    var label = document.getElementById("theme-label");
    if (!btn || !label) { return; }
    var KEY = "site-theme";
    var current = null;
    try { current = localStorage.getItem(KEY); } catch (e) { current = null; }
    if (current !== "light" && current !== "dark") { current = null; }

    var ICONS = {
      auto: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      dark: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
    };
    var icon = document.getElementById("theme-icon");

    function apply(pref) {
      var key = pref === "light" ? "light" : pref === "dark" ? "dark" : "auto";
      if (pref === "light" || pref === "dark") {
        document.documentElement.setAttribute("data-theme", pref);
        document.documentElement.style.colorScheme = pref;
      } else {
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.style.colorScheme = "light dark";
      }
      label.textContent = "Theme: " + (key === "auto" ? "Auto" : key === "light" ? "Light" : "Dark");
      if (icon) { icon.innerHTML = ICONS[key]; }
      btn.setAttribute("aria-label", "Color theme: " + (pref || "automatic") + ". Activate to change.");
    }

    apply(current);
    btn.addEventListener("click", function () {
      current = current === null ? "light" : current === "light" ? "dark" : null;
      try {
        if (current === null) { localStorage.removeItem(KEY); } else { localStorage.setItem(KEY, current); }
      } catch (e) { /* storage unavailable; theme still applies for this visit */ }
      apply(current);
    });
  }

  /* ---------------- Section tabs ----------------
     Without this script, the nav links are plain in-page anchors and every
     section is visible, so the site still works fully with JavaScript off.
     With it, the nav becomes a proper tablist: one section shows at a time,
     arrow keys move between tabs, and the URL hash still deep-links a tab. */
  function initTabs() {
    var nav = document.querySelector(".site-nav ul");
    if (!nav) { return; }
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#panel-"]'));
    var panels = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    if (!links.length || panels.indexOf(null) !== -1) { return; }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    nav.setAttribute("role", "tablist");
    links.forEach(function (a, i) {
      var panel = panels[i];
      a.setAttribute("role", "tab");
      if (!a.id) { a.id = "tab-" + panel.id; }
      a.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", a.id);
    });

    function activate(index, opts) {
      opts = opts || {};
      links.forEach(function (a, i) {
        var selected = i === index;
        a.setAttribute("aria-selected", selected ? "true" : "false");
        a.tabIndex = selected ? 0 : -1;
        panels[i].hidden = !selected;
      });
      var layout = document.querySelector(".layout");
      if (layout) {
        layout.classList.toggle("no-sidebar", panels[index].id !== "panel-about");
      }
      if (opts.focus) { links[index].focus(); }
      if (opts.scroll) {
        panels[index].scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
      }
      if (opts.updateHash) {
        history.replaceState(null, "", links[index].getAttribute("href"));
      }
    }

    function activateHref(href, opts) {
      var i = links.findIndex(function (a) { return a.getAttribute("href") === href; });
      if (i !== -1) { activate(i, opts); }
    }

    links.forEach(function (a, i) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        activate(i, { scroll: true, updateHash: true });
      });
      a.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { next = (i + 1) % links.length; }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { next = (i - 1 + links.length) % links.length; }
        else if (e.key === "Home") { next = 0; }
        else if (e.key === "End") { next = links.length - 1; }
        if (next !== null) {
          e.preventDefault();
          activate(next, { focus: true, scroll: true, updateHash: true });
        }
      });
    });

    /* Any other in-page link that points at a panel (e.g. "Read about my
       research") should switch tabs too, not just jump down the page. */
    Array.prototype.forEach.call(document.querySelectorAll('a[href^="#panel-"]'), function (a) {
      if (links.indexOf(a) !== -1) { return; }
      a.addEventListener("click", function (e) {
        e.preventDefault();
        activateHref(a.getAttribute("href"), { scroll: true, updateHash: true });
      });
    });

    var startHref = links.some(function (a) { return a.getAttribute("href") === window.location.hash; })
      ? window.location.hash
      : links[0].getAttribute("href");
    activateHref(startHref, {});
  }

  /* ---------------- Sky banner ---------------- */
  function initSky(sky) {
    var scene = sky.querySelector(".sky-scene");
    var controls = sky.querySelector(".sky-controls");
    var changeBtn = document.getElementById("sky-change");
    var motionBtn = document.getElementById("sky-motion");
    var status = document.getElementById("sky-status");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    var order = ["day", "dusk", "night", "dawn"];
    var labels = { day: "Day", dusk: "Dusk", night: "Night", dawn: "Dawn" };

    function skyForHour(h) {
      if (h >= 5 && h < 8) { return "dawn"; }
      if (h >= 8 && h < 17) { return "day"; }
      if (h >= 17 && h < 20) { return "dusk"; }
      return "night";
    }

    var current = skyForHour(new Date().getHours());
    var running = !reduce.matches;

    /* Stars (deterministic, so they do not jump between visits) */
    var starWrap = sky.querySelector(".sky-stars");
    var seed = 7;
    function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    for (var i = 0; i < 70; i++) {
      var s = document.createElement("span");
      s.className = "star";
      var size = 1 + Math.round(rand() * 2);
      s.style.setProperty("--s", size + "px");
      s.style.left = (rand() * 100).toFixed(1) + "%";
      s.style.top = (rand() * 70).toFixed(1) + "%";
      s.style.setProperty("--t", (-rand() * 7).toFixed(1) + "s");
      starWrap.appendChild(s);
    }

    function render(announce) {
      sky.setAttribute("data-sky", current);
      changeBtn.textContent = "Change sky: " + labels[current];
      motionBtn.textContent = running ? "Pause motion" : "Play motion";
      sky.setAttribute("data-motion", running ? "on" : "paused");
      if (!running) {
        scene.style.setProperty("--px", 0);
        scene.style.setProperty("--py", 0);
        scene.style.setProperty("--sy", "0px");
      }
      if (announce) { status.textContent = announce; }
    }

    changeBtn.addEventListener("click", function () {
      current = order[(order.indexOf(current) + 1) % order.length];
      render("Sky set to " + labels[current].toLowerCase() + ".");
    });
    motionBtn.addEventListener("click", function () {
      running = !running;
      render(running ? "Sky motion on." : "Sky motion paused.");
    });
    if (reduce.addEventListener) {
      reduce.addEventListener("change", function () { running = !reduce.matches; render(); });
    }

    /* Gentle parallax: pointer moves the layers, scrolling lifts the sky slowly */
    var ticking = false;
    var nx = 0, ny = 0;
    function apply() {
      ticking = false;
      if (!running) { return; }
      scene.style.setProperty("--px", nx.toFixed(3));
      scene.style.setProperty("--py", ny.toFixed(3));
      scene.style.setProperty("--sy", Math.min(window.scrollY, 500) * 0.35 + "px");
    }
    function schedule() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(apply); }
    }
    window.addEventListener("pointermove", function (e) {
      if (!running || e.pointerType !== "mouse") { return; }
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
      schedule();
    }, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });

    controls.hidden = false;
    render();
  }

  /* ---------------- Photo lightbox ---------------- */
  function initGallery() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".gallery-link"));
    var dlg = document.getElementById("lightbox");
    if (!links.length || !dlg || typeof dlg.showModal !== "function") { return; }

    var img = dlg.querySelector("img");
    var cap = dlg.querySelector("figcaption");
    var count = dlg.querySelector(".lightbox-count");
    var prev = dlg.querySelector(".lb-prev");
    var next = dlg.querySelector(".lb-next");
    var close = dlg.querySelector(".lb-close");
    var idx = 0;
    var opener = null;

    function show(i) {
      idx = (i + links.length) % links.length;
      var link = links[idx];
      var thumb = link.querySelector("img");
      var fig = link.closest("figure");
      var fc = fig ? fig.querySelector("figcaption") : null;
      var altText = thumb ? thumb.getAttribute("alt") || "" : "";
      img.src = link.getAttribute("href");
      img.alt = altText;
      cap.textContent = fc ? fc.textContent : altText;
      count.textContent = "Photo " + (idx + 1) + " of " + links.length;
    }

    if (links.length < 2) { prev.hidden = true; next.hidden = true; }

    links.forEach(function (link, i) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        opener = link;
        show(i);
        dlg.showModal();
      });
    });
    prev.addEventListener("click", function () { show(idx - 1); });
    next.addEventListener("click", function () { show(idx + 1); });
    close.addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) { dlg.close(); } });
    dlg.addEventListener("keydown", function (e) {
      if (links.length < 2) { return; }
      if (e.key === "ArrowLeft") { show(idx - 1); }
      if (e.key === "ArrowRight") { show(idx + 1); }
    });
    dlg.addEventListener("close", function () { if (opener) { opener.focus(); } });
  }
})();
