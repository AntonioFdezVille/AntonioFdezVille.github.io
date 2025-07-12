// script.js

// Espera a que todo el HTML se haya cargado
document.addEventListener('DOMContentLoaded', function() {

    // 1. Seleccionamos los dos elementos con los que vamos a trabajar
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    // 2. Nos aseguramos de que ambos elementos existan antes de continuar
    if (navToggle && navMenu) {

        // 3. Añadimos un "escuchador" de eventos al botón.
        //    Esto hará que se ejecute una función cada vez que se haga clic en él.
        navToggle.addEventListener('click', function() {

            // 4. La magia: cada vez que se hace clic, se añade o se quita la clase 'nav-menu--visible'.
            //    El CSS se encargará de mostrar u ocultar el menú basado en si tiene esta clase o no.
            navMenu.classList.toggle('nav-menu--visible');

        });
    }
});