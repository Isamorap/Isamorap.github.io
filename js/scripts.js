document.addEventListener("DOMContentLoaded", function () {
    let currentLang = "en";
    currentLang = localStorage.getItem("selectedLanguage") || currentLang;
    const languageToggle = document.getElementById("language-toggle");

    document.body.style.visibility = "hidden";

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem("selectedLanguage", lang);
    
        document.querySelectorAll("[data-en], [data-es]").forEach(element => {
            const key = element.hasAttribute(`data-${lang}`) ? `data-${lang}` : "data-en";
            element.textContent = element.getAttribute(key);
        });
    
        languageToggle.textContent = lang === "en" ? "🇨🇱 Esp" : "🇬🇧 Eng";    
        document.body.style.visibility = "visible";
    }

    languageToggle.addEventListener("click", function () {
        currentLang = currentLang === "en" ? "es" : "en";
        setLanguage(currentLang);
    });

    setLanguage(currentLang);

    // ── Cosmic Scramble Text Effect ──
    class TextScramble {
        constructor(el) {
            this.el = el;
            this.chars = '·∙•°★☆✦✧∗⊹⋆ ░▒▓';
            this.update = this.update.bind(this);
            this.isAnimating = false;
        }
        setText(newText) {
            // Use the data-text attribute as the "real" base to avoid scrambling duds
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

    const titleEl = document.getElementById('title');
    const fx = new TextScramble(titleEl);

    // Initial run
    setTimeout(() => {
        const targetText = titleEl.getAttribute(`data-${currentLang}`) || titleEl.getAttribute('data-en');
        fx.setText(targetText);
    }, 1000);

    // Hover trigger
    titleEl.addEventListener('mouseenter', () => {
        if (!fx.isAnimating) {
            const targetText = titleEl.getAttribute(`data-${currentLang}`) || titleEl.getAttribute('data-en');
            fx.setText(targetText);
        }
    });

});


window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});


document.querySelector('.contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            alert('¡Mensaje enviado con éxito!');
            form.reset();
        } else {
            alert('Hubo un problema al enviar el mensaje. Intenta de nuevo.');
        }
    } catch (error) {
        alert('Error al conectar con el servidor.');
    }
});