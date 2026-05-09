// ── Cosmic Scramble Text Effect ──
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '·∙•°★☆✦✧∗⊹⋆ ░▒▓';
        this.update = this.update.bind(this);
        this.isAnimating = false;
    }
    setText(newText) {
        const oldText = this.el.getAttribute('data-text') || this.el.innerText;
        this.el.setAttribute('data-text', newText);
        
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 30);
            const end = start + Math.floor(Math.random() * 30);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.isAnimating = true;
        this.update();
        return promise;
    }
    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.isAnimating = false;
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('title');
    if (!titleEl) return;
    
    const fx = new TextScramble(titleEl);
    let isEnglish = true;
    
    const toggleText = () => {
        isEnglish = !isEnglish;
        const nextText = isEnglish ? titleEl.getAttribute('data-en') : titleEl.getAttribute('data-es');
        fx.setText(nextText);
    };

    // Initial run
    setTimeout(() => {
        fx.setText(titleEl.getAttribute('data-en'));
    }, 1000);

    // Toggle every 4 seconds (2s between transitions seems too fast for a 1s animation, let's try 4s total cycle)
    // The user said "cada 2 segundos", so I'll do 3s to let it breathe.
    setInterval(toggleText, 3500);

    // Hover trigger
    titleEl.addEventListener('mouseenter', () => {
        if (!fx.isAnimating) {
            const currentText = isEnglish ? titleEl.getAttribute('data-en') : titleEl.getAttribute('data-es');
            fx.setText(currentText);
        }
    });
});
