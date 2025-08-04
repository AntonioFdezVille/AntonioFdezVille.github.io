document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const form = document.getElementById('albaran-form');
    const addRowBtn = document.getElementById('add-row-btn');
    const productList = document.getElementById('lista-productos');
    const imprimirBtn = document.getElementById('imprimir-btn');
    const descargarBtn = document.getElementById('descargar-btn');
    const pdfContent = document.getElementById('pdf-content');
    const mobilePreviewBtn = document.getElementById('mobile-preview-btn');
    const modal = document.getElementById('preview-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalPdfContent = document.getElementById('modal-pdf-content');

    const fieldMapping = {
        'albaran-numero': 'pdf-albaran-numero', 'entrega': 'pdf-entrega',
        'fecha': 'pdf-fecha', 'condiciones': 'pdf-condiciones',
        'cliente-nombre': 'pdf-cliente-nombre', 'cliente-direccion': 'pdf-cliente-direccion',
        'pedido-numero': 'pdf-pedido-numero', 'lugar-carga': 'pdf-lugar-carga',
        'observaciones': 'pdf-observaciones', 'transportista-nombre': 'pdf-transportista-nombre',
    };
    
    const setTodayDate = () => {
        const fechaInput = document.getElementById('fecha');
        if (!fechaInput) return;
        const today = new Date();
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today - timezoneOffset);
        fechaInput.value = localDate.toISOString().split('T')[0];
        document.getElementById('pdf-fecha').textContent = today.toLocaleDateString('es-ES');
    };
    
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
        const numeroPalets = document.getElementById('numero-palets').value || 0;
        document.getElementById('pdf-suma-palets').textContent = `${numeroPalets} EURO RETORNABLE`;
        updateProductTable();
    };

    const updateProductTable = () => {
        const pdfProductList = document.getElementById('pdf-lista-productos');
        pdfProductList.innerHTML = '';
        const formRows = productList.querySelectorAll('tr');
        formRows.forEach(row => {
            const cells = row.querySelectorAll('input');
            const newPdfRow = pdfProductList.insertRow();
            for (let i = 0; i < 9; i++) {
                newPdfRow.insertCell(i).textContent = cells[i] ? cells[i].value : '';
            }
        });
    };

    // ===== FUNCIÓN CORREGIDA =====
    const addProductRow = () => {
        const newRow = productList.insertRow();
        const fieldsCount = 9;
        
        const labels = ['Descripción', 'Cat.', 'CAL', 'Envase', 'Piezas', 'Cajas', 'Neto', 'Precio', 'Importe'];
        // ¡EJEMPLOS AÑADIDOS DE NUEVO!
        const placeholders = ['Pepino Bio', 'I', '+300g', '40X30X12', '12', '288', '8,75', '2.520,00', '2.520,00'];
        
        for (let i = 0; i < fieldsCount; i++) {
            const cell = newRow.insertCell(i);
            const input = document.createElement('input');
            input.type = 'text';
            cell.dataset.label = labels[i]; 
            input.placeholder = placeholders[i]; // <- Línea que faltaba
            cell.appendChild(input);
        }

        const deleteCell = newRow.insertCell(fieldsCount);
        deleteCell.dataset.label = 'Quitar';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'remove-row-btn';
        deleteBtn.onclick = () => { newRow.remove(); updatePreview(); };
        deleteCell.appendChild(deleteBtn);

        newRow.querySelectorAll('input').forEach(input => input.addEventListener('input', updatePreview));
    };

    // --- EVENT LISTENERS (Sin cambios) ---
    form.addEventListener('input', updatePreview);
    addRowBtn.addEventListener('click', () => { addProductRow(); updatePreview(); });
    imprimirBtn.addEventListener('click', () => { window.print(); });

    descargarBtn.addEventListener('click', () => {
        const albaranNumero = document.getElementById('albaran-numero').value || 'SIN-NUMERO';
        const filename = `Albaran_Salida_${albaranNumero}.pdf`;
        html2canvas(pdfContent, { scale: 3, useCORS: true }).then(canvas => {
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
            if (finalHeight > pdfHeight) {
                finalHeight = pdfHeight;
                finalWidth = finalHeight * ratio;
            }
            pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);
            pdf.save(filename);
        });
    });

    // --- LÓGICA MODAL PARA MÓVIL (Sin cambios) ---
    mobilePreviewBtn.addEventListener('click', () => {
        updatePreview();
        modalPdfContent.innerHTML = '';
        modalPdfContent.appendChild(pdfContent.cloneNode(true));
        modal.classList.add('active');
    });
    modalCloseBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // --- INICIALIZACIÓN ---
    setTodayDate();
    addProductRow();
    updatePreview();
});