document.addEventListener('DOMContentLoaded', () => {
    listarAspirantes();
    setupFormulario();
});

// --- HELPER: LEER ARCHIVOS A BASE64 ---
// Esto permite guardar PDFs o imágenes dentro del JSON
const leerArchivos = (inputElement) => {
    return new Promise((resolve, reject) => {
        const files = inputElement.files;
        if (!files || files.length === 0) return resolve([]);

        const promesas = Array.from(files).map(file => {
            return new Promise((res, rej) => {
                const reader = new FileReader();
                reader.readAsDataURL(file); // Convierte a base64
                reader.onload = () => res({
                    name: file.name,
                    type: file.type,
                    data: reader.result // El string base64
                });
                reader.onerror = error => rej(error);
            });
        });

        Promise.all(promesas).then(archivosProcesados => resolve(archivosProcesados)).catch(err => reject(err));
    });
};

// --- RENDERIZADO DE LA TABLA ---
async function listarAspirantes() {
    const lista = await API.cargar('applicants');
    const tbody = document.getElementById('tabla-aspirantes-body'); 
    tbody.innerHTML = '';

    if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay entrevistas pendientes.</td></tr>';
        return;
    }

    lista.forEach(asp => {
        const cantArchivos = asp.attachments ? asp.attachments.length : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${asp.nombre}</td>
            <td>
                <strong>DNI:</strong> ${asp.dni}<br>
                <small>CUIL: ${asp.cuit || '-'}</small>
            </td>
            <td>${asp.puesto}</td>
            <td>${cantArchivos > 0 ? '📎 ' + cantArchivos + ' adjunto(s)' : 'Sin archivos'}</td>
            <td style="display: flex; gap: 5px; justify-content: center;">
                <button class="btn" style="background-color: #28a745; color: white;" onclick="contratarAspirante(${asp.id})" title="Contratar y pasar a Personal">
                    ✅ 
                </button>
                <button class="btn" style="background-color: #dc3545; color: white;" onclick="eliminarAspirante(${asp.id})" title="Eliminar">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- AGREGAR NUEVO ASPIRANTE ---
function setupFormulario() {
    const btnGuardar = document.querySelector('#form-aspirante button[type="submit"]'); 
    const form = document.getElementById('form-aspirante'); 

    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            btnGuardar.disabled = true;
            btnGuardar.innerText = "Procesando archivos...";

            try {
                // 1. Procesar Archivos (CVs, etc.)
                const inputArchivos = document.getElementById('archivos');
                const archivosProcesados = await leerArchivos(inputArchivos);

                // 2. Crear Objeto
                const nuevoAspirante = {
                    id: Date.now(), 
                    nombre: document.getElementById('nombre').value,
                    dni: document.getElementById('dni').value,
                    cuit: document.getElementById('cuil').value,
                    fechaNacimiento: document.getElementById('fechaNacimiento').value,
                    nacionalidad: document.getElementById('nacionalidad').value,
                    puesto: document.getElementById('puesto').value,
                    observaciones: document.getElementById('observaciones').value, // Guardamos las notas
                    attachments: archivosProcesados, // Array de archivos
                    fechaEntrevista: new Date().toLocaleDateString()
                };

                // 3. Guardar
                const listaActual = await API.cargar('applicants');
                listaActual.push(nuevoAspirante);
                await API.guardar('applicants', listaActual);

                // 4. Reset
                form.reset();
                listarAspirantes();
                alert("Aspirante guardado con éxito.");

            } catch (error) {
                console.error(error);
                alert("Error al guardar (posiblemente archivos muy pesados).");
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.innerText = "Guardar Aspirante";
            }
        });
    }
}

// --- ELIMINAR ---
window.eliminarAspirante = async (id) => {
    if(!confirm("¿Eliminar a este aspirante y sus archivos?")) return;

    const lista = await API.cargar('applicants');
    const nuevaLista = lista.filter(a => a.id !== id);
    
    await API.guardar('applicants', nuevaLista);
    listarAspirantes();
};

