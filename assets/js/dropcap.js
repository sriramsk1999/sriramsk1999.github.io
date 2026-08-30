/*
 * Small-caps opening flourish to go with the CSS drop cap (see .page__content
 * ::first-letter in _sass/_page.scss). Deliberately NOT done with the CSS
 * ::first-line pseudo-element: combining a floated ::first-letter with
 * ::first-line is a known Firefox line-box bug (produced a visible blank gap
 * after the first linked phrase on the About page). Wrapping a fixed word
 * budget in real <span>s sidesteps that entirely.
 */
(function () {
  "use strict";

  var WORD_BUDGET = 12;

  function wordCount(text) {
    var m = text.match(/\S+/g);
    return m ? m.length : 0;
  }

  function applyTo(p) {
    var consumed = 0;
    var node = p.firstChild;

    while (node && consumed < WORD_BUDGET) {
      var next = node.nextSibling;

      if (node.nodeType === Node.TEXT_NODE) {
        var text = node.textContent;
        var tokens = text.split(/(\s+)/);
        var out = "";
        var i = 0;
        for (; i < tokens.length; i++) {
          var token = tokens[i];
          if (token.trim() !== "") {
            if (consumed >= WORD_BUDGET) break;
            consumed++;
          }
          out += token;
        }
        var remainder = tokens.slice(i).join("");
        if (out) {
          var span = document.createElement("span");
          span.className = "dropcap-smallcaps";
          span.textContent = out;
          node.parentNode.insertBefore(span, node);
        }
        if (remainder) {
          node.textContent = remainder;
        } else {
          node.parentNode.removeChild(node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // never split inside an element, but a small overshoot past the budget
        // to finish one is fine - better than stopping mid-phrase
        node.classList.add("dropcap-smallcaps");
        consumed += wordCount(node.textContent);
      }

      node = next;
    }
  }

  function init() {
    var p = document.querySelector(".page__content > p:first-of-type, .page__content > .page__lead + p");
    if (p) applyTo(p);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
