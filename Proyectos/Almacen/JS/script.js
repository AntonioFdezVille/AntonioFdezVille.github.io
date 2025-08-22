document.addEventListener('DOMContentLoaded', () => {

    // ---- EFECTO DEL HEADER AL HACER SCROLL ----
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ---- MENÚ DE NAVEGACIÓN MÓVIL ----
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // ---- ANIMACIONES AL APARECER CON SCROLL (INTERSECTION OBSERVER) ----
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Opcional: deja de observar el elemento una vez que es visible
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1 // El elemento se animará cuando el 10% sea visible
    });

    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // ---- VALIDACIÓN DEL FORMULARIO DE CONTACTO ----
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // Lógica del formulario aquí (la misma que antes si quieres)
            console.log('Formulario enviado (simulación)');
            // Puedes añadir aquí un mensaje de "Enviado con éxito"
        });
    }

});