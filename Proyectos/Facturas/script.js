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
    const btnNuevaFacturaMensual = document.getElementById('btn-nueva-factura-mensual');
    const tablaFacturasMensualesBody = document.getElementById('tabla-facturas-mensuales-body');
    const formFacturaMensual = document.getElementById('form-factura-mensual');
    const facturaMensualIdInput = document.getElementById('factura-mensual-id');
    const btnCancelarFacturaMensual = document.getElementById('btn-cancelar-factura-mensual');
    const selectorClienteFacturaMensual = document.getElementById('factura-mensual-selector-cliente');
    const gruposContainer = document.getElementById('grupos-de-servicios-container');
    const btnAnadirGrupo = document.getElementById('btn-anadir-grupo');

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
            if (window.innerWidth <= 992) closeMenu();
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

    // --- NAVEGACIÓN Y FUNCIONES AUXILIARES ---
    function mostrarVista(idVista) {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(idVista)?.classList.add('active');
        menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === idVista);
        });
    }

    menuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const viewId = e.currentTarget.dataset.view;
            if (viewId === 'vista-facturas-mensuales') {
                cargarFacturasMensuales();
            }
            mostrarVista(viewId);
        });
    });

    // --- GESTIÓN DE CLIENTES ---
    async function cargarClientes() {
        if (!currentUser) return;
        try {
            const snapshot = await db.collection("clientes").orderBy("nombre").get();
            clientesCache = {};
            tablaClientesBody.innerHTML = '';
            const optionsHTML = '<option value="">-- Cargar datos de un cliente --</option>' +
                snapshot.docs.map(doc => {
                    const cliente = doc.data();
                    clientesCache[doc.id] = cliente;
                    tablaClientesBody.innerHTML += `
                        <tr>
                            <td data-label="Nombre">${cliente.nombre}</td>
                            <td data-label="NIF/CIF">${cliente.nif || ''}</td>
                            <td class="acciones-tabla">
                                <button class="edit" data-id="${doc.id}" title="Editar"><i class='bx bxs-edit'></i></button>
                                <button class="delete" data-id="${doc.id}" title="Eliminar"><i class='bx bxs-trash'></i></button>
                            </td>
                        </tr>`;
                    return `<option value="${doc.id}">${cliente.nombre}</option>`;
                }).join('');
            selectorClienteFactura.innerHTML = optionsHTML;
            selectorClienteFacturaMensual.innerHTML = optionsHTML;
        } catch (error) { console.error("Error al cargar clientes:", error); }
    }

    function rellenarDatosCliente(selector, prefijo) {
        const clienteId = selector.value;
        const nombreInput = document.getElementById(`${prefijo}-cliente-nombre`);
        const nifInput = document.getElementById(`${prefijo}-cliente-nif`);
        const direccionInput = document.getElementById(`${prefijo}-cliente-direccion`);
        if (clienteId && clientesCache[clienteId]) {
            const cliente = clientesCache[clienteId];
            nombreInput.value = cliente.nombre || '';
            nifInput.value = cliente.nif || '';
            direccionInput.value = cliente.direccion || '';
        } else {
            nombreInput.value = '';
            nifInput.value = '';
            direccionInput.value = '';
        }
    }
    selectorClienteFactura.addEventListener('change', () => rellenarDatosCliente(selectorClienteFactura, 'factura'));
    selectorClienteFacturaMensual.addEventListener('change', () => rellenarDatosCliente(selectorClienteFacturaMensual, 'factura-mensual'));

    formCliente.addEventListener('submit', async e => {
        e.preventDefault();
        const clienteId = clienteIdInput.value;
        const datosCliente = {
            nombre: e.target.elements['cliente-nombre'].value.trim(),
            nif: e.target.elements['cliente-nif'].value.trim(),
            direccion: e.target.elements['cliente-direccion'].value.trim()
        };
        try {
            const collection = db.collection("clientes");
            if (clienteId) await collection.doc(clienteId).update(datosCliente);
            else await collection.add(datosCliente);
            formCliente.reset();
            clienteIdInput.value = '';
            clienteFormTitulo.textContent = 'Añadir Nuevo Cliente';
            btnCancelarEdicionCliente.style.display = 'none';
            await cargarClientes();
        } catch (error) { console.error("Error guardando cliente: ", error); }
    });

    tablaClientesBody.addEventListener('click', async e => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        if (target.classList.contains('delete')) {
            if (confirm("¿Seguro que quieres eliminar este cliente?")) {
                try {
                    await db.collection("clientes").doc(id).delete();
                    await cargarClientes();
                } catch (error) { console.error("Error al eliminar cliente:", error); }
            }
        }
        if (target.classList.contains('edit')) {
            const cliente = clientesCache[id];
            if (cliente) {
                clienteIdInput.value = id;
                document.getElementById('cliente-nombre').value = cliente.nombre;
                document.getElementById('cliente-nif').value = cliente.nif || '';
                document.getElementById('cliente-direccion').value = cliente.direccion || '';
                clienteFormTitulo.textContent = 'Editar Cliente';
                btnCancelarEdicionCliente.style.display = 'inline-flex';
                formCliente.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    btnCancelarEdicionCliente.addEventListener('click', () => {
        formCliente.reset();
        clienteIdInput.value = '';
        clienteFormTitulo.textContent = 'Añadir Nuevo Cliente';
        btnCancelarEdicionCliente.style.display = 'none';
    });

    // --- GESTIÓN DE FACTURAS SIMPLES ---
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

    function crearNuevaLineaItem(item = null) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="descripcion" placeholder="Servicio de limpieza" value="${item ? item.descripcion : ''}" required></td>
            <td><input type="text" class="cantidad" placeholder="ej: 2h 30min" value="${item ? item.cantidad : '1'}"></td>
            <td><input type="text" class="precio" placeholder="ej: 14,00€" value="${item ? item.precio : ''}"></td>
            <td><input type="text" class="total-linea-input" placeholder="35,00" value="${item ? (item.total || 0).toFixed(2).replace('.',',') : '0,00'}"></td>
            <td class="linea-item-acciones"><button type="button" class="quitar-linea" title="Quitar línea"><i class='bx bx-x-circle'></i></button></td>`;
        cuerpoTablaItems.appendChild(tr);
    }

    function calcularTotalesFactura() {
        let subtotal = 0;
        document.querySelectorAll('#cuerpo-tabla-items .total-linea-input').forEach(input => {
            subtotal += parseFloat(input.value.replace(',', '.')) || 0;
        });
        const iva = subtotal * 0.21;
        const total = subtotal + iva;
        document.getElementById('subtotal').textContent = `Subtotal: ${subtotal.toFixed(2).replace('.',',')}€`;
        document.getElementById('iva').textContent = `IVA (21%): ${iva.toFixed(2).replace('.',',')}€`;
        document.getElementById('total-final').textContent = `TOTAL: ${total.toFixed(2).replace('.',',')}€`;
    }

    async function cargarFacturas() {
        if (!currentUser) return;
        try {
            const snapshot = await db.collection("facturas").orderBy("fecha", "desc").get();
            tablaFacturasBody.innerHTML = '';
            snapshot.forEach(doc => {
                const factura = doc.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Nº Factura">${factura.numero}</td>
                    <td data-label="Cliente">${factura.clienteNombre || ''}</td>
                    <td data-label="Fecha">${new Date(factura.fecha).toLocaleDateString('es-ES')}</td>
                    <td data-label="Total">${(factura.total || 0).toFixed(2).replace('.',',')}€</td>
                    <td class="acciones-tabla">
                        <button class="preview" data-id="${doc.id}" data-type="simple" title="Previsualizar"><i class='bx bx-search-alt'></i></button>
                        <button class="edit" data-id="${doc.id}" data-type="simple" title="Editar"><i class='bx bxs-edit'></i></button>
                        <button class="delete" data-id="${doc.id}" data-type="simple" title="Eliminar"><i class='bx bxs-trash'></i></button>
                    </td>`;
                tablaFacturasBody.appendChild(tr);
            });
        } catch (error) { console.error("Error al cargar facturas:", error); }
    }

    formFactura.addEventListener('submit', async e => {
        e.preventDefault();
        const facturaId = facturaIdInput.value;
        const items = [];
        document.querySelectorAll('#cuerpo-tabla-items tr').forEach(tr => {
            const total = parseFloat(tr.querySelector('.total-linea-input').value.replace(',', '.')) || 0;
            if (tr.querySelector('.descripcion').value.trim()) {
                items.push({
                    descripcion: tr.querySelector('.descripcion').value.trim(),
                    cantidad: tr.querySelector('.cantidad').value.trim(),
                    precio: tr.querySelector('.precio').value.trim(),
                    total
                });
            }
        });
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const iva = subtotal * 0.21;
        const total = subtotal + iva;
        const datosFactura = {
            numero: document.getElementById('factura-numero').value,
            fecha: document.getElementById('factura-fecha').value,
            clienteNombre: document.getElementById('factura-cliente-nombre').value,
            clienteNif: document.getElementById('factura-cliente-nif').value,
            clienteDireccion: document.getElementById('factura-cliente-direccion').value,
            items, subtotal, iva, total,
            formaDePago: document.getElementById('factura-forma-pago').value,
            observaciones: document.getElementById('factura-observaciones').value,
        };
        try {
            const collection = db.collection("facturas");
            if (facturaId) await collection.doc(facturaId).update(datosFactura);
            else await collection.add(datosFactura);
            await cargarFacturas();
            mostrarVista('vista-facturas');
        } catch (error) { console.error("Error guardando factura: ", error); }
    });

    cuerpoTablaItems.addEventListener('input', e => {
        if (e.target.classList.contains('total-linea-input')) {
            calcularTotalesFactura();
        }
    });

    cuerpoTablaItems.addEventListener('click', e => {
        if (e.target.closest('.quitar-linea')) {
            e.target.closest('tr').remove();
            calcularTotalesFactura();
        }
    });

    btnAnadirLinea.addEventListener('click', () => crearNuevaLineaItem());

    // --- LÓGICA DE GESTIÓN DE FACTURAS (AMBOS TIPOS) ---
    document.querySelector('.content').addEventListener('click', async (e) => {
        const button = e.target.closest('button.edit, button.delete, button.preview');
        if (!button) return;
        const id = button.dataset.id;
        const type = button.dataset.type;
        const collectionName = type === 'simple' ? 'facturas' : 'facturasMensuales';
        const collection = db.collection(collectionName);

        if (button.classList.contains('delete')) {
            if (confirm(`¿Seguro que quieres eliminar esta factura?`)) {
                await collection.doc(id).delete();
                type === 'simple' ? cargarFacturas() : cargarFacturasMensuales();
            }
        } else if (button.classList.contains('edit')) {
            const docSnap = await collection.doc(id).get();
            if (!docSnap.exists) return;
            if (type === 'simple') {
                const f = docSnap.data();
                facturaIdInput.value = id;
                document.getElementById('factura-numero').value = f.numero;
                document.getElementById('factura-fecha').value = f.fecha;
                document.getElementById('factura-cliente-nombre').value = f.clienteNombre || '';
                document.getElementById('factura-cliente-nif').value = f.clienteNif || '';
                document.getElementById('factura-cliente-direccion').value = f.clienteDireccion || '';
                document.getElementById('factura-forma-pago').value = f.formaDePago || 'Transferencia';
                document.getElementById('factura-observaciones').value = f.observaciones || '';
                cuerpoTablaItems.innerHTML = '';
                (f.items || []).forEach(item => crearNuevaLineaItem(item));
                calcularTotalesFactura();
                document.getElementById('formulario-factura-titulo').textContent = 'Editar Factura';
                mostrarVista('vista-crear-factura');
            } else {
                editarFacturaMensual(id, docSnap.data());
            }
        } else if (button.classList.contains('preview')) {
            const docSnap = await collection.doc(id).get();
            if (!docSnap.exists) return;
            currentFacturaDataForPDF = docSnap.data();
            if (type === 'simple') await generarPDFSimple(currentFacturaDataForPDF);
            else await generarPDFMensual(currentFacturaDataForPDF);
        }
    });

    // --- GESTIÓN DE FACTURAS MENSUALES (VERSIÓN FINAL FLEXIBLE) ---
    btnNuevaFacturaMensual.addEventListener('click', () => {
        formFacturaMensual.reset();
        facturaMensualIdInput.value = '';
        document.getElementById('formulario-factura-mensual-titulo').textContent = 'Crear Factura Mensual';
        gruposContainer.innerHTML = '';
        anadirGrupoDeServicios();
        document.getElementById('factura-mensual-fecha').valueAsDate = new Date();
        calcularTotalesFacturaMensual();
        mostrarVista('vista-crear-factura-mensual');
    });

    btnCancelarFacturaMensual.addEventListener('click', () => mostrarVista('vista-facturas-mensuales'));
    btnAnadirGrupo.addEventListener('click', anadirGrupoDeServicios);

    function anadirGrupoDeServicios(grupo = null) {
        const divGrupo = document.createElement('div');
        divGrupo.className = 'grupo-servicio';
        const nombreGrupo = grupo ? grupo.nombre : '';
        const tipoGrupo = grupo ? grupo.tipo : 'horas';
        divGrupo.innerHTML = `
            <div class="grupo-servicio-header">
                <div class="form-group">
                    <label>Nombre del Grupo (ej: Limpieza, Lavandería)</label>
                    <input type="text" class="nombre-grupo" value="${nombreGrupo}" required>
                </div>
                <button type="button" class="btn-eliminar-grupo btn btn-secundario" title="Eliminar Grupo"><i class='bx bxs-trash'></i></button>
            </div>
            <div class="form-group grupo-servicio-tipo">
                <label>Tipo de Tabla para este Grupo</label>
                <select class="selector-tipo-tabla">
                    <option value="horas" ${tipoGrupo === 'horas' ? 'selected' : ''}>Horas y Precio</option>
                    <option value="fijo" ${tipoGrupo === 'fijo' ? 'selected' : ''}>Precio Fijo</option>
                </select>
            </div>
            <div class="contenedor-tabla"></div>
            <div class="grupo-servicio-acciones">
                <button type="button" class="btn btn-anadir-servicio" style="width: auto; padding: 8px 12px;"><i class='bx bx-plus'></i> Añadir Servicio</button>
            </div>`;
        gruposContainer.appendChild(divGrupo);
        generarTablaParaGrupo(divGrupo.querySelector('.selector-tipo-tabla'), grupo ? grupo.items : null);
    }

    function generarTablaParaGrupo(selector, items = null) {
        const tipo = selector.value;
        const contenedor = selector.closest('.grupo-servicio').querySelector('.contenedor-tabla');
        let headersHTML = tipo === 'horas' ?
            `<tr><th>Fecha</th><th>Servicio</th><th>Horas</th><th>Precio</th><th>Total</th><th></th></tr>` :
            `<tr><th>Fecha</th><th>Servicio</th><th>Precio Fijo</th><th>Total</th><th></th></tr>`;
        contenedor.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table tabla-servicios-mensuales" data-tipo-tabla="${tipo}">
                    <thead>${headersHTML}</thead>
                    <tbody></tbody>
                </table>
            </div>`;
        const tablaBody = contenedor.querySelector('tbody');
        if (items) {
            items.forEach(item => anadirLineaServicio(tablaBody, tipo, item));
        }
    }

    function anadirLineaServicio(tablaBody, tipo, item = null) {
        const tr = document.createElement('tr');
        if (tipo === 'horas') {
            tr.innerHTML = `
                <td><input type="date" class="item-fecha" value="${item ? item.fecha : ''}"></td>
                <td><input type="text" class="item-descripcion" placeholder="Descripción" value="${item ? item.descripcion : ''}"></td>
                <td><input type="text" class="item-horas" placeholder="2h 30min" value="${item ? item.horas : ''}"></td>
                <td><input type="text" class="item-precio" placeholder="14,00€" value="${item ? item.precio : ''}"></td>
                <td class="item-total">${item ? (item.total || 0).toFixed(2).replace('.', ',') : '0,00'}€</td>
                <td class="linea-item-acciones"><button type="button" class="quitar-linea"><i class='bx bx-x-circle'></i></button></td>`;
        } else {
            tr.innerHTML = `
                <td><input type="date" class="item-fecha" value="${item ? item.fecha : ''}"></td>
                <td><input type="text" class="item-descripcion" placeholder="Descripción" value="${item ? item.precio_fijo : ''}"></td>
                <td><input type="text" class="item-precio-fijo" placeholder="15,00€" value="${item ? item.precio_fijo : ''}"></td>
                <td class="item-total">${item ? (item.total || 0).toFixed(2).replace('.', ',') : '0,00'}€</td>
                <td class="linea-item-acciones"><button type="button" class="quitar-linea"><i class='bx bx-x-circle'></i></button></td>`;
        }
        tablaBody.appendChild(tr);
    }

    gruposContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('selector-tipo-tabla')) {
            generarTablaParaGrupo(e.target);
        }
    });

    gruposContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.btn-anadir-servicio')) {
            const grupo = target.closest('.grupo-servicio');
            const tipo = grupo.querySelector('.selector-tipo-tabla').value;
            anadirLineaServicio(grupo.querySelector('tbody'), tipo);
        } else if (target.closest('.quitar-linea')) {
            target.closest('tr').remove();
            calcularTotalesFacturaMensual();
        } else if (target.closest('.btn-eliminar-grupo')) {
            if (confirm("¿Seguro que quieres eliminar este grupo de servicios?")) {
                target.closest('.grupo-servicio').remove();
                calcularTotalesFacturaMensual();
            }
        }
    });

    gruposContainer.addEventListener('input', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const parseCurrency = (str) => {
            if (!str || typeof str !== 'string') return 0;
            return parseFloat(str.replace(/€/g, '').trim().replace(',', '.')) || 0;
        };
        const parseHoras = (str) => {
            if (!str || typeof str !== 'string') return 0;
            str = str.toLowerCase().replace(',', '.');
            let totalHoras = 0;
            if (str.includes('h')) {
                const parts = str.split('h');
                totalHoras += parseFloat(parts[0]) || 0;
                if (parts[1]) totalHoras += (parseFloat(parts[1].replace('min', '').trim()) || 0) / 60;
            } else { totalHoras = parseFloat(str) || 0; }
            return totalHoras;
        };
        let totalLinea = 0;
        const tipoTabla = tr.closest('table').dataset.tipoTabla;
        if (tipoTabla === 'horas') {
            const horas = parseHoras(tr.querySelector('.item-horas')?.value);
            const precio = parseCurrency(tr.querySelector('.item-precio')?.value);
            totalLinea = horas * precio;
        } else {
            totalLinea = parseCurrency(tr.querySelector('.item-precio-fijo')?.value);
        }
        tr.querySelector('.item-total').textContent = `${totalLinea.toFixed(2).replace('.', ',')}€`;
        calcularTotalesFacturaMensual();
    });

    function calcularTotalesFacturaMensual() {
        let subtotalGeneral = 0;
        document.querySelectorAll('.item-total').forEach(el => {
            subtotalGeneral += parseFloat(el.textContent.replace(/€/g, '').trim().replace(',', '.')) || 0;
        });
        const iva = subtotalGeneral * 0.21;
        const total = subtotalGeneral + iva;
        document.getElementById('subtotal-mensual').textContent = `Subtotal: ${subtotalGeneral.toFixed(2).replace('.', ',')}€`;
        document.getElementById('iva-mensual').textContent = `IVA (21%): ${iva.toFixed(2).replace('.', ',')}€`;
        document.getElementById('total-final-mensual').textContent = `TOTAL: ${total.toFixed(2).replace('.', ',')}€`;
    }

    formFacturaMensual.addEventListener('submit', async (e) => {
        e.preventDefault();
        const facturaId = facturaMensualIdInput.value;
        const grupos = [];
        document.querySelectorAll('.grupo-servicio').forEach(divGrupo => {
            const tabla = divGrupo.querySelector('.tabla-servicios-mensuales');
            if (!tabla) return;
            const tipo = tabla.dataset.tipoTabla;
            const items = [];
            tabla.querySelectorAll('tbody tr').forEach(tr => {
                const totalStr = tr.querySelector('.item-total').textContent || '0';
                const itemData = {
                    fecha: tr.querySelector('.item-fecha').value,
                    descripcion: tr.querySelector('.item-descripcion').value.trim(),
                    total: parseFloat(totalStr.replace(/€/g, '').trim().replace(',', '.')) || 0
                };
                if (tipo === 'horas') {
                    itemData.horas = tr.querySelector('.item-horas').value;
                    itemData.precio = tr.querySelector('.item-precio').value;
                } else {
                    itemData.precio_fijo = tr.querySelector('.item-precio-fijo').value;
                }
                if (itemData.descripcion) items.push(itemData);
            });
            if (items.length > 0) {
                grupos.push({
                    nombre: divGrupo.querySelector('.nombre-grupo').value.trim(),
                    tipo: tipo,
                    items: items
                });
            }
        });
        const subtotalGeneral = parseFloat(document.getElementById('subtotal-mensual').textContent.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
        const iva = parseFloat(document.getElementById('iva-mensual').textContent.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
        const totalFinal = parseFloat(document.getElementById('total-final-mensual').textContent.replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;
        const datosFactura = {
            numero: document.getElementById('factura-mensual-numero').value,
            fecha: document.getElementById('factura-mensual-fecha').value,
            clienteNombre: document.getElementById('factura-mensual-cliente-nombre').value,
            clienteNif: document.getElementById('factura-mensual-cliente-nif').value,
            clienteDireccion: document.getElementById('factura-mensual-cliente-direccion').value,
            grupos, subtotalGeneral, iva, totalFinal
        };
        try {
            const collection = db.collection("facturasMensuales");
            if (facturaId) await collection.doc(facturaId).update(datosFactura);
            else await collection.add(datosFactura);
            await cargarFacturasMensuales();
            mostrarVista('vista-facturas-mensuales');
        } catch (error) { console.error("Error guardando factura mensual: ", error); }
    });

    async function cargarFacturasMensuales() {
        if (!currentUser) return;
        try {
            const snapshot = await db.collection("facturasMensuales").orderBy("fecha", "desc").get();
            tablaFacturasMensualesBody.innerHTML = '';
            snapshot.forEach(doc => {
                const factura = doc.data();
                const tr = document.createElement('tr');
                const totalMostrado = typeof factura.totalFinal === 'number' ? factura.totalFinal : 0;
                tr.innerHTML = `
                    <td data-label="Nº Factura">${factura.numero}</td>
                    <td data-label="Cliente">${factura.clienteNombre || ''}</td>
                    <td data-label="Fecha">${new Date(factura.fecha).toLocaleDateString('es-ES')}</td>
                    <td data-label="Total">${totalMostrado.toFixed(2).replace('.',',')}€</td>
                    <td class="acciones-tabla">
                        <button class="preview" data-id="${doc.id}" data-type="mensual" title="Previsualizar"><i class='bx bx-search-alt'></i></button>
                        <button class="edit" data-id="${doc.id}" data-type="mensual" title="Editar"><i class='bx bxs-edit'></i></button>
                        <button class="delete" data-id="${doc.id}" data-type="mensual" title="Eliminar"><i class='bx bxs-trash'></i></button>
                    </td>`;
                tablaFacturasMensualesBody.appendChild(tr);
            });
        } catch (error) { console.error("Error al cargar las facturas mensuales:", error); }
    }

    function editarFacturaMensual(id, data) {
        formFacturaMensual.reset();
        facturaMensualIdInput.value = id;
        document.getElementById('formulario-factura-mensual-titulo').textContent = 'Editar Factura Mensual';
        document.getElementById('factura-mensual-numero').value = data.numero;
        document.getElementById('factura-mensual-fecha').value = data.fecha;
        document.getElementById('factura-mensual-cliente-nombre').value = data.clienteNombre || '';
        document.getElementById('factura-mensual-cliente-nif').value = data.clienteNif || '';
        document.getElementById('factura-mensual-cliente-direccion').value = data.clienteDireccion || '';
        gruposContainer.innerHTML = '';
        if (data.grupos && data.grupos.length > 0) {
            data.grupos.forEach(grupo => anadirGrupoDeServicios(grupo));
        } else {
            anadirGrupoDeServicios();
        }
        calcularTotalesFacturaMensual();
        mostrarVista('vista-crear-factura-mensual');
    }

    // --- GENERACIÓN DE PDF ---
    async function generarPDFSimple(facturaData) {
        const logoBase64 = "data:image/jpeg;base64,....."; // <-- PEGA TU CÓDIGO BASE64 AQUÍ
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const theme = { bg: '#FFFFFF', text: '#000000', pink: '#FF69B4', blue: '#50A6C2', border: '#444444', tableHeadBg: '#EAEAEA' };

        if (logoBase64.startsWith("data:image")) doc.addImage(logoBase64, 'JPEG', 40, 40, 80, 80);
        let y = 50; let x = 220;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(theme.pink); doc.text("LIMPIEZAS AINARA", x, y); y += 15;
        doc.setFont('helvetica', 'normal'); doc.setTextColor(theme.blue); doc.text("Cuidamos tu hogar como si fuera el nuestro", x, y); y += 25;
        doc.setTextColor(theme.text);
        doc.setFont('helvetica', 'bold'); doc.text("Nombre:", x, y); doc.setFont('helvetica', 'normal'); doc.text("Ainara Anuarbe Redondo", x + 45, y); y += 15;
        doc.setFont('helvetica', 'bold'); doc.text("NIF:", x, y); doc.setFont('helvetica', 'normal'); doc.text("25615745R", x + 25, y); y += 15;
        doc.setFont('helvetica', 'bold'); doc.text("Tel:", x, y); doc.setFont('helvetica', 'normal'); doc.text("635 92 01 24", x + 22, y); y += 15;
        
        y = 200;
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
        };
        const formatCurrency = (num) => (num || 0).toFixed(2).replace('.', ',') + '€';
        
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(`FACTURA Nº: ${facturaData.numero}`, 40, y);
        doc.text(`Fecha: ${formatDate(facturaData.fecha)}`, pageWidth - 40, y, { align: 'right' }); y += 30;
        doc.text("Cliente:", 40, y); doc.setFont('helvetica', 'normal'); doc.text(facturaData.clienteNombre, 90, y);
        doc.setFont('helvetica', 'bold'); doc.text("DNI/NIF:", 350, y); doc.setFont('helvetica', 'normal'); doc.text(facturaData.clienteNif || '', 400, y); y += 20;
        doc.setFont('helvetica', 'bold'); doc.text("Dirección:", 40, y); doc.setFont('helvetica', 'normal');
        const direccionCliente = doc.splitTextToSize(facturaData.clienteDireccion || '', 450);
        doc.text(direccionCliente, 100, y);
        y += (direccionCliente.length * 12) + 20;

        const tableData = (facturaData.items || []).map(item => [item.descripcion, item.cantidad, item.precio, formatCurrency(item.total)]);
        doc.autoTable({
            startY: y, head: [["CONCEPTO", "HORAS", "PRECIO (H)", "TOTAL (€)"]], body: tableData, theme: 'grid',
            styles: { textColor: theme.text, lineColor: theme.border },
            headStyles: { fillColor: theme.tableHeadBg, textColor: theme.text, lineColor: theme.border },
            columnStyles: { 0: { cellWidth: 280 }, 1: { cellWidth: 70, halign: 'center' }, 2: { cellWidth: 80, halign: 'right' }, 3: { cellWidth: 80, halign: 'right' } }
        });
        y = doc.lastAutoTable.finalY + 30;

        const totalsX = pageWidth - 200;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text("Subtotal:", totalsX, y); doc.text(formatCurrency(facturaData.subtotal), pageWidth - 40, y, { align: 'right' }); y += 20;
        doc.text("IVA (21%):", totalsX, y); doc.text(formatCurrency(facturaData.iva), pageWidth - 40, y, { align: 'right' }); y += 20;
        doc.setFont('helvetica', 'bold');
        doc.text("Total:", totalsX, y); doc.text(formatCurrency(facturaData.total), pageWidth - 40, y, { align: 'right' }); y += 40;

        const formaDePago = facturaData.formaDePago || 'Efectivo';
        if (formaDePago === 'Transferencia') {
            doc.setFontSize(10);
            let xPago = 40;
            doc.setFont('helvetica', 'bold'); doc.text("Método de pago:", xPago, y);
            doc.setFont('helvetica', 'normal'); doc.text("Transferencia bancaria", xPago + 90, y); y += 15;
            doc.setFont('helvetica', 'bold'); doc.text("Entidad bancaria:", xPago, y);
            doc.setFont('helvetica', 'normal'); doc.text("La Caixa", xPago + 100, y); y += 15;
            doc.setFont('helvetica', 'bold'); doc.text("Titular de la cuenta:", xPago, y);
            doc.setFont('helvetica', 'normal'); doc.text("Ainara Anuarbe Redondo", xPago + 110, y); y += 15;
            doc.setFont('helvetica', 'bold'); doc.text("Número de cuenta (IBAN):", xPago, y);
            doc.setFont('helvetica', 'normal'); doc.text("ES35 2100 3819 9501 0068 5118", xPago + 145, y); y += 15;
            doc.setFont('helvetica', 'bold'); doc.text("Concepto a indicar:", xPago, y);
            doc.setFont('helvetica', 'normal'); doc.text(`Factura Nº ${facturaData.numero} - Limpiezas Ainara`, xPago + 110, y); y += 15;
            doc.setFont('helvetica', 'bold'); doc.text("Plazo de pago:", xPago, y);
            doc.setFont('helvetica', 'normal'); doc.text("Dentro de los 7 días naturales tras la recepción de la factura.", xPago + 80, y); y += 30;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold'); doc.text("FORMA DE PAGO", 40, y); y += 15;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(theme.pink); doc.text(formaDePago, 40, y);
            doc.setTextColor(theme.text); y += 30;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold'); doc.text("OBSERVACIONES", 40, y); y += 15;
        doc.setFont('helvetica', 'normal');
        const observaciones = doc.splitTextToSize(facturaData.observaciones || 'Gracias por confiar en Limpiezas Ainara.', pageWidth - 80);
        doc.text(observaciones, 40, y);

        const footerY = pageHeight - 80;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold'); doc.text("Firma Empresa", 470, footerY + 45);
        doc.setFont('helvetica', 'normal'); doc.text("Ainara Anuarbe Redondo", 440, footerY + 60);

        pdfBlob = doc.output('blob');
        iframe.src = URL.createObjectURL(pdfBlob);
        modal.style.display = 'flex';
    }


    async function generarPDFMensual(facturaData) {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES', { year: '2-digit', month: '2-digit', day: '2-digit' });
        };
        const formatCurrency = (num) => {
            const number = typeof num === 'number' ? num : 0;
            return number.toFixed(2).replace('.', ',') + '€';
        };

        const logoBase64 = "data:image/jpeg;base64,....."; // <-- PEGA TU CÓDIGO BASE64 AQUÍ

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const theme = { bg: '#FFFFFF', text: '#000000', pink: '#FF69B4', blue: '#50A6C2', border: '#444444', tableHeadBg: '#EAEAEA' };

        const dibujarCabecera = (doc, yStart = 40) => {
            if (logoBase64.startsWith("data:image")) doc.addImage(logoBase64, 'jpeg', 40, yStart, 80, 80);
            let y = yStart + 10; let x = 220;
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(theme.pink); doc.text("LIMPIEZAS AINARA", x, y); y += 15;
            doc.setFont('helvetica', 'normal'); doc.setTextColor(theme.blue); doc.text("Cuidamos tu hogar como si fuera el nuestro", x, y); y += 25;
            doc.setTextColor(theme.text);
            doc.setFont('helvetica', 'bold'); doc.text("Nombre:", x, y); doc.setFont('helvetica', 'normal'); doc.text("Ainara Anuarbe Redondo", x + 45, y); y += 15;
            doc.setFont('helvetica', 'bold'); doc.text("NIF:", x, y); doc.setFont('helvetica', 'normal'); doc.text("25615745R", x + 25, y); y += 15;
            doc.setFont('helvetica', 'bold'); doc.text("Tel:", x, y); doc.setFont('helvetica', 'normal'); doc.text("635 92 01 24", x + 22, y); y += 15;
            y = 200;
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text(`FACTURA Nº: ${facturaData.numero}`, 40, y);
            doc.text(`Fecha: ${formatDate(facturaData.fecha)}`, pageWidth - 40, y, { align: 'right' }); y += 30;
            doc.text("Cliente:", 40, y); doc.setFont('helvetica', 'normal'); doc.text(facturaData.clienteNombre, 90, y);
            doc.setFont('helvetica', 'bold'); doc.text("DNI/NIF:", 350, y); doc.setFont('helvetica', 'normal'); doc.text(facturaData.clienteNif || '', 400, y); y += 20;
            doc.setFont('helvetica', 'bold'); doc.text("Dirección:", 40, y); doc.setFont('helvetica', 'normal');
            const direccionCliente = doc.splitTextToSize(facturaData.clienteDireccion || '', 450);
            doc.text(direccionCliente, 100, y);
            return y + (direccionCliente.length * 12) + 20;
        };

        let y = dibujarCabecera(doc);

        (facturaData.grupos || []).forEach(grupo => {
            let headers, body, columnStyles;
            let subtotalGrupo = 0;
            if (grupo.tipo === 'horas') {
                headers = [["FECHA", "SERVICIO", "HORAS", "PRECIO", "TOTAL"]];
                body = (grupo.items || []).map(item => {
                    subtotalGrupo += (item.total || 0);
                    return [
                        formatDate(item.fecha),
                        item.descripcion || '',
                        item.horas || '',
                        item.precio || '',
                        formatCurrency(item.total)
                    ];
                });
                const subtotalRow = { content: `Subtotal ${grupo.nombre}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' }};
                const subtotalValue = { content: formatCurrency(subtotalGrupo), styles: { halign: 'right', fontStyle: 'bold' }};
                body.push([subtotalRow, subtotalValue]);
                columnStyles = { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' }};
            } else { // fijo
                headers = [["FECHA", "SERVICIO", "PRECIO FIJO", "TOTAL"]];
                body = (grupo.items || []).map(item => {
                    subtotalGrupo += (item.total || 0);
                    return [
                        formatDate(item.fecha),
                        item.descripcion || '',
                        item.precio_fijo || '',
                        formatCurrency(item.total)
                    ];
                });
                const subtotalRow = { content: `Subtotal ${grupo.nombre}`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' }};
                const subtotalValue = { content: formatCurrency(subtotalGrupo), styles: { halign: 'right', fontStyle: 'bold' }};
                body.push([subtotalRow, subtotalValue]);
                columnStyles = { 0: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }};
            }
            doc.autoTable({
                startY: y, head: headers, body: body, theme: 'grid',
                styles: { textColor: theme.text, lineColor: theme.border, fontSize: 9 },
                headStyles: { fillColor: theme.tableHeadBg, textColor: theme.text, lineColor: theme.border, fontStyle: 'bold' },
                columnStyles: columnStyles
            });
            y = doc.lastAutoTable.finalY + 15;
        });

        doc.addPage();
        y = dibujarCabecera(doc, 40); y += 20;
        doc.setFontSize(12); doc.setFont('helvetica', 'normal');
        doc.text("Subtotal:", 40, y); doc.text(formatCurrency(facturaData.subtotalGeneral), 200, y, { align: 'right' }); y += 25;
        doc.text("IVA (21%):", 40, y); doc.text(formatCurrency(facturaData.iva), 200, y, { align: 'right' }); y += 25;
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text("Total:", 40, y); doc.text(formatCurrency(facturaData.totalFinal), 200, y, { align: 'right' }); y += 60;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold'); doc.text("Método de pago:", 40, y); doc.setFont('helvetica', 'normal'); doc.text("Transferencia bancaria", 130, y); y += 20;
        doc.setFont('helvetica', 'bold'); doc.text("Entidad bancaria:", 40, y); doc.setFont('helvetica', 'normal'); doc.text("La Caixa", 140, y); y += 20;
        doc.setFont('helvetica', 'bold'); doc.text("Titular de la cuenta:", 40, y); doc.setFont('helvetica', 'normal'); doc.text("Ainara Anuarbe Redondo", 150, y); y += 20;
        doc.setFont('helvetica', 'bold'); doc.text("Número de cuenta (IBAN):", 40, y); doc.setFont('helvetica', 'normal'); doc.text("ES35 2100 3819 9501 0068 5118", 185, y); y += 20;
        doc.setFont('helvetica', 'bold'); doc.text("Concepto a indicar:", 40, y); doc.setFont('helvetica', 'normal'); doc.text(`Factura Nº ${facturaData.numero.split('-')[1]} - Limpiezas Ainara`, 150, y); y += 20;
        doc.setFont('helvetica', 'bold'); doc.text("Plazo de pago:", 40, y); doc.setFont('helvetica', 'normal'); doc.text("Dentro de los 7 días naturales tras la recepción de la factura.", 120, y); y += 40;
        doc.setFont('helvetica', 'bold'); doc.text("OBSERVACIONES", 40, y); y += 15;
        doc.setFont('helvetica', 'normal'); doc.text("Gracias por confiar en Limpiezas Ainara.", 40, y);
        const footerY = pageHeight - 60;
        doc.setFont('helvetica', 'bold'); doc.text("Firma Empresa", 470, footerY);
        doc.setFont('helvetica', 'normal'); doc.text("Ainara Anuarbe Redondo", 440, footerY + 15);

        pdfBlob = doc.output('blob');
        iframe.src = URL.createObjectURL(pdfBlob);
        modal.style.display = 'flex';
    }

    // --- LÓGICA DEL MODAL ---
    btnCerrarModal.onclick = () => {
        modal.style.display = "none";
        iframe.src = '';
        currentFacturaDataForPDF = {};
    };
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
    btnImprimirPDF.addEventListener('click', () => iframe.contentWindow.print());

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