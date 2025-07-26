document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DEL MENÚ HAMBURGUESA ---
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // --- EFECTO PRELOADER ---
    window.onload = () => {
        document.body.classList.add('loaded');
    };

    // --- EFECTO SPOTLIGHT Y CURSOR PERSONALIZADO ---
    const cursor = document.querySelector('.cursor');
    const interactiveElements = document.querySelectorAll('a, button');
    document.addEventListener('mousemove', (e) => {
        document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
        document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
        if (cursor) {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        }
    });
    interactiveElements.forEach(el => {
        el.addEventListener('mouseover', () => cursor && cursor.classList.add('grow'));
        el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('grow'));
    });

    // --- ANIMACIÓN DE TÍTULO PRINCIPAL ---
    const headline = document.getElementById('main-headline');
    if (headline) {
        const text = headline.textContent;
        headline.innerHTML = '';
        text.split('').forEach((letter, i) => {
            const span = document.createElement('span');
            span.textContent = letter === ' ' ? '\u00A0' : letter;
            span.style.animationDelay = `${i * 0.05}s`;
            headline.appendChild(span);
        });
    }

    // --- ANIMACIONES AL HACER SCROLL ---
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    const elementsToAnimate = document.querySelectorAll('.menu-card, .featured-section h2, .featured-section p, .page-title');
    elementsToAnimate.forEach(el => observer.observe(el));

    // --- LÓGICA DEL CARRITO DE COMPRAS ---
    let cart = JSON.parse(localStorage.getItem('burgerHubCart')) || [];

    const saveCart = () => {
        localStorage.setItem('burgerHubCart', JSON.stringify(cart));
        updateCartCount();
        displayCartItems(); // Actualizar la vista siempre que se guarde
    };

    window.addToCart = (name, price) => {
        const existingItem = cart.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ name, price, quantity: 1 });
        }
        saveCart();
    };
    
    // NUEVAS FUNCIONES PARA CANTIDAD
    window.increaseQuantity = (name) => {
        const item = cart.find(item => item.name === name);
        if (item) {
            item.quantity++;
            saveCart();
        }
    };

    window.decreaseQuantity = (name) => {
        const item = cart.find(item => item.name === name);
        if (item) {
            item.quantity--;
            if (item.quantity <= 0) {
                // Eliminar el artículo si la cantidad es 0 o menos
                cart = cart.filter(cartItem => cartItem.name !== name);
            }
            saveCart();
        }
    };
    
    const updateCartCount = () => {
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCountElement.textContent = totalItems;
        }
    };

    // --- LÓGICA PÁGINA DE PEDIDOS (ACTUALIZADA) ---
    const displayCartItems = () => {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalElement = document.getElementById('cart-total');

        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';
            let total = 0;
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p>Tu carrito está vacío. ¡Añade unas burgers!</p>';
            } else {
                cart.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.classList.add('cart-item');
                    // Estructura actualizada con controles de cantidad
                    itemElement.innerHTML = `
                        <div class="cart-item-info">
                            <strong>${item.name}</strong>
                            <span>${(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="decreaseQuantity('${item.name}')">-</button>
                            <span class="item-quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="increaseQuantity('${item.name}')">+</button>
                        </div>
                    `;
                    cartItemsContainer.appendChild(itemElement);
                    total += item.price * item.quantity;
                });
            }
            if(cartTotalElement) cartTotalElement.textContent = `${total.toFixed(2)}€`;
        }
    };
    
    const orderForm = document.getElementById('order-form');
    if(orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if(cart.length === 0) {
                alert("Tu carrito está vacío. No puedes hacer un pedido.");
                return;
            }
            
            // Recoger datos del nuevo formulario
            const formData = {
                nombre: orderForm.name.value,
                telefono: orderForm.phone.value,
                direccion: {
                    municipio: orderForm.municipio.value,
                    calle: orderForm.calle.value,
                    detalles: orderForm.detalles.value
                },
                pago: orderForm.payment.value,
                pedido: cart,
                total: document.getElementById('cart-total').textContent
            };

            console.log("Pedido Final:", formData);
            alert(`¡Pedido confirmado, ${formData.nombre}! Gracias por tu compra.`);
            
            cart = [];
            saveCart();
            orderForm.reset();
        });
    }

    // --- INICIALIZACIÓN ---
    updateCartCount();
    // Llamar a displayCartItems solo si estamos en la página de pedidos
    if (document.body.classList.contains('pedido-page')) {
        displayCartItems();
    }
});