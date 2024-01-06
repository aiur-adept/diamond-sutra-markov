var MarkovChain = require('markovchain');
var sutra = require('./diamond_sutra.json');
var text = sutra.join(' ');
const markov = new MarkovChain(text);

let ix = 0;

const src = ['*'];

function generateAndDisplayText() {
    let txt = ';';
    let gold = false;

    if ((ix > 1 && ix % 32) == 1 || Math.random() < 0.01) {
        txt = sutra[Math.floor(Math.random() * sutra.length)];
        gold = true;
    } else if (Math.random() < 0.80) {
        const n = Math.floor(Math.random() * 108);
        for (let i = 0; i < n; i++) {
            txt += src[Math.floor(Math.random() * src.length)];
            if (i % 32 == 0) {
                txt += ' ';
            }
        }
    } else {
        txt = markov.start('what').end(8 + Math.floor(Math.random() * 26)).process();
    }

    const txtElem = document.createElement('div');
    txtElem.classList.add('txt');
    if (gold) {
        txtElem.style.color = 'gold';
    }

    // Simulate typing effect
    const typingSpeed = 5; // milliseconds per character
    let charIndex = 0;

    function typeCharacter() {
        if (charIndex < txt.length) {
            txtElem.textContent += txt[charIndex];
            charIndex++;
            scrollToBottom();
            setTimeout(typeCharacter, typingSpeed);
        }
    }

    typeCharacter();

    document.getElementById('terminal').appendChild(txtElem);

    ix++;
}


function scrollToBottom() {
    var terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}

window.addEventListener('keydown', function (event) {
    generateAndDisplayText();
});

document.getElementById('terminal').addEventListener('click', function (event) {
    generateAndDisplayText();
});
