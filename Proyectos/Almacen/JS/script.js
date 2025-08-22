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

   // ---- GESTIÓN DEL ENVÍO DEL FORMULARIO CON AJAX ----
const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message'); // Asegúrate de tener este <p> en tu HTML

async function handleSubmit(event) {
    event.preventDefault(); // Evita que el navegador recargue la página
    const form = event.target;
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
            // Si el envío fue exitoso
            formMessage.textContent = "¡Gracias por tu mensaje! Ha sido enviado correctamente.";
            formMessage.className = 'form-message success'; // Aplica estilos de éxito
            form.reset(); // Limpia el formulario
        } else {
            // Si hubo un error en el servidor
            const responseData = await response.json();
            if (Object.hasOwn(responseData, 'errors')) {
                formMessage.textContent = responseData["errors"].map(error => error["message"]).join(", ");
            } else {
                formMessage.textContent = "Oops! Hubo un problema al enviar tu formulario.";
            }
            formMessage.className = 'form-message error'; // Aplica estilos de error
        }
    } catch (error) {
        // Si hubo un error de red
        formMessage.textContent = "Oops! Hubo un problema de conexión.";
        formMessage.className = 'form-message error';
    }
}

if (contactForm) {
    contactForm.addEventListener("submit", handleSubmit);
}


});
