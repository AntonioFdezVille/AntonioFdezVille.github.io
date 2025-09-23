document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN DE FIREBASE ---
    const firebaseConfig = {
        apiKey: "AIzaSyB0HJ4sfXG9dOx-VcvwMx6P_b99DIZYGWQ",
        authDomain: "limpiezas-ainara.firebaseapp.com",
        projectId: "limpiezas-ainara",
        storageBucket: "limpiezas-ainara.firebasestorage.app",
        messagingSenderId: "66900781369",
        appId: "1:66900781369:web:101c27ecf5f5fe19e420e8"
    };

    // --- INICIALIZACIÓN ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let currentUser = null;
    let clientesCache = {};
    let pdfBlob = null;

    // --- ELEMENTOS DEL DOM ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const userEmailDisplay = document.getElementById('user-email');
    const btnLogout = document.getElementById('btn-logout');
    const menuItems = document.querySelectorAll('.menu-item');
    const views = document.querySelectorAll('.view');
    const tablaFacturasBody = document.getElementById('tabla-facturas-body');
    const tablaClientesBody = document.getElementById('tabla-clientes-body');
    const formCliente = document.getElementById('form-cliente');
    const clienteFormTitulo = document.getElementById('cliente-form-titulo');
    const clienteIdInput = document.getElementById('cliente-id');
    const btnCancelarEdicionCliente = document.getElementById('btn-cancelar-edicion-cliente');
    const btnNuevaFactura = document.getElementById('btn-nueva-factura');
    const formFactura = document.getElementById('form-factura');
    const facturaIdInput = document.getElementById('factura-id');
    const btnCancelarFactura = document.getElementById('btn-cancelar-factura');
    const selectorClienteFactura = document.getElementById('factura-selector-cliente');
    const btnAnadirLinea = document.getElementById('btn-anadir-linea');
    const cuerpoTablaItems = document.getElementById('cuerpo-tabla-items');
    const modal = document.getElementById('pdf-preview-modal');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const iframe = document.getElementById('pdf-iframe');
    const btnImprimirPDF = document.getElementById('btn-imprimir-pdf');
    const btnDescargarPDF = document.getElementById('btn-descargar-pdf');

    // --- LÓGICA DEL MENÚ HAMBURGUESA ---
    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }

    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', closeMenu);

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Se cierra el menú al seleccionar una opción, útil para móvil
            if (sidebar.classList.contains('open')) {
                closeMenu();
            }
        });
    });

    // --- AUTENTICACIÓN ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userEmailDisplay.textContent = user.email;
            loginContainer.style.display = 'none';
            appContainer.classList.add('visible');
            mostrarVista('vista-facturas'); // Se asegura que la vista inicial coloque el botón a la izquierda
            cargarDatosIniciales();
        } else {
            currentUser = null;
            loginContainer.style.display = 'flex';
            appContainer.classList.remove('visible');
        }
    });

    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = e.target.elements['login-email'].value;
        const password = e.target.elements['login-password'].value;
        auth.signInWithEmailAndPassword(email, password).catch(err => {
            document.getElementById('login-error').textContent = "Error: " + err.message;
        });
    });

    btnLogout.addEventListener('click', () => auth.signOut());

    // --- NAVEGACIÓN ENTRE VISTAS ---
    function mostrarVista(idVista) {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(idVista).classList.add('active');
        menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === idVista);
        });
        // Mover el botón de hamburguesa a la cabecera de la vista activa
        const activeViewHeader = document.querySelector(`#${idVista} .view-header`);
        if (activeViewHeader) {
            activeViewHeader.insertBefore(hamburgerBtn, activeViewHeader.firstChild);
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            mostrarVista(e.currentTarget.dataset.view);
        });
    });
    
    btnNuevaFactura.addEventListener('click', () => {
        formFactura.reset();
        facturaIdInput.value = '';
        document.getElementById('formulario-factura-titulo').textContent = 'Crear Nueva Factura';
        cuerpoTablaItems.innerHTML = '';
        crearNuevaLineaItem();
        document.getElementById('factura-fecha').valueAsDate = new Date();
        mostrarVista('vista-crear-factura');
    });
    
    if(btnCancelarFactura) {
        btnCancelarFactura.addEventListener('click', () => mostrarVista('vista-facturas'));
    }
    
    // --- GESTIÓN DE CLIENTES ---
    async function cargarClientes() {
        if (!currentUser) return;
        const snapshot = await db.collection("clientes").where("userId", "==", currentUser.uid).orderBy("nombre").get();
        clientesCache = {};
        tablaClientesBody.innerHTML = '';
        selectorClienteFactura.innerHTML = '<option value="">-- Elige un cliente --</option>';
        snapshot.forEach(doc => {
            const cliente = doc.data();
            clientesCache[doc.id] = cliente;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${cliente.nombre}</td><td>${cliente.nif || ''}</td><td class="acciones-tabla"><button class="edit" data-id="${doc.id}" title="Editar"><i class='bx bxs-edit'></i></button><button class="delete" data-id="${doc.id}" title="Eliminar"><i class='bx bxs-trash'></i></button></td>`;
            tablaClientesBody.appendChild(tr);
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = cliente.nombre;
            selectorClienteFactura.appendChild(option);
        });
    }

    if(formCliente){
        formCliente.addEventListener('submit', async e => {
            e.preventDefault();
            const clienteId = clienteIdInput.value;
            const datosCliente = {
                nombre: e.target.elements['cliente-nombre'].value,
                nif: e.target.elements['cliente-nif'].value,
                email: e.target.elements['cliente-email'].value,
                direccion: e.target.elements['cliente-direccion'].value,
                userId: currentUser.uid
            };
            try {
                if (clienteId) {
                    await db.collection("clientes").doc(clienteId).update(datosCliente);
                } else {
                    await db.collection("clientes").add(datosCliente);
                }
                formCliente.reset();
                clienteIdInput.value = '';
                clienteFormTitulo.textContent = 'Añadir Nuevo Cliente';
                btnCancelarEdicionCliente.style.display = 'none';
                await cargarClientes();
            } catch(error) {
                console.error("Error guardando cliente: ", error);
            }
        });
    }

    if(tablaClientesBody){
        tablaClientesBody.addEventListener('click', async e => {
            const target = e.target.closest('button');
            if (!target) return;
            const id = target.dataset.id;
            if (target.classList.contains('delete')) {
                if (confirm("¿Seguro que quieres eliminar este cliente?")) {
                    await db.collection("clientes").doc(id).delete();
                    await cargarClientes();
                }
            }
            if (target.classList.contains('edit')) {
                const cliente = clientesCache[id];
                clienteIdInput.value = id;
                document.getElementById('cliente-nombre').value = cliente.nombre;
                document.getElementById('cliente-nif').value = cliente.nif;
                document.getElementById('cliente-email').value = cliente.email;
                document.getElementById('cliente-direccion').value = cliente.direccion;
                clienteFormTitulo.textContent = 'Editar Cliente';
                btnCancelarEdicionCliente.style.display = 'inline-flex';
            }
        });
    }

    if(btnCancelarEdicionCliente){
        btnCancelarEdicionCliente.addEventListener('click', () => {
            formCliente.reset();
            clienteIdInput.value = '';
            clienteFormTitulo.textContent = 'Añadir Nuevo Cliente';
            btnCancelarEdicionCliente.style.display = 'none';
        });
    }
    
    // --- GESTIÓN DE FACTURAS ---
    async function cargarFacturas() {
        if (!currentUser) return;
        const snapshot = await db.collection("facturas").where("userId", "==", currentUser.uid).orderBy("fecha", "desc").get();
        tablaFacturasBody.innerHTML = '';
        snapshot.forEach(doc => {
            const factura = doc.data();
            const clienteNombre = clientesCache[factura.clienteId]?.nombre || 'Cliente Eliminado';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${factura.numero}</td><td>${clienteNombre}</td><td>${new Date(factura.fecha).toLocaleDateString()}</td><td>${factura.total.toFixed(2)} €</td><td><span class="status ${factura.estado}">${factura.estado}</span></td><td class="acciones-tabla"><button class="preview" data-id="${doc.id}" title="Previsualizar"><i class='bx bx-search-alt'></i></button><button class="edit" data-id="${doc.id}" title="Editar"><i class='bx bxs-edit'></i></button><button class="delete" data-id="${doc.id}" title="Eliminar"><i class='bx bxs-trash'></i></button></td>`;
            tablaFacturasBody.appendChild(tr);
        });
    }
    
    if(formFactura){
        formFactura.addEventListener('submit', async e => {
            e.preventDefault();
            const facturaId = facturaIdInput.value;
            const items = [];
            let subtotal = 0;
            document.querySelectorAll('#cuerpo-tabla-items tr').forEach(tr => {
                const descripcion = tr.querySelector('.descripcion').value;
                const cantidad = parseFloat(tr.querySelector('.cantidad').value) || 0;
                const precio = parseFloat(tr.querySelector('.precio').value) || 0;
                if (descripcion && cantidad > 0) {
                    const totalLinea = cantidad * precio;
                    items.push({ descripcion, cantidad, precio, total: totalLinea });
                    subtotal += totalLinea;
                }
            });
            if (items.length === 0) {
                alert("Debes añadir al menos un concepto.");
                return;
            }
            const iva = subtotal * 0.21;
            const total = subtotal + iva;
            const datosFactura = {
                numero: e.target.elements['factura-numero'].value,
                fecha: e.target.elements['factura-fecha'].value,
                clienteId: e.target.elements['factura-selector-cliente'].value,
                items, subtotal, iva, total,
                estado: 'pendiente',
                userId: currentUser.uid
            };
            if (facturaId) {
                await db.collection("facturas").doc(facturaId).update(datosFactura);
            } else {
                await db.collection("facturas").add(datosFactura);
            }
            await cargarFacturas();
            mostrarVista('vista-facturas');
        });
    }

    if(tablaFacturasBody){
        tablaFacturasBody.addEventListener('click', async e => {
            const target = e.target.closest('button');
            if (!target) return;
            const id = target.dataset.id;
            if (target.classList.contains('delete')) {
                if (confirm("¿Seguro que quieres eliminar esta factura?")) {
                    await db.collection("facturas").doc(id).delete();
                    await cargarFacturas();
                }
            }
            if (target.classList.contains('edit')) {
                const docSnap = await db.collection("facturas").doc(id).get();
                if (docSnap.exists) {
                    const factura = docSnap.data();
                    facturaIdInput.value = id;
                    document.getElementById('factura-numero').value = factura.numero;
                    document.getElementById('factura-fecha').value = factura.fecha;
                    selectorClienteFactura.value = factura.clienteId;
                    cuerpoTablaItems.innerHTML = '';
                    factura.items.forEach(item => crearNuevaLineaItem(item));
                    calcularTotalesFactura();
                    document.getElementById('formulario-factura-titulo').textContent = 'Editar Factura';
                    mostrarVista('vista-crear-factura');
                }
            }
            if (target.classList.contains('preview')) {
                const docSnap = await db.collection("facturas").doc(id).get();
                if (docSnap.exists) {
                    await generarYMostrarPDF(docSnap.data());
                }
            }
        });
    }

    function crearNuevaLineaItem(item = null) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="descripcion" placeholder="Descripción del servicio" required value="${item ? item.descripcion : ''}"></td><td><input type="number" class="cantidad" value="${item ? item.cantidad : '1'}" min="0" step="any" required></td><td><input type="number" class="precio" value="${item ? item.precio.toFixed(2) : '0.00'}" step="0.01" required></td><td class="total-linea">${item ? item.total.toFixed(2) : '0.00'} €</td><td class="linea-item-acciones"><button type="button" class="quitar-linea" title="Quitar línea"><i class='bx bx-x-circle'></i></button></td>`;
        cuerpoTablaItems.appendChild(tr);
    }
    
    if(btnAnadirLinea) {
        btnAnadirLinea.addEventListener('click', () => crearNuevaLineaItem());
    }

    if(cuerpoTablaItems){
        cuerpoTablaItems.addEventListener('input', e => {
            if(e.target.classList.contains('cantidad') || e.target.classList.contains('precio')) {
                const tr = e.target.closest('tr');
                const cantidad = parseFloat(tr.querySelector('.cantidad').value) || 0;
                const precio = parseFloat(tr.querySelector('.precio').value) || 0;
                tr.querySelector('.total-linea').textContent = (cantidad * precio).toFixed(2) + ' €';
                calcularTotalesFactura();
            }
        });
        
        cuerpoTablaItems.addEventListener('click', e => {
            if (e.target.closest('.quitar-linea')) {
                e.target.closest('tr').remove();
                calcularTotalesFactura();
            }
        });
    }

    function calcularTotalesFactura() {
        let subtotal = 0;
        document.querySelectorAll('#cuerpo-tabla-items tr').forEach(tr => {
            const cantidad = parseFloat(tr.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(tr.querySelector('.precio').value) || 0;
            subtotal += cantidad * precio;
        });
        const iva = subtotal * 0.21;
        const total = subtotal + iva;
        document.getElementById('subtotal').textContent = `Subtotal: ${subtotal.toFixed(2)} €`;
        document.getElementById('iva').textContent = `IVA (21%): ${iva.toFixed(2)} €`;
        document.getElementById('total-final').textContent = `TOTAL: ${total.toFixed(2)} €`;
    }

    // --- PDF ---
    // Función auxiliar para cargar una imagen y convertirla a Data URL (Base64)
    function imageToDataUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                ctx.drawImage(this, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = function() {
                reject(new Error('No se pudo cargar la imagen desde la ruta: ' + url));
            };
            img.src = url;
        });
    }

    async function generarYMostrarPDF(facturaData) {
        const cliente = clientesCache[facturaData.clienteId];
        if(!cliente) {
            alert("No se pueden encontrar los datos del cliente para esta factura.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        
        try {
            const logoDataUrl = await imageToDataUrl('Fotos/logo.jpg');
            const logoWidth = 90;
            const imgProps = doc.getImageProperties(logoDataUrl);
            const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
            doc.addImage(logoDataUrl, 'JPEG', 40, 40, logoWidth, logoHeight);
        } catch (e) {
            console.error("No se pudo cargar la imagen del logo para el PDF.", e);
            // Fallback: si la imagen no carga, se pone el nombre de la empresa como texto
            doc.setFont("helvetica", "bold"); 
            doc.setFontSize(20); 
            doc.text("Limpiezas Ainara", 40, 50);
        }
        
        doc.setFontSize(26); doc.setFont("helvetica", "bold"); doc.text("FACTURA", 555, 60, { align: 'right' });
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        doc.text(`Nº Factura: ${facturaData.numero}`, 555, 80, { align: 'right' });
        doc.text(`Fecha: ${new Date(facturaData.fecha).toLocaleDateString()}`, 555, 95, { align: 'right' });
        
        let y = 150;
        doc.setFontSize(10);
        doc.text("Limpiezas Ainara", 40, y);
        doc.text("Tu NIF/CIF", 40, y += 15);
        doc.text("Tu Dirección, Granada", 40, y += 15);
        
        doc.text("Facturar a:", 300, 150);
        doc.text(cliente.nombre, 300, 165);
        if(cliente.nif) doc.text(cliente.nif, 300, 180);
        
        y = 240;
        doc.setFont("helvetica", "bold"); doc.setFillColor(240, 240, 240); doc.rect(40, y - 10, 515, 20, 'F');
        doc.text("Concepto", 50, y); doc.text("Cant.", 380, y); doc.text("Precio", 440, y); doc.text("Total", 555, y, { align: 'right' });
        y += 20;
        doc.setFont("helvetica", "normal");
        facturaData.items.forEach(item => {
            const splitTitle = doc.splitTextToSize(item.descripcion, 300);
            doc.text(splitTitle, 50, y);
            doc.text(item.cantidad.toString(), 385, y);
            doc.text(item.precio.toFixed(2) + ' €', 445, y);
            doc.text(item.total.toFixed(2) + ' €', 555, y, { align: 'right' });
            y += (splitTitle.length * 12) + 10;
        });
        
        pdfBlob = doc.output('blob');
        iframe.src = URL.createObjectURL(pdfBlob);
        modal.style.display = 'flex';
    }

    if(btnCerrarModal){
        btnCerrarModal.onclick = () => { modal.style.display = "none"; iframe.src = ''; };
    }
    if(btnDescargarPDF){
        btnDescargarPDF.addEventListener('click', () => {
            if (!pdfBlob) return;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfBlob);
            link.download = `factura.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    if(btnImprimirPDF){
        btnImprimirPDF.addEventListener('click', () => iframe.contentWindow.print());
    }

    // --- INICIALIZACIÓN ---
    async function cargarDatosIniciales() {
        await cargarClientes();
        await cargarFacturas();
    }
    
    // --- Service Worker ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registrado con éxito: ', registration.scope);
            }, err => {
                console.log('El registro de ServiceWorker falló: ', err);
            });
        });
    }
});

