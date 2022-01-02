// Return random quote

function formatQuote(quote, author) {
    quote = quote.bold() + " - " + author;
    quote = "<blockquote>" + quote + "</blockquote>";
    return quote;
}

quotes = [
    [`A man's reach should exceed his grasp, or what's a heaven for?`, `Robert Browning`],
    [`The most important step a man can take. It's not the first one, is it? It's the next one. Always the next step, Dalinar.`, `Dalinar Kholin`],
]

quote = quotes[Math.floor(Math.random() * quotes.length)];
quote = formatQuote(quote[0], quote[1]);

document.write(quote);
