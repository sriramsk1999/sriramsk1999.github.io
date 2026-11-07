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

  var container, titlebarTitle, body;
  var showTimer = null;
  var hideTimer = null;
  var activeTarget = null;
  var internalPageCache = Object.create(null);

  function buildContainer() {
    container = document.createElement("div");
    container.id = "popover-container";
    container.innerHTML =
      '<div class="popover">' +
        '<div class="popover__titlebar">' +
          '<span class="popover__title"></span>' +
        "</div>" +
        '<div class="popover__body"></div>' +
      "</div>";
    document.body.appendChild(container);
    titlebarTitle = container.querySelector(".popover__title");
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

  function show(target, titleHtml, bodyHtml) {
    activeTarget = target;
    titlebarTitle.innerHTML = titleHtml || "";
    body.innerHTML = bodyHtml;

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

  // Most sites block being framed (X-Frame-Options/CSP), so live-iframe previews
  // are only offered for domains verified not to - see _scripts/fetch_link_metadata.rb.
  function isLiveEmbeddable(hostname) {
    return !!(window.GW_liveLinkDomains && window.GW_liveLinkDomains[hostname] === true);
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

  function lookupLocalArchive(link) {
    if (!window.GW_localArchives) return null;
    return window.GW_localArchives[link.href] || window.GW_localArchives[link.getAttribute("href")] || null;
  }

  // What an external link's popover will show, in priority order. The single
  // source of truth for both externalHandler (what to render) and classify
  // (which link indicator to draw), so the two can't drift apart.
  function externalMode(link) {
    // a domain that blocks framing but has a curated local snapshot (see
    // _scripts/archive_pages.rb): iframe that same-origin copy instead -
    // this is gwern's own trick (build/LinkArchive.hs), just for a small
    // manually-curated list instead of his ~14,000-page archive
    if (lookupLocalArchive(link)) return "archive";
    // live-embeddable domains: show the actual page directly, no card, no toggle
    if (isLiveEmbeddable(link.hostname)) return "live";
    // otherwise, gwern's own fallback when live isn't available: an annotation
    // (here, build-time-fetched title/description) if we have one
    if (lookupMetadata(link)) return "annotation";
    return "none";
  }

  function externalHandler(link) {
    return function () {
      var domain = hostnameOf(link.href);
      var mode = externalMode(link);

      if (mode === "archive") {
        show(link, escapeHtml(domain), '<iframe class="popover__iframe" src="' + escapeAttr(lookupLocalArchive(link)) + '"></iframe>');
        return;
      }

      if (mode === "live") {
        show(link, escapeHtml(domain), '<iframe class="popover__iframe" src="' + escapeAttr(link.href) + '"></iframe>');
        return;
      }

      var meta = lookupMetadata(link);
      var openLink = '<p class="popover__open"><a href="' + escapeAttr(link.href) + '" target="_blank" rel="noopener">Open ' +
        escapeHtml(domain) + " ↗</a></p>";

      if (meta) {
        var favicon = meta.favicon
          ? '<img class="popover__favicon" src="' + escapeAttr(meta.favicon) + '" alt="" onerror="this.remove()">'
          : "";
        var titleHtml = favicon + escapeHtml(meta.title || domain) +
          '<span class="popover__domain"> — ' + escapeHtml(domain) + "</span>";
        var descHtml = meta.description
          ? "<p>" + escapeHtml(meta.description) + "</p>"
          : '<p class="popover__empty">No description available.</p>';
        show(link, titleHtml, descHtml + openLink);
      } else {
        show(link, escapeHtml(domain), '<p class="popover__empty">No preview available.</p>' + openLink);
      }
    };
  }

  /* ----- link indicators (see "POP-FRAME INDICATORS" in _sass/_popovers.scss) ----- */

  // gwern's indicator hook (extracts.js addTargetsWithin): an empty span as
  // the link's first child, which CSS draws as the "L" tick. Plus a U+2060
  // WORD JOINER prepended to the link's first text node so the line can't
  // break between the tick and the first word - it must go INTO the existing
  // text node; a separate node causes text-shadow artifacts (per gwern).
  function addIndicatorHook(link) {
    if (!link.closest(".page__content")) return; // only where the underline CSS applies
    if (link.querySelector(".indicator-hook")) return; // bindWithin can re-run on a container

    // first text node with visible text - links with none (image-only) have
    // no underline for a hook to join
    var walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return /\S/.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
    });
    var firstText = walker.nextNode();
    if (!firstText) return;

    var hook = document.createElement("span");
    hook.className = "indicator-hook";
    link.insertBefore(hook, link.firstChild);
    if (firstText.textContent.charAt(0) !== "⁠") firstText.textContent = "⁠" + firstText.textContent;
    link.classList.add("has-indicator-hook");
  }

  function applyIndicator(link, indicator) {
    if (indicator === "content") addIndicatorHook(link);
    else if (indicator === "annotation") link.classList.add("has-annotation");
  }

  /* ----- binding ----- */

  // indicator: "content" (popover shows the page itself -> hook),
  // "annotation" (popover shows a summary card -> dotted underline), or null
  function classify(link) {
    var href = link.getAttribute("href");
    if (!href) return null;
    if (link.classList.contains("footnote")) return { handler: footnoteHandler(link), indicator: null };
    if (href.charAt(0) === "#") return null; // in-page anchors (TOC etc.)
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;

    var isExternal = !!link.hostname && link.hostname !== location.hostname;

    if (!isExternal) {
      if (/\.(png|jpe?g|gif|svg|webp|pdf|zip|mp4)$/i.test(href)) return null; // media, not pages
      return { handler: internalHandler(link), indicator: "content" };
    }

    var mode = externalMode(link);
    var indicator = (mode === "archive" || mode === "live") ? "content"
                  : (mode === "annotation") ? "annotation"
                  : null;
    return { handler: externalHandler(link), indicator: indicator };
  }

  function bind(link) {
    var info;
    try {
      info = classify(link);
    } catch (e) {
      return;
    }
    if (!info || !info.handler) return;
    try { applyIndicator(link, info.indicator); } catch (e) { /* cosmetic only - still bind the popover */ }

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

  function bindWithin(root) {
    var links = root.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) bind(links[i]);
  }

  function init() {
    buildContainer();
    // the page's own content only - never document.body, or the masthead nav
    // (Home/Publications/Blog) and footer get popovers too. Archive-layout
    // pages (publications, mlmonad) have no .page__content; their content
    // lives in .archive instead.
    var content = document.querySelector(".page__content") || document.querySelector(".archive");
    if (content) bindWithin(content);
    var authorUrls = document.querySelectorAll(".author__urls");
    for (var i = 0; i < authorUrls.length; i++) bindWithin(authorUrls[i]);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hide();
    });
    if (isTouch) {
      document.addEventListener("click", function (e) {
        if (activeTarget && !container.contains(e.target) && e.target !== activeTarget) hide();
      });
    }
  }

  // exposed so other scripts (e.g. quotes.js) can bind popovers onto content
  // they inject dynamically after this initial pass runs
  window.GW_popovers = { bindWithin: bindWithin };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
