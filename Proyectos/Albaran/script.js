document.addEventListener('DOMContentLoaded', () => {
    // Contenedores
    const formContainer = document.getElementById('formulario-container');
    const plantillaContainer = document.getElementById('plantilla-container');
    const formProductosContainer = document.getElementById('form-productos-container');
    const formEnvasesContainer = document.getElementById('form-envases-container');

    // Botones
    const btnGenerar = document.getElementById('btn-generar');
    const btnEditar = document.getElementById('btn-editar');
    const btnImprimir = document.getElementById('btn-imprimir');
    const btnAddProducto = document.getElementById('btn-add-producto');
    const btnAddEnvase = document.getElementById('btn-add-envase');

    document.getElementById('form-fecha').valueAsDate = new Date();

    const añadirLineaProducto = () => {
        const row = document.createElement('div');
        row.className = 'item-row-form producto';
        row.innerHTML = `<input type="text" class="form-item-producto" placeholder="PRODUCTO"><input type="text" class="form-item-tcultivo" placeholder="T.CULTIVO"><input type="text" class="form-item-variedad" placeholder="VARIEDAD"><input type="number" class="form-item-bultos" placeholder="BULTOS" value="0"><input type="text" class="form-item-envase" placeholder="ENVASE"><input type="number" class="form-item-kilos" placeholder="KILOS" value="0"><button type="button" class="btn btn-danger btn-remove">X</button>`;
        formProductosContainer.appendChild(row);
        row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
    };

    const añadirLineaEnvase = () => {
        const row = document.createElement('div');
        row.className = 'item-row-form envase';
        row.innerHTML = `<input type="text" class="form-item-env-codigo" placeholder="CODIGO"><input type="text" class="form-item-env-tipo" placeholder="TIPO DE ENVASE"><input type="number" class="form-item-env-entrega" placeholder="ENTREGA" value="0"><input type="number" class="form-item-env-retira" placeholder="RETIRA" value="0"><button type="button" class="btn btn-danger btn-remove">X</button>`;
        formEnvasesContainer.appendChild(row);
        row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
    };
    
    const generarAlbaran = () => {
        // --- MODIFICADO: Ya no hay que gestionar la foto ---

        // --- Transferir datos del documento ---
        document.getElementById('plantilla-albaran-num').textContent = document.getElementById('form-albaran-num').value;
        document.getElementById('plantilla-codigo').textContent = document.getElementById('form-codigo').value;
        document.getElementById('plantilla-fecha').textContent = document.getElementById('form-fecha').value;
        document.getElementById('plantilla-titular-nombre').textContent = document.getElementById('form-titular-nombre').value;

        // --- Lógica para productos y envases (sin cambios) ---
        const tbodyProductos = document.getElementById('plantilla-productos-tbody');
        tbodyProductos.innerHTML = '';
        let totalBultos = 0, totalKilos = 0;
        document.querySelectorAll('#form-productos-container .item-row-form').forEach(row => {
            const bultos = parseFloat(row.querySelector('.form-item-bultos').value) || 0;
            const kilos = parseFloat(row.querySelector('.form-item-kilos').value) || 0;
            totalBultos += bultos;
            totalKilos += kilos;
            const nuevaFila = tbodyProductos.insertRow();
            nuevaFila.innerHTML = `<td>${row.querySelector('.form-item-producto').value}</td><td>${row.querySelector('.form-item-tcultivo').value}</td><td>${row.querySelector('.form-item-variedad').value}</td><td class="producto-numerico">${bultos}</td><td>${row.querySelector('.form-item-envase').value}</td><td class="producto-numerico">${kilos}</td>`;
        });
        document.getElementById('plantilla-total-bultos').textContent = totalBultos;
        document.getElementById('plantilla-total-kilos').textContent = totalKilos;

        const tbodyEnvases = document.getElementById('plantilla-envases-tbody');
        tbodyEnvases.innerHTML = '';
        document.querySelectorAll('#form-envases-container .item-row-form').forEach(row => {
            const entrega = parseFloat(row.querySelector('.form-item-env-entrega').value) || 0;
            const retira = parseFloat(row.querySelector('.form-item-env-retira').value) || 0;
            const saldo = entrega - retira;
            const nuevaFila = tbodyEnvases.insertRow();
            nuevaFila.innerHTML = `<td>${row.querySelector('.form-item-env-codigo').value}</td><td>${row.querySelector('.form-item-env-tipo').value}</td><td class="envase-numerico">${entrega}</td><td class="envase-numerico">${retira}</td><td class="envase-numerico">${saldo}</td>`;
        });

        // --- Cambiar de vista ---
        formContainer.classList.add('hidden');
        plantillaContainer.classList.remove('hidden');
    };

    // Eventos
    btnGenerar.addEventListener('click', generarAlbaran);
    btnEditar.addEventListener('click', () => {
        plantillaContainer.classList.add('hidden');
        formContainer.classList.remove('hidden');
    });
    btnImprimir.addEventListener('click', () => window.print());
    btnAddProducto.addEventListener('click', añadirLineaProducto);
    btnAddEnvase.addEventListener('click', añadirLineaEnvase);

    // Inicializar
    añadirLineaProducto();
    añadirLineaEnvase();
});