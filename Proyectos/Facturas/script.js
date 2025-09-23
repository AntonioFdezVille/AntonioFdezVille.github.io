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
    let currentFacturaDataForPDF = {};


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
            if (window.innerWidth <= 992) {
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
            mostrarVista('vista-facturas');
            cargarDatosIniciales();
        } else {
            currentUser = null;
            loginContainer.style.display = 'flex';
            appContainer.classList.remove('visible');
            // Limpiar datos al cerrar sesión
            tablaFacturasBody.innerHTML = '';
            tablaClientesBody.innerHTML = '';
            clientesCache = {};
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
        const vistaActiva = document.getElementById(idVista);
        if(vistaActiva) {
            vistaActiva.classList.add('active');
            const activeViewHeader = vistaActiva.querySelector('.view-header');
            if (activeViewHeader && window.innerWidth <= 992) {
                activeViewHeader.insertBefore(hamburgerBtn, activeViewHeader.firstChild);
            }
        }
        menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === idVista);
        });
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

    if (btnCancelarFactura) {
        btnCancelarFactura.addEventListener('click', () => mostrarVista('vista-facturas'));
    }

    // --- GESTIÓN DE CLIENTES ---
    async function cargarClientes() {
        if (!currentUser) return;
        try {
            const snapshot = await db.collection("clientes").where("userId", "==", currentUser.uid).orderBy("nombre").get();
            clientesCache = {};
            tablaClientesBody.innerHTML = '';
            selectorClienteFactura.innerHTML = '<option value="">-- Elige un cliente --</option>';
            snapshot.forEach(doc => {
                const cliente = doc.data();
                clientesCache[doc.id] = cliente;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Nombre">${cliente.nombre}</td>
                    <td data-label="NIF/CIF">${cliente.nif || ''}</td>
                    <td class="acciones-tabla">
                        <button class="edit" data-id="${doc.id}" title="Editar"><i class='bx bxs-edit'></i></button>
                        <button class="delete" data-id="${doc.id}" title="Eliminar"><i class='bx bxs-trash'></i></button>
                    </td>`;
                tablaClientesBody.appendChild(tr);
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = cliente.nombre;
                selectorClienteFactura.appendChild(option);
            });
        } catch(error) {
            console.error("Error al cargar clientes:", error);
        }
    }

    if (formCliente) {
        formCliente.addEventListener('submit', async e => {
            e.preventDefault();
            const clienteId = clienteIdInput.value;
            const datosCliente = {
                nombre: e.target.elements['cliente-nombre'].value.trim(),
                nif: e.target.elements['cliente-nif'].value.trim(),
                email: e.target.elements['cliente-email'].value.trim(),
                direccion: e.target.elements['cliente-direccion'].value.trim(),
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
            } catch (error) {
                console.error("Error guardando cliente: ", error);
            }
        });
    }

    if (tablaClientesBody) {
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

    if (btnCancelarEdicionCliente) {
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
        try {
            const snapshot = await db.collection("facturas").where("userId", "==", currentUser.uid).orderBy("fecha", "desc").get();
            tablaFacturasBody.innerHTML = '';
            snapshot.forEach(doc => {
                const factura = doc.data();
                const clienteNombre = clientesCache[factura.clienteId]?.nombre || 'Cliente Eliminado';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Nº Factura">${factura.numero}</td>
                    <td data-label="Cliente">${clienteNombre}</td>
                    <td data-label="Fecha">${new Date(factura.fecha).toLocaleDateString()}</td>
                    <td data-label="Total">${factura.total.toFixed(2)} €</td>
                    <td data-label="Estado"><span class="status ${factura.estado}">${factura.estado}</span></td>
                    <td class="acciones-tabla">
                        <button class="preview" data-id="${doc.id}" title="Previsualizar"><i class='bx bx-search-alt'></i></button>
                        <button class="edit" data-id="${doc.id}" title="Editar"><i class='bx bxs-edit'></i></button>
                        <button class="delete" data-id="${doc.id}" title="Eliminar"><i class='bx bxs-trash'></i></button>
                    </td>`;
                tablaFacturasBody.appendChild(tr);
            });
        } catch(error) {
            console.error("Error al cargar facturas:", error);
        }
    }

    if (formFactura) {
        formFactura.addEventListener('submit', async e => {
            e.preventDefault();
            const facturaId = facturaIdInput.value;
            const items = [];
            let subtotal = 0;
            document.querySelectorAll('#cuerpo-tabla-items tr').forEach(tr => {
                const descripcion = tr.querySelector('.descripcion').value.trim();
                const cantidad = parseFloat(tr.querySelector('.cantidad').value) || 0;
                const precio = parseFloat(tr.querySelector('.precio').value) || 0;
                if (descripcion && cantidad > 0 && precio >= 0) {
                    const totalLinea = cantidad * precio;
                    items.push({
                        descripcion,
                        cantidad,
                        precio,
                        total: totalLinea
                    });
                    subtotal += totalLinea;
                }
            });
            if (items.length === 0) {
                alert("Debes añadir al menos un concepto válido.");
                return;
            }
            const iva = subtotal * 0.21;
            const total = subtotal + iva;
            const datosFactura = {
                numero: e.target.elements['factura-numero'].value,
                fecha: e.target.elements['factura-fecha'].value,
                clienteId: e.target.elements['factura-selector-cliente'].value,
                items,
                subtotal,
                iva,
                total,
                estado: 'pendiente',
                userId: currentUser.uid
            };
            if (!datosFactura.clienteId) {
                alert("Debes seleccionar un cliente.");
                return;
            }
            if (facturaId) {
                await db.collection("facturas").doc(facturaId).update(datosFactura);
            } else {
                await db.collection("facturas").add(datosFactura);
            }
            await cargarFacturas();
            mostrarVista('vista-facturas');
        });
    }

    if (tablaFacturasBody) {
        tablaFacturasBody.addEventListener('click', async e => {
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
                    currentFacturaDataForPDF = docSnap.data(); // Guardamos los datos
                    await generarYMostrarPDF(currentFacturaDataForPDF);
                }
            }
        });
    }

    function crearNuevaLineaItem(item = null) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="descripcion" placeholder="Descripción del servicio" required value="${item ? item.descripcion : ''}"></td><td><input type="number" class="cantidad" value="${item ? item.cantidad : '1'}" min="0" step="any" required></td><td><input type="number" class="precio" value="${item ? item.precio.toFixed(2) : '0.00'}" step="0.01" required></td><td class="total-linea">${item ? item.total.toFixed(2) : '0.00'} €</td><td class="linea-item-acciones"><button type="button" class="quitar-linea" title="Quitar línea"><i class='bx bx-x-circle'></i></button></td>`;
        cuerpoTablaItems.appendChild(tr);
    }

    if (btnAnadirLinea) {
        btnAnadirLinea.addEventListener('click', () => crearNuevaLineaItem());
    }

    if (cuerpoTablaItems) {
        cuerpoTablaItems.addEventListener('input', e => {
            if (e.target.classList.contains('cantidad') || e.target.classList.contains('precio')) {
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
    async function generarYMostrarPDF(facturaData) {
        // --- INSTRUCCIONES ---
        // 1. Convierte tu imagen 'logo.jpg' a Base64 en https://www.base64-image.de/
        // 2. Copia el código de texto resultante.
        // 3. Pega ese código de texto entre las comillas de abajo, reemplazando el texto de ejemplo.
        const logoBase64 = "pega_aqui_el_codigo_base64";

        const cliente = clientesCache[facturaData.clienteId];
        if (!cliente) {
            alert("No se pueden encontrar los datos del cliente para esta factura.");
            return;
        }

        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        // Colores en escala de grises
        const headerColor = '#444444';
        const tableHeaderColor = '#E0E0E0';
        const textColor = '#333333';
        const lightGray = '#F5F5F5';
        const white = '#FFFFFF';
        const lineColor = '#CCCCCC';

        doc.setFont('helvetica');

        try {
            if (logoBase64 && logoBase64 !== "pega_aqui_el_codigo_base64") {
                const logoWidth = 90;
                const imgProps = doc.getImageProperties(logoBase64);
                const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
                doc.addImage(logoBase64, 'JPEG', 40, 40, logoWidth, logoHeight);
            } else {
                throw new Error("El código Base64 del logo no ha sido añadido al script.");
            }
        } catch (e) {
            console.warn(e.message);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textColor);
            doc.text("Limpiezas Ainara", 40, 60);
        }

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(headerColor);
        doc.text("FACTURA", pageWidth - 40, 80, {
            align: 'right'
        });

        doc.setFontSize(10);
        doc.setTextColor(textColor);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nº Factura: ${facturaData.numero}`, pageWidth - 40, 120, {
            align: 'right'
        });
        doc.text(`Fecha: ${new Date(facturaData.fecha).toLocaleDateString()}`, pageWidth - 40, 135, {
            align: 'right'
        });

        let y = 180;
        doc.setLineWidth(0.5);
        doc.setDrawColor(lineColor);
        doc.line(40, y, pageWidth - 40, y);
        y += 25;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColor);
        doc.text("Facturado por:", 40, y);
        doc.text("Facturar a:", pageWidth / 2, y);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textColor);
        y += 15;
        doc.text("Limpiezas Ainara", 40, y);
        doc.text(cliente.nombre, pageWidth / 2, y);
        y += 15;
        doc.text("B00000000", 40, y);
        if (cliente.nif) doc.text(cliente.nif, pageWidth / 2, y);
        y += 15;
        doc.text("Calle Falsa 123, 18001, Granada", 40, y);
        if (cliente.direccion) {
            const clientAddress = doc.splitTextToSize(cliente.direccion, (pageWidth / 2) - 60);
            doc.text(clientAddress, pageWidth / 2, y);
            y += (clientAddress.length -1) * 12;
        }

        y += 30;

        const tableTop = y;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(tableHeaderColor);
        doc.setTextColor(textColor);
        doc.rect(40, tableTop, pageWidth - 80, 25, 'F');
        doc.text("CONCEPTO", 50, tableTop + 17);
        doc.text("CANT.", 370, tableTop + 17, {
            align: 'right'
        });
        doc.text("PRECIO UNIT.", 460, tableTop + 17, {
            align: 'right'
        });
        doc.text("TOTAL", pageWidth - 50, tableTop + 17, {
            align: 'right'
        });

        y = tableTop + 25;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textColor);

        facturaData.items.forEach((item, index) => {
            const descLines = doc.splitTextToSize(item.descripcion, 300);
            // Se calcula un espaciado extra para asegurar que no se solape el texto
            const rowHeight = (descLines.length * 14) + 10; 
            
            doc.setFillColor(index % 2 === 0 ? white : lightGray);
            doc.rect(40, y, pageWidth - 80, rowHeight, 'F');

            // Posicionamiento vertical centrado del texto
            const textY = y + rowHeight / 2 - ((descLines.length -1) * 14) / 2 + 3;

            doc.text(descLines, 50, textY);
            doc.text(item.cantidad.toString(), 370, textY, {
                align: 'right'
            });
            doc.text(item.precio.toFixed(2) + ' €', 460, textY, {
                align: 'right'
            });
            doc.text(item.total.toFixed(2) + ' €', pageWidth - 50, textY, {
                align: 'right'
            });

            y += rowHeight;
        });

        y += 20;
        const totalX = pageWidth - 200;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("Subtotal:", totalX, y);
        doc.text(`${facturaData.subtotal.toFixed(2)} €`, pageWidth - 40, y, {
            align: 'right'
        });
        y += 15;
        doc.text("IVA (21%):", totalX, y);
        doc.text(`${facturaData.iva.toFixed(2)} €`, pageWidth - 40, y, {
            align: 'right'
        });
        y += 10;

        doc.setFillColor(headerColor);
        doc.rect(totalX - 10, y, 170, 30, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(white);
        doc.text("TOTAL:", totalX, y + 20);
        doc.text(`${facturaData.total.toFixed(2)} €`, pageWidth - 40, y + 20, {
            align: 'right'
        });
        
        const footerY = pageHeight - 60;
        doc.setLineWidth(0.5);
        doc.setDrawColor(lineColor);
        doc.line(40, footerY, pageWidth - 40, footerY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(textColor);
        doc.text("Gracias por su confianza.", pageWidth / 2, footerY + 15, {
            align: 'center'
        });

        pdfBlob = doc.output('blob');
        iframe.src = URL.createObjectURL(pdfBlob);
        modal.style.display = 'flex';
    }


    if (btnCerrarModal) {
        btnCerrarModal.onclick = () => {
            modal.style.display = "none";
            iframe.src = '';
            currentFacturaDataForPDF = {}; // Limpiamos los datos
        };
    }
    if (btnDescargarPDF) {
        btnDescargarPDF.addEventListener('click', () => {
            if (!pdfBlob) return;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pdfBlob);
            const nombreFactura = `Factura-${currentFacturaDataForPDF.numero || 'SIN-NUM'}.pdf`;
            link.download = nombreFactura.replace(/[/\\?%*:|"<>]/g, '-');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    if (btnImprimirPDF) {
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
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('ServiceWorker registrado con éxito: ', registration.scope);
            }, err => {
                console.log('El registro de ServiceWorker falló: ', err);
            });
        });
    }
});

