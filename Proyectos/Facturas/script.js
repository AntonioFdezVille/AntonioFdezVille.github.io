document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURACIÓN DE FIREBASE ---
    // ¡ASEGÚRATE DE QUE ESTAS SON TUS CLAVES REALES!
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
    let pdfBlob = null; // Variable global para el PDF generado

    // --- ELEMENTOS DEL DOM ---
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
    
    // Elementos del Modal
    const modal = document.getElementById('pdf-preview-modal');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const iframe = document.getElementById('pdf-iframe');
    const btnImprimirPDF = document.getElementById('btn-imprimir-pdf');
    const btnDescargarPDF = document.getElementById('btn-descargar-pdf');

    // --- AUTENTICACIÓN ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userEmailDisplay.textContent = user.email;
            loginContainer.style.display = 'none';
            appContainer.classList.add('visible');
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
    
    btnCancelarFactura.addEventListener('click', () => mostrarVista('vista-facturas'));
    
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
        if (clienteId) {
            await db.collection("clientes").doc(clienteId).update(datosCliente);
            alert("Cliente actualizado");
        } else {
            await db.collection("clientes").add(datosCliente);
            alert("Cliente añadido");
        }
        formCliente.reset();
        clienteIdInput.value = '';
        clienteFormTitulo.textContent = 'Añadir Nuevo Cliente';
        btnCancelarEdicionCliente.style.display = 'none';
        await cargarClientes();
    });

    tablaClientesBody.addEventListener('click', async e => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('delete')) {
            if (confirm("¿Seguro que quieres eliminar este cliente?")) {
                await db.collection("clientes").doc(id).delete();
                await cargarClientes();
                alert("Cliente eliminado.");
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

    btnCancelarEdicionCliente.addEventListener('click', () => {
        formCliente.reset();
        clienteIdInput.value = '';
        clienteFormTitulo.textContent = 'Añadir Nuevo Cliente';
        btnCancelarEdicionCliente.style.display = 'none';
    });
    
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
        if (items.length === 0) return alert("Debes añadir al menos un concepto.");
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
            alert("Factura actualizada");
        } else {
            await db.collection("facturas").add(datosFactura);
            alert("Factura guardada");
        }
        await cargarFacturas();
        mostrarVista('vista-facturas');
    });

    tablaFacturasBody.addEventListener('click', async e => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('delete')) {
            if (confirm("¿Seguro que quieres eliminar esta factura?")) {
                await db.collection("facturas").doc(id).delete();
                await cargarFacturas();
                alert("Factura eliminada.");
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

    function crearNuevaLineaItem(item = null) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="descripcion" required value="${item ? item.descripcion : ''}"></td><td><input type="number" class="cantidad" value="${item ? item.cantidad : '1'}" min="0" step="any" required></td><td><input type="number" class="precio" value="${item ? item.precio.toFixed(2) : '0.00'}" step="0.01" required></td><td class="total-linea">${item ? item.total.toFixed(2) : '0.00'} €</td><td class="linea-item-acciones"><button type="button" class="quitar-linea"><i class='bx bx-x-circle'></i></button></td>`;
        cuerpoTablaItems.appendChild(tr);
    }
    
    btnAnadirLinea.addEventListener('click', () => crearNuevaLineaItem());

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
        const cliente = clientesCache[facturaData.clienteId];
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');

        // --- FUENTES Y COLORES ---
        doc.setFont("helvetica", "normal");
        const primaryColor = "#343a40"; // Gris oscuro casi negro
        const secondaryColor = "#6c757d"; // Gris claro para detalles
        const lightGrayBg = "#f8f9fa"; // Fondo gris muy claro para bloques
        const lineColor = "#dee2e6"; // Color para las líneas finas
        
        doc.setTextColor(primaryColor);

        // --- LOGO Y DATOS DE LA EMPRESA ---
        const logoImg = document.getElementById('logo-para-pdf');
        let logoHeight = 0; // Iniciaremos la altura del logo en 0
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = logoImg.naturalWidth;
            canvas.height = logoImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(logoImg, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');

            // Calcular el alto proporcionalmente para que no se deforme
            const logoWidth = 90; // Ancho fijo en el PDF
            logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
            doc.addImage(dataUrl, 'PNG', 40, 40, logoWidth, logoHeight); // Posición y tamaño del logo
        } catch (e) {
            console.error("Error al cargar logo en PDF:", e);
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Limpiezas Ainara", 40, 50);
            logoHeight = 20; // Asignamos una altura por defecto si el logo falla
        }
        
        // --- CÁLCULO DE POSICIÓN DINÁMICA ---
        // Aquí está la corrección: el texto empieza siempre después del logo
        let currentY = 40 + logoHeight + 15; // Posición inicial debajo del logo + un margen

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Limpiezas Ainara", 40, currentY);
        doc.text("Tu NIF/CIF", 40, currentY += 12);
        doc.text("Tu Dirección, Granada", 40, currentY += 12);
        doc.text("Tu Email", 40, currentY += 12);
        doc.text("Tu Teléfono", 40, currentY += 12);

        // --- ENCABEZADO "FACTURA" Y DATOS DE FACTURA ---
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text("FACTURA", doc.internal.pageSize.getWidth() - 40, 60, { align: 'right' });

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(secondaryColor);
        doc.text("NÚMERO DE FACTURA:", doc.internal.pageSize.getWidth() - 200, 100);
        doc.text("FECHA DE EMISIÓN:", doc.internal.pageSize.getWidth() - 200, 115);
        
        doc.setTextColor(primaryColor);
        doc.text(facturaData.numero, doc.internal.pageSize.getWidth() - 40, 100, { align: 'right' });
        doc.text(new Date(facturaData.fecha).toLocaleDateString(), doc.internal.pageSize.getWidth() - 40, 115, { align: 'right' });

        // --- BLOQUE "FACTURAR A" ---
        let blockY = Math.max(currentY + 30, 180); // Asegura que no se solape con lo de arriba
        doc.setFillColor(lightGrayBg);
        doc.rect(40, blockY - 10, doc.internal.pageSize.getWidth() - 80, 25, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryColor);
        doc.text("FACTURAR A:", 50, blockY + 5);
        
        blockY += 25;
        doc.setFont("helvetica", "normal");
        doc.text(cliente.nombre, 50, blockY);
        if (cliente.nif) doc.text(cliente.nif, 50, blockY + 15);
        if (cliente.direccion) doc.text(cliente.direccion, 50, blockY + 30);
        if (cliente.email) doc.text(cliente.email, 50, blockY + 45);

        // --- TABLA DE CONCEPTOS ---
        let tableY = blockY + 80;
        doc.setFont("helvetica", "bold");
        doc.setFillColor(primaryColor);
        doc.setTextColor("#FFFFFF");
        doc.rect(40, tableY - 10, doc.internal.pageSize.getWidth() - 80, 20, 'F');
        doc.text("CONCEPTO", 50, tableY + 5);
        doc.text("CANT.", 380, tableY + 5);
        doc.text("PRECIO", 430, tableY + 5);
        doc.text("TOTAL", doc.internal.pageSize.getWidth() - 40, tableY + 5, { align: 'right' });
        
        let itemY = tableY + 15;
        doc.setTextColor(primaryColor);
        doc.setFont("helvetica", "normal");
        
        facturaData.items.forEach(item => {
            doc.setDrawColor(lineColor);
            doc.setLineWidth(0.5);
            doc.line(40, itemY - 5, doc.internal.pageSize.getWidth() - 40, itemY - 5);
            
            const splitTitle = doc.splitTextToSize(item.descripcion, 300);
            const lineHeight = (splitTitle.length * 12);
            
            if (itemY + lineHeight > doc.internal.pageSize.getHeight() - 120) {
                doc.addPage();
                itemY = 60;
            }

            doc.text(splitTitle, 50, itemY + 8);
            doc.text(item.cantidad.toString(), 385, itemY + 8);
            doc.text(item.precio.toFixed(2) + ' €', 435, itemY + 8);
            doc.text(item.total.toFixed(2) + ' €', doc.internal.pageSize.getWidth() - 40, itemY + 8, { align: 'right' });
            
            itemY += lineHeight + 15;
        });
        
        doc.setDrawColor(lineColor);
        doc.setLineWidth(0.5);
        doc.line(40, itemY - 10, doc.internal.pageSize.getWidth() - 40, itemY - 10);


        // --- TOTALES ---
        let totalsY = itemY + 20;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Subtotal:`, 400, totalsY);
        doc.text(`${facturaData.subtotal.toFixed(2)} €`, doc.internal.pageSize.getWidth() - 40, totalsY, { align: 'right' });
        totalsY += 20;

        doc.text(`IVA (21%):`, 400, totalsY);
        doc.text(`${facturaData.iva.toFixed(2)} €`, doc.internal.pageSize.getWidth() - 40, totalsY, { align: 'right' });
        
        totalsY += 15;
        doc.setDrawColor(primaryColor);
        doc.setLineWidth(1.5);
        doc.line(400, totalsY, doc.internal.pageSize.getWidth() - 40, totalsY);
        totalsY += 20;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`TOTAL:`, 400, totalsY);
        doc.text(`${facturaData.total.toFixed(2)} €`, doc.internal.pageSize.getWidth() - 40, totalsY, { align: 'right' });

        // --- PIE DE PÁGINA ---
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(secondaryColor);
        doc.text("Gracias por su confianza.", 40, pageHeight - 40);
        
        // --- MOSTRAR PDF EN EL MODAL ---
        pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        iframe.src = pdfUrl;
        modal.style.display = 'flex';
    }
    // --- EVENT LISTENERS DEL MODAL (CORREGIDO) ---
    btnCerrarModal.addEventListener('click', () => {
        modal.style.display = "none";
        iframe.src = '';
        URL.revokeObjectURL(pdfBlob); // Libera memoria
    });
    
    btnDescargarPDF.addEventListener('click', () => {
        if (!pdfBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = `factura.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    btnImprimirPDF.addEventListener('click', () => {
        if (!iframe.src) return;
        iframe.contentWindow.print();
    });

    // --- INICIALIZACIÓN ---
    async function cargarDatosIniciales() {
        await cargarClientes();
        await cargarFacturas();
    }
});
