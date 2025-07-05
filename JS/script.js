// Scroll suave solo para anclas en la misma página
document.querySelectorAll('nav a').forEach(link => {
  const href = link.getAttribute('href');
  if (href && href.startsWith('#')) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
    });
  }
});

// Animación de aparición al hacer scroll
function revealSections() {
  document.querySelectorAll('section').forEach(sec => {
    const rect = sec.getBoundingClientRect();
    if (rect.top < window.innerHeight - 80) sec.classList.add('visible');
  });
}
window.addEventListener('scroll', revealSections);
window.addEventListener('load', revealSections);

// Formulario de contacto solo en index.html
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('formMsg').textContent = "¡Gracias por tu mensaje! Te responderé pronto.";
    this.reset();
  });
}

// Marcar menú activo según la página
const navLinks = document.querySelectorAll('nav a');
const page = location.pathname.split('/').pop();
navLinks.forEach(link => {
  link.classList.remove('active');
  if (
    link.getAttribute('href') === page ||
    (page === '' && link.getAttribute('href') === 'index.html')
  ) {
    link.classList.add('active');
  }
});
