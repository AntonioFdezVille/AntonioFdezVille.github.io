document.addEventListener('DOMContentLoaded', function() {

    // --- CÓDIGO PARA LA PÁGINA DE PROYECTOS ---
    const pageProjects = document.querySelector('.filter-buttons');
    if (pageProjects) {

        // 1. LÓGICA DEL FILTRO
        const filterButtons = pageProjects.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.projects-grid .project-card');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                pageProjects.querySelector('.active').classList.remove('active');
                button.classList.add('active');
                const filter = button.getAttribute('data-filter');
                projectCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-category') === filter) {
                        card.classList.remove('hide');
                    } else {
                        card.classList.add('hide');
                    }
                });
            });
        });

        // 2. INICIALIZACIÓN DEL EFECTO 3D TILT
        VanillaTilt.init(document.querySelectorAll(".project-card"), {
            max: 15, speed: 400, glare: true, "max-glare": 0.4
        });
    }

    // --- CÓDIGO PARA LA PÁGINA DE INICIO ---
    const indexPage = document.getElementById('animated-headline');
    if (indexPage) {
        // Función para la animación de letras del título
        const text = indexPage.textContent;
        indexPage.innerHTML = '';
        text.split('').forEach((char, index) => {
            const letterSpan = document.createElement('span');
            letterSpan.className = 'letter';
            letterSpan.innerHTML = char === ' ' ? '&nbsp;' : char;
            setTimeout(() => { letterSpan.classList.add('visible'); }, index * 60);
            indexPage.appendChild(letterSpan);
        });
    }
    
    // --- CÓDIGO GLOBAL (PARA TODAS LAS PÁGINAS) ---

    // INICIALIZACIÓN DEL FONDO DE PARTÍCULAS GLOBAL
    const particlesContainer = document.getElementById('particles-js');
    if (particlesContainer) {
        tsParticles.load("particles-js", {
            fpsLimit: 60,
            interactivity: {
                events: {
                    onHover: { enable: true, mode: "repulse" },
                    onClick: { enable: true, mode: "push" },
                },
                modes: { push: { quantity: 4 }, repulse: { distance: 150 } },
            },
            particles: {
                color: { value: "#5DADE2" }, // Color actualizado
                links: { color: "#ffffff", distance: 150, enable: true, opacity: 0.1, width: 1 },
                move: { direction: "none", enable: true, outModes: { default: "bounce" }, speed: 1 },
                number: { density: { enable: true, area: 800 }, value: 80 },
                opacity: { value: 0.2 },
                shape: { type: "circle" },
                size: { value: { min: 1, max: 5 } },
            },
            detectRetina: true,
        });
    }

    // NAVEGACIÓN ACTIVA
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });

    // CURSOR PERSONALIZADO
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    if (cursorDot && cursorOutline) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;
            cursorOutline.animate({ left: `${posX}px`, top: `${posY}px` }, { duration: 500, fill: "forwards" });
        });
        document.querySelectorAll('a, button, .project-card').forEach(el => {
            el.addEventListener('mouseover', () => cursorOutline.classList.add('hovered'));
            el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hovered'));
        });
    }

    // BARRA DE PROGRESO DE SCROLL
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            // Evitar división por cero si la página no tiene scroll
            const scrollPercentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            progressBar.style.width = `${scrollPercentage}%`;
        });
    }

    // EFECTO MAGNÉTICO
    document.querySelectorAll('.magnetic-link').forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });
        el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0, 0)'; });
    });

    // ANIMACIONES AL HACER SCROLL
    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-zoom');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => observer.observe(el));

    // MENÚ HAMBURGUESA
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // FORMULARIO DE CONTACTO
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            const data = new FormData(form);
            const action = form.action;
            const submitBtn = document.getElementById('submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            
            btnText.textContent = 'Enviando...';
            submitBtn.disabled = true;

            fetch(action, {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if (response.ok) {
                    const formContainer = document.getElementById('contact-form-container');
                    const successContainer = document.getElementById('success-message');
                    formContainer.style.transition = 'opacity 0.5s ease';
                    formContainer.style.opacity = '0';
                    setTimeout(() => {
                        formContainer.classList.add('hidden');
                        successContainer.classList.remove('hidden');
                        successContainer.style.opacity = '0';
                        successContainer.style.transition = 'opacity 0.5s ease';
                        setTimeout(() => {
                            successContainer.style.opacity = '1';
                            const confettiCanvas = document.getElementById('confetti-container');
                            if (confetti) {
                                const myConfetti = confetti.create(confettiCanvas, { resize: true, useWorker: true });
                                myConfetti({ particleCount: 150, spread: 160, origin: { y: 0.6 } });
                            }
                        }, 50);
                    }, 500);
                } else {
                    response.json().then(data => {
                        if (Object.hasOwn(data, 'errors')) {
                            alert(data["errors"].map(error => error["message"]).join(", "));
                        } else {
                            alert('Oops! Hubo un problema al enviar tu formulario.');
                        }
                        btnText.textContent = 'Enviar Mensaje';
                        submitBtn.disabled = false;
                    })
                }
            }).catch(error => {
                alert('Oops! Hubo un problema al enviar tu formulario.');
                btnText.textContent = 'Enviar Mensaje';
                submitBtn.disabled = false;
            });
        });
    }
});