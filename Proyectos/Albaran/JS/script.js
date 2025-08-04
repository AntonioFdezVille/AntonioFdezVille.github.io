document.addEventListener('DOMContentLoaded', () => {

    const cards = document.querySelectorAll('.doc-card');

    cards.forEach((card, index) => {
        // Esto es para la animación de entrada
        card.style.animationDelay = `${index * 100}ms`;

        // Esto es lo que hace que el botón sea "clicable"
        card.addEventListener('click', () => {
            // Coge la ruta del atributo 'data-url'
            const url = card.getAttribute('data-url');
            
            if (url) {
                // Y te redirige a esa página
                window.location.href = url;
            }
        });
    });

});