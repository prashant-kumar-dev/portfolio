(function () {
  "use strict";

  var THEME_KEY = "toggle-bootstrap-theme";
  var NAV_OFFSET = 88;

  function getStoredTheme() {
    try {
      var raw = localStorage.getItem(THEME_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && typeof data.isDark === "boolean") return data.isDark ? "dark" : "light";
    } catch (e) {}
    return null;
  }

  function applyTheme(mode) {
    var root = document.documentElement;
    root.setAttribute("data-bs-theme", mode);
    var dark = mode === "dark";
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", dark ? "#12151c" : "#0d6efd");
    }
    var btn = document.getElementById("theme-toggler");
    if (btn) {
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
      var icon = btn.querySelector(".theme-icon");
      if (icon) icon.className = "theme-icon fa " + (dark ? "fa-moon-o" : "fa-sun-o");
    }
  }

  window.toggleTheme = function () {
    var next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify({ isDark: next === "dark" }));
    } catch (e) {}
  };

  function initTheme() {
    var mode = getStoredTheme();
    if (!mode) {
      var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      mode = mq && mq.matches ? "dark" : "light";
    }
    applyTheme(mode);
  }

  function scrollToHash(hash, behavior) {
    if (!hash || hash === "#") return;
    var el = document.querySelector(hash);
    if (!el) return;
    var top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: behavior || "smooth" });
  }

  function initSmoothNav() {
    document.querySelectorAll(".nav-link-scroll[href^='#']").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href");
        if (!href || href.length < 2) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        scrollToHash(href, reduced ? "auto" : "smooth");
        var nav = document.getElementById("navbarNav");
        if (nav && nav.classList.contains("show") && window.bootstrap) {
          var c = window.bootstrap.Collapse.getInstance(nav);
          if (c) c.hide();
        }
      });
    });
  }

  function initScrollSpy() {
    var links = document.querySelectorAll(".nav-link-scroll[data-section]");
    if (!links.length) return;
    var sectionEls = Array.prototype.slice.call(document.querySelectorAll("body > section[id]"));
    if (!sectionEls.length) return;

    function updateActive() {
      var pos = window.scrollY + NAV_OFFSET + 24;
      var currentId = sectionEls[0].id;
      for (var i = 0; i < sectionEls.length; i++) {
        if (sectionEls[i].offsetTop <= pos) currentId = sectionEls[i].id;
      }
      var nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 64;
      if (nearBottom) currentId = sectionEls[sectionEls.length - 1].id;

      links.forEach(function (link) {
        var id = link.getAttribute("href");
        id = id && id.slice(1);
        link.classList.toggle("active", id === currentId);
      });
    }

    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive, { passive: true });
    updateActive();
  }

  function initScrollToTop() {
    var btn = document.getElementById("scroll-to-top");
    if (!btn) return;
    function toggle() {
      if (window.scrollY > 400) btn.classList.add("is-visible");
      else btn.classList.remove("is-visible");
    }
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var feedback = document.getElementById("form-feedback");
    var submitBtn = document.getElementById("contact-submit");
    var label = submitBtn && submitBtn.querySelector(".submit-label");
    var spinner = submitBtn && submitBtn.querySelector(".submit-spinner");

    form.addEventListener("submit", function (e) {
      if (!form.checkValidity()) {
        form.reportValidity();
        e.preventDefault();
        return;
      }

      // file:// blocks cross-origin fetch (CORS). Use normal form POST to Formspree instead.
      if (window.location.protocol === "file:") {
        return;
      }

      e.preventDefault();
      if (feedback) {
        feedback.textContent = "";
        feedback.className = "form-feedback mb-0";
      }
      if (submitBtn) submitBtn.disabled = true;
      if (label) label.textContent = "Sending…";
      if (spinner) spinner.classList.remove("d-none");

      var fd = new FormData(form);
      fetch(form.action, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
        mode: "cors",
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { res: res, data: data };
          }).catch(function () {
            return { res: res, data: null };
          });
        })
        .then(function (out) {
          var success = out.res.ok && (!out.data || out.data.ok !== false);
          if (success) {
            if (feedback) {
              feedback.textContent = "Thanks — your message was sent.";
              feedback.classList.add("is-success");
            }
            form.reset();
            return;
          }
          var msg = "Could not send. Try again or email directly.";
          if (out.data) {
            if (out.data.error) msg = String(out.data.error);
            else if (out.data.errors) {
              var errs = [];
              Object.keys(out.data.errors).forEach(function (k) {
                var v = out.data.errors[k];
                if (Array.isArray(v)) errs = errs.concat(v);
                else if (v) errs.push(String(v));
              });
              if (errs.length) msg = errs.join(" ");
            }
          }
          if (feedback) {
            feedback.textContent = msg;
            feedback.classList.add("is-error");
          }
        })
        .catch(function () {
          if (feedback) {
            feedback.textContent =
              "Network blocked (try opening the site over http:// or https://, not as a local file). Or email directly.";
            feedback.classList.add("is-error");
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
          if (label) label.textContent = "Send message";
          if (spinner) spinner.classList.add("d-none");
        });
    });
  }

  function initLottie() {
    var container = document.getElementById("lottie-animation");
    if (!container || typeof lottie === "undefined") return;
    lottie.loadAnimation({
      container: container,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "https://assets6.lottiefiles.com/packages/lf20_3rwasyjy.json",
    });
  }

  /* --- Typewriter (existing) --- */
  var TxtType = function (el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    /* Start with the first phrase visible so the hero never flashes empty ("I'm |"). */
    this.txt = toRotate && toRotate.length ? toRotate[0] : "";
    this.isDeleting = false;
    this.tick();
  };

  TxtType.prototype.tick = function () {
    var i = this.loopNum % this.toRotate.length;
    var fullTxt = this.toRotate[i];
    if (this.isDeleting) {
      this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
      this.txt = fullTxt.substring(0, this.txt.length + 1);
    }
    this.el.innerHTML = '<span class="wrap">' + this.txt + "</span>";
    var that = this;
    var delta = 200 - Math.random() * 100;
    if (this.isDeleting) delta /= 2;
    if (!this.isDeleting && this.txt === fullTxt) {
      delta = this.period;
      this.isDeleting = true;
    } else if (this.isDeleting && this.txt === "") {
      this.isDeleting = false;
      this.loopNum++;
      delta = 500;
    }
    setTimeout(function () {
      that.tick();
    }, delta);
  };

  function initTypewriter() {
    var elements = document.getElementsByClassName("typewrite");
    for (var i = 0; i < elements.length; i++) {
      var toRotate = elements[i].getAttribute("data-type");
      var period = elements[i].getAttribute("data-period");
      if (toRotate) {
        try {
          new TxtType(elements[i], JSON.parse(toRotate), period);
        } catch (e) {}
      }
    }
  }

  function initScrollReveal() {
    var sections = document.querySelectorAll(".section-reveal");
    if (!sections.length) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !window.IntersectionObserver) {
      sections.forEach(function (el) {
        el.classList.add("section-reveal-visible");
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -2% 0px", threshold: 0.08 }
    );
    sections.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initProjectFilters() {
    var buttons = document.querySelectorAll(".project-filter-btn");
    var cols = document.querySelectorAll(".project-col");
    var emptyMsg = document.getElementById("project-filter-empty");
    if (!buttons.length || !cols.length) return;

    function setActiveButton(activeBtn) {
      buttons.forEach(function (b) {
        var isActive = b === activeBtn;
        b.classList.toggle("active", isActive);
        b.classList.toggle("btn-primary", isActive);
        b.classList.toggle("btn-outline-secondary", !isActive);
      });
    }

    function applyFilter(filter) {
      var visible = 0;
      cols.forEach(function (col) {
        var raw = col.getAttribute("data-tags") || "";
        var tags = raw.split(/\s+/).filter(Boolean);
        var show = filter === "all" || tags.indexOf(filter) !== -1;
        col.classList.toggle("d-none", !show);
        if (show) visible += 1;
      });
      if (emptyMsg) emptyMsg.classList.toggle("d-none", visible !== 0);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter") || "all";
        setActiveButton(btn);
        applyFilter(f);
      });
    });

    applyFilter("all");
  }

  function boot() {
    initTheme();
    var themeBtn = document.getElementById("theme-toggler");
    if (themeBtn) themeBtn.addEventListener("click", window.toggleTheme);
    initSmoothNav();
    initScrollSpy();
    initScrollToTop();
    initContactForm();
    initTypewriter();
    initLottie();
    initScrollReveal();
    initProjectFilters();
    if (typeof Splitting !== "undefined") Splitting();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
