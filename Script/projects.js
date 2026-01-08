// ==========================================
// Script/projects.js
// Gestión de Proyectos (Pre-Talleres)
// ==========================================

let allProjects = [];
let currentProjectId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos
    allProjects = await API.cargar('projects') || [];
    console.log("📦 Proyectos cargados:", allProjects);

    // 2. Renderizar lista
    renderProjectList();

    // 3. Inicializar Flatpickr
    flatpickr("#projectStartModal", { dateFormat: "Y-m-d" });
    flatpickr("#projectEndModal", { dateFormat: "Y-m-d" });

    // 4. Event Listeners
    document.getElementById('btnNewProject').addEventListener('click', () => openModal());
    document.getElementById('projectClose').addEventListener('click', closeModal);
    document.getElementById('projectCancel').addEventListener('click', closeModal);
    document.getElementById('projectFormModal').addEventListener('submit', handleSave);
    
    // Listener para subir archivos (Docs)
    document.getElementById('docInput').addEventListener('change', handleFileUpload);
    
    // Listener para Aprobar
    document.getElementById('btnApproveProject').addEventListener('click', approveProject);
});

// ==========================================
// RENDERIZADO
// ==========================================
function renderProjectList() {
    const container = document.getElementById('projectList');
    container.innerHTML = '';

    if (allProjects.length === 0) {
        container.innerHTML = '<div class="muted">No hay proyectos en planificación.</div>';
        return;
    }

    allProjects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'workshop-card'; // Reusamos clase CSS de talleres
        // Borde naranja para diferenciar que es proyecto
        card.style.borderLeft = "5px solid #ed8936"; 
        
        // Contar docs y logs
        const docsCount = p.docs ? p.docs.length : 0;
        const logsCount = p.logs ? p.logs.length : 0;

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h4 style="margin:0;">${p.name}</h4>
                <div class="dropdown">
                    <button class="btn-icon"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    <div class="dropdown-content">
                        <a href="#" onclick="openModal('${p.id}')">Editar / Archivos</a>
                        <a href="#" onclick="deleteProject('${p.id}')" style="color:red;">Eliminar</a>
                    </div>
                </div>
            </div>
            <p class="muted" style="font-size:0.9rem; margin:5px 0;">
                <i class="fa-solid fa-chalkboard-user"></i> ${p.instructor || 'Sin instructor'}
            </p>
            <div style="margin-top:10px; font-size:0.8rem; color:#555;">
                <span style="margin-right:10px;"><i class="fa-solid fa-file"></i> ${docsCount} Archivos</span>
                <span><i class="fa-solid fa-book"></i> ${logsCount} Bitácoras</span>
            </div>
            <div style="margin-top:10px;">
                <button onclick="openModal('${p.id}')" class="btn small" style="width:100%">Gestionar</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// MODAL & CRUD
// ==========================================
function openModal(id = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectFormModal');
    
    modal.classList.remove('hidden');
    currentProjectId = id;

    // Resetear formulario
    form.reset();
    document.getElementById('projectId').value = '';
    
    // Checkboxes reset
    document.querySelectorAll('input[name="weekday"]').forEach(cb => cb.checked = false);
    
    // Ocultar secciones extra si es nuevo
    document.getElementById('extraSections').style.display = 'none';
    document.getElementById('btnApproveProject').style.display = 'none';

    if (id) {
        // MODO EDICIÓN
        const p = allProjects.find(proj => proj.id === id);
        if (!p) return;

        document.getElementById('projectModalTitle').textContent = "Editar Proyecto";
        document.getElementById('projectId').value = p.id;
        document.getElementById('projectNameModal').value = p.name;
        document.getElementById('projectInstructorModal').value = p.instructor;
        document.getElementById('projectDescModal').value = p.desc || '';
        
        // Fechas (si existen, cortar la parte de la hora 'T...')
        if(p.start) document.getElementById('projectStartModal').value = p.start.split('T')[0];
        if(p.end) document.getElementById('projectEndModal').value = p.end.split('T')[0];

        // Días
        if (p.weekdays) {
            p.weekdays.forEach(d => {
                const cb = document.querySelector(`input[name="weekday"][value="${d}"]`);
                if(cb) cb.checked = true;
            });
        }

        // Mostrar secciones extra y botón aprobar
        document.getElementById('extraSections').style.display = 'block';
        document.getElementById('btnApproveProject').style.display = 'flex'; // FLEX para el icono

        // Renderizar logs y docs internos
        renderInternalDocs(p);
        renderInternalLogs(p);
    } else {
        document.getElementById('projectModalTitle').textContent = "Nuevo Proyecto";
    }
}

function closeModal() {
    document.getElementById('projectModal').classList.add('hidden');
    currentProjectId = null;
}

async function handleSave(e) {
    e.preventDefault();
    
    const id = document.getElementById('projectId').value || 'proj-' + Date.now();
    const name = document.getElementById('projectNameModal').value;
    const instructor = document.getElementById('projectInstructorModal').value;
    const desc = document.getElementById('projectDescModal').value;
    const startVal = document.getElementById('projectStartModal').value;
    const endVal = document.getElementById('projectEndModal').value;

    // Obtener días seleccionados
    const weekdays = [];
    document.querySelectorAll('input[name="weekday"]:checked').forEach(cb => {
        weekdays.push(parseInt(cb.value));
    });

    // Buscar si existe para preservar logs y docs
    const existing = allProjects.find(p => p.id === id);

    const newProject = {
        id: id,
        name: name,
        instructor: instructor,
        desc: desc,
        // Mantener formato ISO si hay fecha, sino null
        start: startVal ? new Date(startVal).toISOString() : null,
        end: endVal ? new Date(endVal).toISOString() : null,
        weekdays: weekdays,
        attendees: existing ? existing.attendees : [], // Preservamos aunque no se usen mucho aquí
        logs: existing ? existing.logs : [],
        docs: existing ? existing.docs : [],
        attendanceLog: existing ? existing.attendanceLog : {}
    };

    if (existing) {
        const index = allProjects.findIndex(p => p.id === id);
        allProjects[index] = newProject;
    } else {
        allProjects.push(newProject);
    }

    try {
        await API.guardar('projects', allProjects);
        closeModal();
        renderProjectList();
        alert('Proyecto guardado correctamente.');
    } catch (err) {
        console.error(err);
        alert('Error al guardar.');
    }
}

window.deleteProject = async function(id) {
    if(!confirm('¿Eliminar este proyecto?')) return;
    allProjects = allProjects.filter(p => p.id !== id);
    await API.guardar('projects', allProjects);
    renderProjectList();
};

// ==========================================
// FUNCIÓN CLAVE: APROBAR Y PASAR A TALLERES
// ==========================================
async function approveProject() {
    if (!currentProjectId) return;
    if (!confirm("¿Estás seguro de APROBAR este proyecto?\n\nSe moverá a la base de datos de Talleres y será visible en el calendario principal.")) return;

    try {
        // 1. Obtener el proyecto actual
        const project = allProjects.find(p => p.id === currentProjectId);
        if (!project) return;

        // 2. Cargar Talleres existentes
        const workshops = await API.cargar('workshops') || []; // O 'talleres' según como tengas tu JSON key
        
        // 3. Transformar ID (Opcional, pero bueno para consistencia)
        // Le cambiamos el prefijo de 'proj-' a 'w-' para indicar que ahora es workshop real
        // O simplemente mantenemos el ID. Vamos a mantener el objeto pero asegurarnos.
        const newWorkshop = JSON.parse(JSON.stringify(project));
        
        // Si quieres cambiar el ID:
        // newWorkshop.id = 'w-' + Date.now(); 

        // 4. Agregarlo a workshops
        workshops.push(newWorkshop);

        // 5. Eliminarlo de projects
        allProjects = allProjects.filter(p => p.id !== currentProjectId);

        // 6. Guardar AMBAS bases de datos
        await API.guardar('workshops', workshops); // Guarda en talleres
        await API.guardar('projects', allProjects); // Actualiza proyectos (quitando el aprobado)

        // 7. UI
        closeModal();
        renderProjectList();
        alert(`✅ ¡Éxito! "${newWorkshop.name}" ahora es un Taller oficial.`);

    } catch (e) {
        console.error(e);
        alert("Error al transferir el proyecto.");
    }
}

// ==========================================
// GESTIÓN DE ARCHIVOS Y BITÁCORA (Simplificada)
// ==========================================

// --- VISUALIZACIÓN ---
window.toggleLogs = () => {
    const el = document.getElementById('logsContainer');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};
window.toggleDocs = () => {
    const el = document.getElementById('docsContainer');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

function renderInternalDocs(project) {
    const list = document.getElementById('docsList');
    list.innerHTML = '';
    if (!project.docs || project.docs.length === 0) {
        list.innerHTML = '<li class="muted">Sin archivos.</li>';
        return;
    }
    project.docs.forEach((doc, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <a href="${doc.data}" download="${doc.name}"><i class="fa-solid fa-download"></i> ${doc.name}</a>
            <span style="color:red; cursor:pointer; margin-left:10px;" onclick="removeDoc('${project.id}', ${idx})">✕</span>
        `;
        list.appendChild(li);
    });
}

function renderInternalLogs(project) {
    const container = document.getElementById('logsContainer');
    // Simple input para nueva bitácora
    let html = `
        <div style="display:flex; gap:5px; margin-bottom:10px;">
            <input id="newLogInput" placeholder="Escribir bitácora..." style="flex:1;">
            <button type="button" class="btn small" onclick="addLog('${project.id}')">Agregar</button>
        </div>
        <ul style="max-height:150px; overflow-y:auto; padding-left:20px;">
    `;
    
    if (project.logs && project.logs.length > 0) {
        project.logs.forEach(l => {
            const dateStr = new Date(l.date).toLocaleDateString();
            html += `<li><strong>${dateStr}:</strong> ${l.content}</li>`;
        });
    } else {
        html += '<li class="muted">Sin registros.</li>';
    }
    html += '</ul>';
    container.innerHTML = html;
}

// --- LOGICA DE ARCHIVOS ---
window.handleFileUpload = function(e) {
    const file = e.target.files[0];
    if (!file || !currentProjectId) return;

    const reader = new FileReader();
    reader.onload = async function(ev) {
        const base64 = ev.target.result;
        const project = allProjects.find(p => p.id === currentProjectId);
        if (!project.docs) project.docs = [];
        
        project.docs.push({
            id: 'doc-' + Date.now(),
            name: file.name,
            type: file.type,
            date: new Date().toISOString(),
            data: base64
        });

        // Guardar cambios al vuelo (opcional, o esperar al submit general)
        // Aquí guardamos solo en memoria hasta que den "Guardar", 
        // PERO para visualizarlo ya mismo refrescamos la lista interna
        renderInternalDocs(project);
    };
    reader.readAsDataURL(file);
};

window.removeDoc = function(projId, docIndex) {
    const project = allProjects.find(p => p.id === projId);
    project.docs.splice(docIndex, 1);
    renderInternalDocs(project);
};

// --- LOGICA DE BITÁCORA ---
window.addLog = function(projId) {
    const content = document.getElementById('newLogInput').value;
    if (!content) return;
    
    const project = allProjects.find(p => p.id === projId);
    if (!project.logs) project.logs = [];

    project.logs.unshift({
        id: 'log-' + Date.now(),
        date: new Date().toISOString(),
        content: content,
        author: 'Admin' // Podrías sacar esto del usuario logueado
    });

    renderInternalLogs(project);
};