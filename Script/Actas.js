document.addEventListener('DOMContentLoaded', () => {
    // 1. CARGA DE DATOS
    const rawData = JSON.parse(localStorage.getItem('hr_people_v1') || '[]');
    
    // Referencias del DOM
    const elSelect = document.getElementById('selPerson');
    const elDate = document.getElementById('inputDate');
    const elType = document.getElementById('inputType');
    const elReason = document.getElementById('inputReason');
    const btnSave = document.getElementById('btnSave');

    // Referencias de la Vista Previa
    const viewName = document.getElementById('viewName');
    const viewId = document.getElementById('viewId');
    const viewDate = document.getElementById('viewDate');
    const viewTitle = document.getElementById('viewTitle');
    const viewReason = document.getElementById('viewReason');
    const viewSignName = document.getElementById('viewSignName');

    // 2. LLENADO DEL SELECT
    elSelect.innerHTML = '<option value="">-- Seleccione Empleado --</option>';
    
    rawData.forEach(p => {
        const option = document.createElement('option');
        // Usamos personJerId como identificador único
        option.value = p.personJerId; 
        // Mostramos nombre y legajo
        option.textContent = `${p.name} (Leg: ${p.legajo || 'S/D'})`; 
        elSelect.appendChild(option);
    });

    // Fecha inicial
    elDate.valueAsDate = new Date();
    updatePreview();

    // 3. LISTENERS PARA ACTUALIZACIÓN EN VIVO
    elSelect.addEventListener('change', updatePreview);
    elDate.addEventListener('input', updatePreview);
    elType.addEventListener('change', updatePreview);
    elReason.addEventListener('input', updatePreview);

    function updatePreview() {
        // Formatear fecha (DD/MM/AAAA)
        let dateFormatted = '___';
        if(elDate.value) {
             const parts = elDate.value.split('-');
             dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        viewDate.textContent = dateFormatted;
        
        viewTitle.textContent = elType.value;
        viewReason.textContent = elReason.value || '(Escriba la descripción de los hechos en el formulario...)';

        const selectedId = elSelect.value;
        // Buscamos usando personJerId
        const person = rawData.find(p => p.personJerId == selectedId);

        if (person) {
            viewName.textContent = person.name; 
            viewId.textContent = person.legajo || person.cuil || "S/D";
            viewSignName.textContent = person.name; // Aclaración firma empleado
        } else {
            viewName.textContent = "__________________";
            viewId.textContent = "___";
            viewSignName.textContent = "Aclaración";
        }
    }

    // 4. GENERAR PDF Y GUARDAR
    btnSave.addEventListener('click', () => {
        const selectedId = elSelect.value;
        
        // Validaciones básicas
        if (!selectedId) return alert("Por favor, seleccione un empleado.");
        if (!elReason.value.trim()) return alert("Debe ingresar el motivo de la sanción.");
        
        const personIndex = rawData.findIndex(p => p.personJerId == selectedId);
        if (personIndex === -1) return alert("Error: Persona no encontrada.");

        // UI de carga
        btnSave.textContent = "Generando PDF...";
        btnSave.disabled = true;

        const element = document.getElementById('printableArea');
        
        // Configuración ESTRICTA de PDF para evitar hojas en blanco
        const opt = {
            margin:       0, // El CSS ya tiene padding, margin 0 es vital
            filename:     `Sancion_${rawData[personIndex].legajo}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, // Importante para que cargue la firma_oficial.png
                scrollY: 0 
            },
            jsPDF:        { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait' 
            },
            pagebreak: { mode: 'avoid-all' } // Intenta evitar cortes bruscos
        };
        
        // Generar
        html2pdf().set(opt).from(element).outputPdf('datauristring').then(function(pdfString) {
            
            // Crear el objeto archivo
            const nuevoArchivo = {
                id: Date.now(),
                name: `Sanción - ${elType.value} (${elDate.value}).pdf`,
                type: "application/pdf",
                data: pdfString, // Archivo en Base64
                uploadDate: new Date().toISOString(),
                description: `Generado automáticamente: ${elType.value}`
            };

            // Asegurar que exista el array 'attachments'
            if (!rawData[personIndex].attachments) {
                rawData[personIndex].attachments = [];
            }
            
            // Guardar
            rawData[personIndex].attachments.push(nuevoArchivo);

            // Persistir en LocalStorage
            try {
                localStorage.setItem('hr_people_v1', JSON.stringify(rawData));
                alert(`¡Éxito! Documento guardado en los archivos de ${rawData[personIndex].name}.`);
                // Redirigir al inicio para limpiar
                window.location.href = 'index.html'; 
            } catch (e) {
                console.error(e);
                alert("Error: Memoria insuficiente (LocalStorage lleno) para guardar el PDF.");
                btnSave.disabled = false;
                btnSave.textContent = "GENERAR Y GUARDAR PDF";
            }
        });
    });
});