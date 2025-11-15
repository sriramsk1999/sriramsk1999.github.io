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
    ["The struggle itself towards the heights is enough to fill a man's heart. One must imagine Sisyphus happy.", "Albert Camus"],
    ["कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। <br>मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥ २-४७<br><br> You have the right to work only but never to its fruits. <br> Let not the fruits of action be your motive, nor let your attachment be to inaction.", "Bhagavad Gita, Chapter 2, Verse: 47"],
    ["<a href='https://www.sefaria.org/sheets/49421.9?lang=bi&with=all&lang2=en'>This too shall pass</a>", "Persian Adage"],
]

quote = quotes[Math.floor(Math.random() * quotes.length)];
quote = formatQuote(quote[0], quote[1]);

document.write(quote);
