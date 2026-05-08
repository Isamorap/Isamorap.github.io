const logo = document.querySelector('.logo');
const tryMeMessage = document.getElementById('try-me-message');
const themes = ['cyan-theme', 'midnight-theme', 'nord-theme', 'emerald-theme', 'amethyst-theme', 'crimson-theme', 'sunset-theme', 'ghost-theme']; // Array de temas (en themes.css)
let currentThemeIndex = 0; // Índice del tema actual

// Función para cambiar el tema
function changeTheme(themeName) {
    document.body.classList.remove(...themes); // Elimina todas las clases de tema existentes
    document.body.classList.add(themeName); // Añade la nueva clase de tema
}

function showTryMeMessage() {
    tryMeMessage.style.display = 'inline';
    localStorage.setItem('messageShown', 'true');
}

function hideTryMeMessage() {
    tryMeMessage.style.display = 'none';
}

// Evento click en el logo
logo.addEventListener('click', () => {
    // Avanzar al siguiente tema
    currentThemeIndex = (currentThemeIndex + 1) % themes.length; // Usamos el operador % (módulo) para volver al inicio si llegamos al final del array
    const nextTheme = themes[currentThemeIndex];
    changeTheme(nextTheme);

    // Ocultar el mensaje después del primer click
    hideTryMeMessage();
});

// Mostrar el mensaje "Intenta presionarme" si es la primera vez
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('messageShown') === null) {
        showTryMeMessage();

        // Ocultar el mensaje después de unos segundos (opcional)
        setTimeout(hideTryMeMessage, 2000); // 5 segundos
    }
    document.body.classList.add(themes[0]); // Añade la clase del primer tema al body
});