// Return random quote

function formatQuote(quote, author) {
    quote = quote.bold() + "<br> - " + author;
    quote = "<blockquote>" + quote + "</blockquote>";
    return quote;
}

quotes = [
    ["Ah, but a man's reach should exceed his grasp, <br>Or what's a heaven for?", "Robert Browning"],
    ["The most important step a man can take. It's not the first one, is it? It's the next one. Always the next step, Dalinar.", "Dalinar Kholin"],
    ["It matters not how strait the gate, <br>How charged with punishments the scroll, <br>I am the master of my fate,<br>I am the captain of my soul.\n", "William Ernest Henley"],
    ["Do not go gentle into that good night. <br>Rage, rage against the dying of the light.", "Dylan Thomas"],
    ["How do you eat an elephant? <br>One bite at a time.", "(Attributed to) Confucius"],
    ["<a href='https://www.sefaria.org/sheets/49421.9?lang=bi&with=all&lang2=en'>This too shall pass</a>", "Persian Adage"],
]

quote = quotes[Math.floor(Math.random() * quotes.length)];
quote = formatQuote(quote[0], quote[1]);

document.write(quote);
