document.addEventListener('DOMContentLoaded', () => {

    // ---- EFECTO DEL HEADER AL HACER SCROLL ----
    // Esta sección ya no es necesaria para el header estático,
    // pero no hace daño dejarla por si quieres volver a cambiarlo en el futuro.
    const header = document.querySelector('.header');
    if (header) { // Comprobación para evitar errores si no hay header
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // ---- MENÚ DE NAVEGACIÓN MÓVIL ----
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
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
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // ---- GESTIÓN DEL ENVÍO DEL FORMULARIO CON AJAX ----
    const contactForm = document.getElementById('contact-form');

    async function handleSubmit(event) {
        event.preventDefault(); // Evita que la página se recargue
        const form = event.target;
        const formMessage = document.getElementById('form-message');
        const data = new FormData(form);

        try {
            const response = await fetch(form.action, {
                method: form.method,
                body: data,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                formMessage.textContent = "¡Gracias! Tu mensaje ha sido enviado.";
                formMessage.className = 'form-message success';
                form.reset(); 
            } else {
                formMessage.textContent = "Error: El formulario no está activado en Formspree o hay un error en los datos.";
                formMessage.className = 'form-message error';
            }
        } catch (error) {
            formMessage.textContent = "Error de conexión. Inténtalo de nuevo.";
            formMessage.className = 'form-message error';
        }
    }

    if (contactForm) {
        contactForm.addEventListener("submit", handleSubmit);
    }
});
