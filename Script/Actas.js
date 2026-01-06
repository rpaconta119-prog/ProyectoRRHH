document.addEventListener('DOMContentLoaded', async () => {
    // Variable global para los datos
    let rawData = [];
    const API_URL = 'api/people'; 

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

    // 1. CARGA DE DATOS
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('No se pudo conectar con la base de datos');
        
        let datos = await response.json();
        
        // PARCHE DE SEGURIDAD: Si viene corrupto (objeto {}), lo convertimos a array []
        if (!Array.isArray(datos)) {
            console.error("La base de datos estaba corrupta. Se reinicia como lista vacía.");
            datos = []; 
        }
        rawData = datos;
        
        console.log("Datos cargados:", rawData); 
        populateSelect();
    } catch (error) {
        console.error(error);
        alert("Error: No se puede conectar al servidor.");
        return; 
    }

    // 2. LLENADO DEL SELECT
    function populateSelect() {
        elSelect.innerHTML = '<option value="">-- Seleccione Empleado --</option>';
        rawData.forEach(p => {
            const option = document.createElement('option');
            option.value = p.personJerId;
            option.textContent = `${p.name} (Leg: ${p.legajo || 'S/D'})`;
            elSelect.appendChild(option);
        });
    }

    // Fecha inicial
    elDate.valueAsDate = new Date();
    updatePreview();

    // 3. LISTENERS
    elSelect.addEventListener('change', updatePreview);
    elDate.addEventListener('input', updatePreview);
    elType.addEventListener('change', updatePreview);
    elReason.addEventListener('input', updatePreview);

    function updatePreview() {
        let dateFormatted = '___';
        if (elDate.value) {
            const parts = elDate.value.split('-');
            dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        viewDate.textContent = dateFormatted;

        viewTitle.textContent = elType.value;
        viewReason.textContent = elReason.value || '(Escriba la descripción...)';

        const selectedId = elSelect.value;
        const person = rawData.find(p => p.personJerId == selectedId);

        if (person) {
            viewName.textContent = person.name;
            viewId.textContent = person.legajo || person.cuil || "S/D";
            viewSignName.textContent = person.name;
        } else {
            viewName.textContent = "__________________";
            viewId.textContent = "___";
            viewSignName.textContent = "Aclaración";
        }
    }

    // 4. GUARDAR (AQUÍ ESTÁ LA CORRECCIÓN CLAVE)
    btnSave.addEventListener('click', () => {
        const selectedId = elSelect.value;

        if (!selectedId) return alert("Por favor, seleccione un empleado.");
        if (!elReason.value.trim()) return alert("Debe ingresar el motivo.");

        // Buscamos el índice real en la lista
        const personIndex = rawData.findIndex(p => p.personJerId == selectedId);
        if (personIndex === -1) return alert("Error: Persona no encontrada.");

        btnSave.textContent = "Generando y Subiendo...";
        btnSave.disabled = true;

        const element = document.getElementById('printableArea');

        const opt = {
            margin: 0,
            filename: `Sancion_${rawData[personIndex].legajo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: 'avoid-all' }
        };

        html2pdf().set(opt).from(element).outputPdf('datauristring').then(async function(pdfString) {
            
            // 1. Crear el archivo adjunto
            const nuevoArchivo = {
                id: Date.now(),
                name: `Sanción - ${elType.value} (${elDate.value}).pdf`,
                type: "application/pdf",
                data: pdfString, 
                uploadDate: new Date().toISOString(),
                description: `Generado automáticamente: ${elType.value}`
            };

            // 2. ACTUALIZAR LA LISTA LOCALMENTE (rawData)
            // Esto es vital: Modificamos la lista completa en memoria antes de enviar
            if (!rawData[personIndex].attachments) {
                rawData[personIndex].attachments = [];
            }
            rawData[personIndex].attachments.push(nuevoArchivo);

            // 3. ENVIAR LA LISTA COMPLETA AL SERVIDOR
            // Como no tocamos el server, le mandamos TODO el array para que lo guarde tal cual
            try {
                const response = await fetch(API_URL, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rawData) // <--- ¡AQUÍ ESTÁ EL CAMBIO! Enviamos rawData (Array), no la persona (Objeto)
                });

                if (response.ok) {
                    alert(`¡Éxito! Documento guardado correctamente.`);
                    window.location.href = 'index.html';
                } else {
                    throw new Error('El servidor rechazó el guardado');
                }

            } catch (e) {
                console.error(e);
                alert("Error al guardar. Verifica que el archivo JSON no sea demasiado pesado.");
                btnSave.disabled = false;
                btnSave.textContent = "GENERAR Y GUARDAR PDF";
            }
        });
    });
});