// --- LOGICA DE CONTRATACIÓN ---
window.contratarAspirante = async (id) => {
    if(!confirm("¿Confirmar ingreso? Se transferirán los archivos y se generará el reporte de entrevista.")) return;

    const aspirantes = await API.cargar('applicants');
    const personal = await API.cargar('people'); 

    const candidato = aspirantes.find(a => a.id === id);
    if (!candidato) {
        alert("Error: No se encontró al aspirante.");
        return;
    }

    // --- CÁLCULO ID JERÁRQUICO (FIX) ---
    // Buscamos el personJerId más alto y le sumamos 1
    const maxId = personal.reduce((max, p) => {
        const val = parseInt(p.personJerId) || 0;
        return val > max ? val : max;
    }, 0);
    const nextJerId = (maxId + 1).toString();

    // --- GENERACIÓN DEL REPORTE DE ENTREVISTA ---
    const contenidoReporte = `
REPORTE DE ENTREVISTA E INGRESO
===============================
Fecha de Entrevista: ${candidato.fechaEntrevista}
Candidato: ${candidato.nombre}
Puesto Aspirado: ${candidato.puesto}

OBSERVACIONES DEL RECLUTADOR:
-----------------------------
${candidato.observaciones || "Sin observaciones registradas."}

===============================
Generado automáticamente por el Sistema de RRHH.
    `;

    // Convertimos este texto a un "archivo" base64
    const reporteFile = {
        name: `Entrevista_${candidato.nombre.replace(/\s+/g, '_')}.txt`,
        type: 'text/plain',
        data: 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(contenidoReporte)))
    };

    // Preparamos los adjuntos finales
    const adjuntosFinales = candidato.attachments || [];
    adjuntosFinales.push(reporteFile);

    // --- MAPEO DE DATOS ---
    const fechaHoy = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();

    const nuevoEmpleado = {
        "id": `p-${timestamp}`,
        "name": candidato.nombre,
        "cuil": candidato.cuit || candidato.dni,
        "birthDate": candidato.fechaNacimiento,
        "nacionalidad": candidato.nacionalidad,
        "address": "", 
        "maritalStatus": "Soltero/a",
        "emergencyContact": "",
        "photoData": null,

        // Archivos + Reporte
        "attachments": adjuntosFinales, 

        "legajo": `TEMP-${Math.floor(Math.random() * 1000)}`,
        "categoria": candidato.puesto.toUpperCase(), 
        "rol": "JUNIOR",
        "area": "SIN ASIGNAR",
        "coordinador": "SIN ASIGNAR",
        
        "personJerId": nextJerId, // <--- ID CALCULADO CORRECTAMENTE
        "parent": "0",
        "direccionOficina": "",
        "sectorId": "0",
        
        "dateIn": fechaHoy,
        "dateOut": "",
        "cbu": "",
        "obraSocial": "",
        "taxInfo": "",

        "spouseInfo": "",
        "childrenInfo": "",

        "stats": {
            "ADAPTABILIDAD": "0",
            "AUTOCONTROL EMOCIONAL": "0",
            "TRABAJO EN EQUIPO": "0",
            "RESOLUCIÓN": "0",
            "LIDERAZGO": "0"
        },
        "badges": [],

        "devNotes": `Ingreso desde Entrevistas.\nObs: ${candidato.observaciones || ''}`,
        "estudios": "",
        "mision": "",
        "responsabilidades": "",
        "compTecnicas": "",
        "compConductuales": "",
        "experienciaLaboral": "",
        "evalIndicadores": "",
        "evalResultados": "",
        "evalComportamientos": "",
        "evalNivel": "",
        "capNecesidades": "",
        "capPlan": "",
        "capSeguimiento": ""
    };

    // Agregar a Personal y Guardar
    personal.push(nuevoEmpleado);
    const guardadoPersonal = await API.guardar('people', personal);

    if (guardadoPersonal && guardadoPersonal.success !== false) {
        const aspirantesRestantes = aspirantes.filter(a => a.id !== id);
        await API.guardar('applicants', aspirantesRestantes);
        
        alert(`¡Éxito! ${candidato.nombre} ingresado con ID Jerárquico #${nextJerId}.`);
        listarAspirantes();
    } else {
        alert("Hubo un error al guardar en Personal.");
    }
};