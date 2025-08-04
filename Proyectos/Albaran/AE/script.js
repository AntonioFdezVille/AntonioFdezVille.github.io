document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos
    const form = document.getElementById('albaran-form');
    const addRowBtn = document.getElementById('add-row-btn');
    const productList = document.getElementById('lista-productos');

    // Mapeo de IDs de formulario a PDF
    const fieldMapping = {
        'albaran-numero': 'pdf-albaran-numero', 'fecha': 'pdf-fecha',
        'codigo-productor': 'pdf-codigo-productor',
        'proveedor-nombre': 'pdf-proveedor-nombre', 'proveedor-cif': 'pdf-proveedor-cif',
        'proveedor-direccion': 'pdf-proveedor-direccion',
        'proveedor-tf': 'pdf-proveedor-tf', 'proveedor-fax': 'pdf-proveedor-fax',
        'proveedor-email': 'pdf-proveedor-email'
    };

    // Función para formatear números a formato español (2 decimales)
    const formatNumber = (num) => {
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    };

    // Actualizar previsualización
    const updatePreview = () => {
        for (const formId in fieldMapping) {
            const inputElement = document.getElementById(formId);
            const pdfElement = document.getElementById(fieldMapping[formId]);
            if (!inputElement || !pdfElement) continue;

            if (formId === 'fecha') {
                const [year, month, day] = inputElement.value.split('-');
                pdfElement.textContent = `${day}/${month}/${year}`;
            } else {
                pdfElement.textContent = inputElement.value;
            }
        }
        updateProductTableAndTotals();
    };

    // Actualizar tabla y calcular totales
    const updateProductTableAndTotals = () => {
        const pdfProductList = document.getElementById('pdf-lista-productos');
        pdfProductList.innerHTML = '';
        let totalBultos = 0, totalKilos = 0, totalImporte = 0;

        const formRows = productList.querySelectorAll('tr');
        formRows.forEach(row => {
            const cells = row.querySelectorAll('input');
            const newPdfRow = pdfProductList.insertRow();
            
            const rowData = Array.from(cells).map(cell => cell.value);
            rowData.forEach(value => newPdfRow.insertCell().textContent = value);

            // Sumar a los totales (índices 3, 4, 6)
            totalBultos += parseFloat(rowData[3]?.replace(',', '.') || 0);
            totalKilos += parseFloat(rowData[4]?.replace(',', '.') || 0);
            totalImporte += parseFloat(rowData[6]?.replace(',', '.') || 0);
        });

        // Actualizar totales en el PDF
        document.getElementById('pdf-total-bultos').textContent = formatNumber(totalBultos);
        document.getElementById('pdf-total-kilos').textContent = formatNumber(totalKilos);
        document.getElementById('pdf-total-importe').textContent = formatNumber(totalImporte);
    };

    // Añadir fila de producto
    const addProductRow = () => {
        const newRow = productList.insertRow();
        const labels = ['Código', 'Descripció', 'Envase', 'Bultos', 'Kilos', 'Precio', 'Importe'];
        const placeholders = ['50000', 'Pepino Holandes ECO', '01', '30,00', '519,00', '0,00', '0,00'];
        
        labels.forEach((label, i) => {
            const cell = newRow.insertCell(i);
            const input = document.createElement('input');
            input.type = 'text';
            cell.dataset.label = label;
            input.placeholder = placeholders[i];
            cell.appendChild(input);
        });

        const deleteCell = newRow.insertCell(labels.length);
        deleteCell.dataset.label = 'Quitar';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'remove-row-btn';
        deleteBtn.onclick = () => { newRow.remove(); updatePreview(); };
        deleteCell.appendChild(deleteBtn);

        newRow.querySelectorAll('input').forEach(input => input.addEventListener('input', updatePreview));
    };

    // Lógica de botones e inicialización (idéntica a la anterior)
    const imprimirBtn = document.getElementById('imprimir-btn');
    const descargarBtn = document.getElementById('descargar-btn');
    const mobilePreviewBtn = document.getElementById('mobile-preview-btn');
    const modal = document.getElementById('preview-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalPdfContent = document.getElementById('modal-pdf-content');

    const setTodayDate = () => {
        const fechaInput = document.getElementById('fecha');
        if (!fechaInput) return;
        const today = new Date('2025-08-04T20:14:01'); // Fecha actual para consistencia
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today - timezoneOffset);
        fechaInput.value = localDate.toISOString().split('T')[0];
    };

    form.addEventListener('input', updatePreview);
    addRowBtn.addEventListener('click', () => { addProductRow(); updatePreview(); });
    imprimirBtn.addEventListener('click', () => window.print());
    descargarBtn.addEventListener('click', () => {
        const albaranNumero = document.getElementById('albaran-numero').value || 'SIN-NUMERO';
        const filename = `Albaran_Entrada_${albaranNumero}.pdf`;
        html2canvas(document.getElementById('pdf-content'), { scale: 3, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const pdfHeight = canvasHeight * pdfWidth / canvasWidth;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(filename);
        });
    });
    mobilePreviewBtn.addEventListener('click', () => {
        updatePreview();
        modalPdfContent.innerHTML = '';
        modalPdfContent.appendChild(document.getElementById('pdf-content').cloneNode(true));
        modal.classList.add('active');
    });
    modalCloseBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    setTodayDate();
    addProductRow();
    updatePreview();
});