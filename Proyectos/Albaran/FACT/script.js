document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const form = document.getElementById('factura-form');
    const addRowBtn = document.getElementById('add-row-btn');
    const conceptList = document.getElementById('lista-conceptos');
    
    // Formateador de moneda
    const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

    // Función principal para actualizar toda la factura
    const updateInvoice = () => {
        // 1. Actualizar campos de texto simples
        const simpleFields = ['factura-numero', 'factura-fecha', 'cliente-nombre', 'cliente-nif', 'cliente-direccion', 'metodo-pago'];
        simpleFields.forEach(id => {
            const pdfElement = document.getElementById(`pdf-${id}`);
            const inputElement = document.getElementById(id);
            if(pdfElement && inputElement) {
                if(id === 'factura-fecha') {
                    const [year, month, day] = inputElement.value.split('-');
                    pdfElement.textContent = `${day}/${month}/${year}`;
                } else {
                    pdfElement.textContent = inputElement.value;
                }
            }
        });

        // 2. Actualizar líneas de concepto y calcular totales
        updateLinesAndTotals();
    };

    // Función para actualizar líneas y calcular totales
    const updateLinesAndTotals = () => {
        const pdfConceptList = document.getElementById('pdf-lista-conceptos');
        pdfConceptList.innerHTML = '';
        let baseImponible = 0;

        const formRows = conceptList.querySelectorAll('tr');
        formRows.forEach(row => {
            const cantidad = parseFloat(row.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(row.querySelector('.precio').value) || 0;
            const importe = cantidad * precio;
            
            // Actualizar el campo de importe en el formulario (solo lectura)
            row.querySelector('.importe').value = importe.toFixed(2);
            
            // Añadir fila a la previsualización del PDF
            const pdfRow = pdfConceptList.insertRow();
            pdfRow.insertCell().textContent = row.querySelector('.descripcion').value;
            pdfRow.insertCell().textContent = cantidad;
            pdfRow.insertCell().textContent = currencyFormatter.format(precio);
            pdfRow.insertCell().textContent = currencyFormatter.format(importe);

            // Sumar al total de la base imponible
            baseImponible += importe;
        });

        // 3. Calcular IVA y TOTAL
        const tipoIva = parseFloat(document.getElementById('tipo-iva').value) || 0;
        const cuotaIva = baseImponible * (tipoIva / 100);
        const totalFactura = baseImponible + cuotaIva;

        // 4. Actualizar la previsualización de los totales
        document.getElementById('pdf-base-imponible').textContent = currencyFormatter.format(baseImponible);
        document.getElementById('pdf-tipo-iva').textContent = tipoIva;
        document.getElementById('pdf-cuota-iva').textContent = currencyFormatter.format(cuotaIva);
        document.getElementById('pdf-total-factura').textContent = currencyFormatter.format(totalFactura);
    };

    // Función para añadir una nueva fila de concepto
    const addConceptRow = () => {
        const newRow = conceptList.insertRow();
        newRow.innerHTML = `
            <td data-label="Descripción"><input type="text" class="descripcion" placeholder="Producto o servicio"></td>
            <td data-label="Cantidad"><input type="number" class="cantidad" value="1" step="any"></td>
            <td data-label="Precio Unit."><input type="number" class="precio" placeholder="0.00" step="any"></td>
            <td data-label="Importe"><input type="text" class="importe" readonly></td>
            <td data-label="Quitar"><button type="button" class="remove-row-btn">&times;</button></td>
        `;
        // Añadir listeners al nuevo botón de eliminar y a los inputs
        newRow.querySelector('.remove-row-btn').addEventListener('click', () => {
            newRow.remove();
            updateInvoice();
        });
        newRow.querySelectorAll('input.cantidad, input.precio').forEach(input => {
            input.addEventListener('input', updateInvoice);
        });
    };

    // Inicialización y Listeners
    const setTodayDate = () => {
        const fechaInput = document.getElementById('factura-fecha');
        if (!fechaInput) return;
        const today = new Date('2025-08-04T20:38:35'); // Fecha actual para consistencia
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today - timezoneOffset);
        fechaInput.value = localDate.toISOString().split('T')[0];
    };
    
    form.addEventListener('input', updateInvoice);
    addRowBtn.addEventListener('click', addConceptRow);
    setTodayDate();
    addConceptRow(); // Añadir una primera fila por defecto
    updateInvoice(); // Llamada inicial

    // Lógica para botones de acción y modal (idéntica a las anteriores)
    document.getElementById('imprimir-btn').addEventListener('click', () => window.print());
    document.getElementById('descargar-btn').addEventListener('click', () => {
        const facturaNumero = document.getElementById('factura-numero').value || 'SIN-NUMERO';
        const filename = `Factura_${facturaNumero}.pdf`;
        html2canvas(document.getElementById('pdf-content'), { scale: 3, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            let finalWidth = pdfWidth;
            let finalHeight = pdfWidth / ratio;
            if (finalHeight > pdfHeight) { finalHeight = pdfHeight; finalWidth = finalHeight * ratio; }
            pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);
            pdf.save(filename);
        });
    });
    const mobilePreviewBtn = document.getElementById('mobile-preview-btn');
    const modal = document.getElementById('preview-modal');
    mobilePreviewBtn.addEventListener('click', () => { updateInvoice(); document.getElementById('modal-pdf-content').innerHTML = ''; document.getElementById('modal-pdf-content').appendChild(document.getElementById('pdf-content').cloneNode(true)); modal.classList.add('active'); });
    document.getElementById('modal-close-btn').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
});