(function () {
  "use strict";

  var quotes = [
    ["Ah, but a man's reach should exceed his grasp, <br>Or what's a heaven for?", "Robert Browning"],
    ["The most important step a man can take. It's not the first one, is it? It's the next one. Always the next step, Dalinar.", "Dalinar Kholin"],
    ["It matters not how strait the gate, <br>How charged with punishments the scroll, <br>I am the master of my fate,<br>I am the captain of my soul.\n", "William Ernest Henley"],
    ["Do not go gentle into that good night. <br>Rage, rage against the dying of the light.", "Dylan Thomas"],
    ["How do you eat an elephant? <br>One bite at a time.", "(Attributed to) Confucius"],
    ["The struggle itself towards the heights is enough to fill a man's heart. One must imagine Sisyphus happy.", "Albert Camus"],
    ["कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। <br>मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥ २-४७<br><br> You have the right to work only but never to its fruits. <br> Let not the fruits of action be your motive, nor let your attachment be to inaction.", "Bhagavad Gita, Chapter 2, Verse: 47"],
    ["<a href='https://www.sefaria.org/sheets/49421.9?lang=bi&with=all&lang2=en'>This too shall pass</a>", "Persian Adage"],
    ["No man ever steps in the same river twice, for it is not the same river and he is not the same man.", "Heraclitus"],
    ["Talent is something you make bloom, instinct is something you polish.", "Oikawa Tōru"],
    ["We work in the dark - we do what we can - we give what we have. Our doubt is our passion, and our passion is our task. The rest is the madness of art.", "Henry James"]
  ];

  function init() {
    var container = document.getElementById("quote-widget");
    if (!container) return;

    var lastIndex = -1;

    function pickIndex() {
      if (quotes.length === 1) return 0;
      var i;
      do { i = Math.floor(Math.random() * quotes.length); } while (i === lastIndex);
      return i;
    }

    var REFRESH_ICON =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>' +
      "</svg>";

    function render(index) {
      lastIndex = index;
      var quote = quotes[index];
      container.innerHTML =
        '<div class="quote-box">' +
          '<blockquote class="quote-box__text">' + quote[0] + "</blockquote>" +
          '<div class="quote-box__footer">' +
            '<cite class="quote-box__author">' + quote[1] + "</cite>" +
            '<button type="button" class="quote-box__refresh" aria-label="Show another quote" title="Show another quote">' + REFRESH_ICON + "</button>" +
          "</div>" +
        "</div>";
      container.querySelector(".quote-box__refresh").addEventListener("click", function () {
        render(pickIndex());
      });
    }

    render(pickIndex());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
