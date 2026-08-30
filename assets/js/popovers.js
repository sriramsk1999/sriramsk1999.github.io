/*
 * gwern.net-inspired hover popovers: footnotes, internal links, external links.
 * Progressive enhancement only — every link works fine with this script absent
 * or failing partway (each binding is wrapped so one bad link can't break the rest).
 */
(function () {
  "use strict";

  var SHOW_DELAY = 300;
  var HIDE_DELAY = 250;
  var isTouch = window.matchMedia("(hover: none)").matches;

  var container, titlebarTitle, titlebarToggle, body;
  var showTimer = null;
  var hideTimer = null;
  var activeTarget = null;
  var activeToggleState = "card"; // "card" | "iframe", for annotated external links
  var internalPageCache = Object.create(null);

  function buildContainer() {
    container = document.createElement("div");
    container.id = "popover-container";
    container.innerHTML =
      '<div class="popover">' +
        '<div class="popover__titlebar">' +
          '<span class="popover__title"></span>' +
          '<button type="button" class="popover__toggle" hidden>Live preview</button>' +
        "</div>" +
        '<div class="popover__body"></div>' +
      "</div>";
    document.body.appendChild(container);
    titlebarTitle = container.querySelector(".popover__title");
    titlebarToggle = container.querySelector(".popover__toggle");
    body = container.querySelector(".popover__body");

    container.addEventListener("mouseenter", cancelHide);
    container.addEventListener("mouseleave", scheduleHide);
  }

  function position(target) {
    var rect = target.getBoundingClientRect();
    var top = rect.bottom + window.scrollY + 6;
    var left = rect.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - container.offsetWidth - 8;
    if (left > maxLeft) left = Math.max(window.scrollX + 8, maxLeft);
    if (rect.bottom + container.offsetHeight + 12 > window.innerHeight) {
      top = rect.top + window.scrollY - container.offsetHeight - 6;
    }
    container.style.top = top + "px";
    container.style.left = left + "px";
  }

  function show(target, titleHtml, bodyHtml, opts) {
    opts = opts || {};
    activeTarget = target;
    titlebarTitle.innerHTML = titleHtml || "";
    body.innerHTML = bodyHtml;

    if (opts.iframeUrl) {
      var cardHtml = bodyHtml;
      titlebarToggle.hidden = false;
      titlebarToggle.textContent = "Live preview";
      activeToggleState = "card";
      titlebarToggle.onclick = function () {
        if (activeToggleState === "card") {
          body.innerHTML = '<iframe class="popover__iframe" src="' + escapeAttr(opts.iframeUrl) + '"></iframe>';
          titlebarToggle.textContent = "Summary";
          activeToggleState = "iframe";
        } else {
          body.innerHTML = cardHtml;
          titlebarToggle.textContent = "Live preview";
          activeToggleState = "card";
        }
        requestAnimationFrame(function () { position(target); });
      };
    } else {
      titlebarToggle.hidden = true;
      titlebarToggle.onclick = null;
    }

    container.classList.add("visible");
    position(target);
    requestAnimationFrame(function () { position(target); });
  }

  function hide() {
    container.classList.remove("visible");
    activeTarget = null;
  }

  function cancelHide() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  function scheduleHide() {
    cancelHide();
    hideTimer = setTimeout(hide, HIDE_DELAY);
  }

  function cancelShow() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
  }

  /* ----- helpers ----- */

  function hostnameOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (e) { return url; }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function lookupMetadata(link) {
    if (!window.GW_linkMetadata) return null;
    return window.GW_linkMetadata[link.href] || window.GW_linkMetadata[link.getAttribute("href")] || null;
  }

  /* ----- type handlers -----
     each returns a zero-arg function that calls show(), or null if this link
     shouldn't get a popover at all. */

  function footnoteHandler(link) {
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) !== "#") return null;
    var li = document.getElementById(href.slice(1)); // getElementById, not a selector — kramdown ids contain ":"
    if (!li) return null;
    return function () {
      var clone = li.cloneNode(true);
      var back = clone.querySelector(".reversefootnote");
      if (back) back.remove();
      show(link, "Footnote", clone.innerHTML);
    };
  }

  function internalHandler(link) {
    return function () {
      var url = link.href;
      if (internalPageCache[url]) {
        renderInternal(link, internalPageCache[url]);
        return;
      }
      show(link, "…", '<p class="popover__empty">Loading preview…</p>');
      fetch(url)
        .then(function (res) { return res.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var titleEl = doc.querySelector("title");
          var contentEl = doc.querySelector(".page__content");
          var excerpt = "";
          if (contentEl) {
            var p = contentEl.querySelector("p");
            if (p) excerpt = p.textContent.trim().slice(0, 280);
          }
          var data = {
            title: titleEl ? titleEl.textContent.replace(/\s*[-|].*$/, "").trim() : url,
            excerpt: excerpt
          };
          internalPageCache[url] = data;
          if (activeTarget === link) renderInternal(link, data);
        })
        .catch(function () {
          if (activeTarget === link) show(link, escapeHtml(hostnameOf(url)), '<p class="popover__empty">Preview unavailable.</p>');
        });
    };
  }

  function renderInternal(link, data) {
    var html = data.excerpt
      ? '<p class="popover__excerpt">' + escapeHtml(data.excerpt) + '…</p>'
      : '<p class="popover__empty">No preview available.</p>';
    show(link, escapeHtml(data.title), html);
  }

  function externalHandler(link) {
    return function () {
      var meta = lookupMetadata(link);
      var domain = hostnameOf(link.href);
      if (meta) {
        var favicon = meta.favicon
          ? '<img class="popover__favicon" src="' + escapeAttr(meta.favicon) + '" alt="" onerror="this.remove()">'
          : "";
        var titleHtml = favicon + escapeHtml(meta.title || domain) +
          '<span class="popover__domain"> — ' + escapeHtml(domain) + "</span>";
        var descHtml = meta.description
          ? "<p>" + escapeHtml(meta.description) + "</p>"
          : '<p class="popover__empty">No description available.</p>';
        show(link, titleHtml, descHtml, { iframeUrl: link.href });
      } else {
        show(link, escapeHtml(domain), '<iframe class="popover__iframe" src="' + escapeAttr(link.href) + '"></iframe>');
      }
    };
  }

  /* ----- binding ----- */

  function classify(link) {
    var href = link.getAttribute("href");
    if (!href) return null;
    if (link.classList.contains("footnote")) return { handler: footnoteHandler(link), annotate: false };
    if (href.charAt(0) === "#") return null; // in-page anchors (TOC etc.)
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;

    var isExternal = !!link.hostname && link.hostname !== location.hostname;

    if (!isExternal) {
      if (/\.(png|jpe?g|gif|svg|webp|pdf|zip|mp4)$/i.test(href)) return null; // media, not pages
      return { handler: internalHandler(link), annotate: true };
    }

    return { handler: externalHandler(link), annotate: !!lookupMetadata(link) };
  }

  function bind(link) {
    var info;
    try {
      info = classify(link);
    } catch (e) {
      return;
    }
    if (!info || !info.handler) return;
    if (info.annotate) link.classList.add("popover-annotated");

    if (isTouch) {
      link.addEventListener("click", function (e) {
        if (activeTarget === link) return; // second tap navigates normally
        e.preventDefault();
        cancelShow();
        info.handler();
      });
    } else {
      link.addEventListener("mouseenter", function () {
        cancelHide();
        cancelShow();
        showTimer = setTimeout(info.handler, SHOW_DELAY);
      });
      link.addEventListener("mouseleave", function () {
        cancelShow();
        scheduleHide();
      });
    }
  }

  function init() {
    buildContainer();
    var links = document.querySelectorAll(".page__content a[href]");
    for (var i = 0; i < links.length; i++) bind(links[i]);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hide();
    });
    if (isTouch) {
      document.addEventListener("click", function (e) {
        if (activeTarget && !container.contains(e.target) && e.target !== activeTarget) hide();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
