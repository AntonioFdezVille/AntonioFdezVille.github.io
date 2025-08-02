document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DEL MENÚ HAMBURGUESA ---
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            hamburger.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
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
        if (document.body.classList.contains('pedido-page')) {
            displayCartItems();
        }
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

    const displayCartItems = () => {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalElement = document.getElementById('cart-total');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '';
            let total = 0;
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
            } else {
                cart.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.classList.add('cart-item');
                    itemElement.innerHTML = `<div class="cart-item-info"><strong>${item.name}</strong><span>${(item.price * item.quantity).toFixed(2)}€</span></div><div class="quantity-controls"><button class="quantity-btn" onclick="decreaseQuantity('${item.name}')">-</button><span class="item-quantity">${item.quantity}</span><button class="quantity-btn" onclick="increaseQuantity('${item.name}')">+</button></div>`;
                    cartItemsContainer.appendChild(itemElement);
                    total += item.price * item.quantity;
                });
            }
            if(cartTotalElement) cartTotalElement.textContent = `${total.toFixed(2)}€`;
        }
    };
    
    // --- LÓGICA DE AUTOCOMPLETADO CON OPENSTREETMAP ---
    const addressInput = document.getElementById('address');
    const resultsContainer = document.getElementById('search-results-container');
    let debounceTimer;

    if (addressInput) {
        addressInput.addEventListener('input', (e) => {
            const query = e.target.value;
            clearTimeout(debounceTimer);
            if (query.length < 3) {
                resultsContainer.innerHTML = '';
                return;
            }
            debounceTimer = setTimeout(() => {
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=es&addressdetails=1`)
                    .then(response => response.json())
                    .then(data => {
                        resultsContainer.innerHTML = '';
                        data.forEach(place => {
                            const item = document.createElement('div');
                            item.classList.add('search-result-item');
                            item.textContent = place.display_name;
                            item.addEventListener('click', () => {
                                addressInput.value = place.display_name;
                                resultsContainer.innerHTML = '';
                            });
                            resultsContainer.appendChild(item);
                        });
                    })
                    .catch(err => console.error(err));
            }, 500);
        });
        document.addEventListener('click', (e) => {
            if (e.target.id !== 'address') {
                resultsContainer.innerHTML = '';
            }
        });
    }

    // --- LÓGICA DE ENVÍO DE FORMULARIO CON FORMSPREE ---
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = orderForm.name.value.trim();
            const phone = orderForm.phone.value.trim();
            const address = orderForm.address.value.trim();
            if (cart.length === 0) {
                alert("Tu carrito está vacío.");
                return;
            }
            if (!name || !phone || !address) {
                alert("Por favor, rellena Nombre, Teléfono y Dirección.");
                return;
            }
            const formData = {
                nombre: name,
                telefono: phone,
                direccion: address,
                detalles: orderForm.detalles.value.trim(),
                pago: orderForm.payment.value,
                pedido: cart.map(item => `${item.quantity}x ${item.name}`).join('\n'),
                total: document.getElementById('cart-total').textContent
            };
            const submitButton = orderForm.querySelector('.btn-submit');
            submitButton.textContent = 'Enviando...';
            submitButton.disabled = true;

            fetch('https://formspree.io/f/mblkagke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(response => {
                if (response.ok) {
                    alert("¡Pedido enviado con éxito! Gracias por tu compra.");
                    cart = [];
                    saveCart();
                    orderForm.reset();
                } else {
                    alert("Hubo un error al enviar el pedido. Por favor, inténtalo de nuevo.");
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Hubo un error de conexión. Por favor, inténtalo de nuevo.");
            })
            .finally(() => {
                submitButton.textContent = 'Confirmar Pedido';
                submitButton.disabled = false;
            });
        });
    }

    // --- INICIALIZACIÓN ---
    updateCartCount();
    if (document.body.classList.contains('pedido-page')) {
        displayCartItems();
    }
});