// ==========================================
// 1. CONFIGURACIÓN Y DATOS GLOBALES
// ==========================================
let people = []; // Inicia vacío, luego se llenará con la API
let currentEditingId = null;

// Iconos para medallas
const PREDEFINED_ICONS = [
    { icon: '🏆', label: 'Copa' }, { icon: '🥇', label: 'Oro' }, { icon: '🥈', label: 'Plata' },
    { icon: '🥉', label: 'Bronce' }, { icon: '⭐', label: 'Estrella' }, { icon: '🔥', label: 'Fuego' },
    { icon: '👑', label: 'Liderazgo' }, { icon: '🎓', label: 'Graduado' }, { icon: '🚀', label: 'Cohete' },
    { icon: '💎', label: 'Diamante' }, { icon: '💡', label: 'Idea' }, { icon: '🤝', label: 'Manos' },
    { icon: '🐧', label: 'Pingüino' }, { icon: '🛡️', label: 'Escudo' }
];

const STAT_KEYS = ['ADAPTABILIDAD', 'AUTOCONTROL EMOCIONAL', 'TRABAJO EN EQUIPO', 'RESOLUCIÓN', 'LIDERAZGO'];

// ==========================================
// 2. MÓDULO PRINCIPAL (CRUD)
// ==========================================
const PeopleModule = {
    // Ahora es ASYNC para esperar a que el servidor confirme
    save: async function() { 
        await API.guardar('people', people); 
    },

    getSectorName: function(p) {
        const allSectors = window.sectors || [];
        if (p.area && p.area.trim() !== "") return p.area; // Prioridad texto manual
        const found = allSectors.find(s => s.id === p.sectorId);
        return found ? found.name : 'Sin sector asignado';
    },

    renderPeople: function() {
        const container = document.getElementById('peopleContainer');
        if (!container) return; 
        
        const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const sectorF = document.getElementById('filterSector')?.value || '';

        const filtered = people.filter(p => 
            (p.name.toLowerCase().includes(search) || (p.cuil||'').includes(search) || (p.legajo||'').includes(search)) &&
            (!sectorF || p.sectorId === sectorF)
        );

        if(filtered.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No se encontraron personas.</div>';
            return;
        }

        container.innerHTML = filtered.map(p => `
            <div class="person-card">
                <div class="card-info">
                    <div class="avatar-mini" style="${p.photoData ? `background-image:url(${p.photoData});background-size:cover;` : ''}">
                        ${p.photoData ? '' : (p.name ? p.name.charAt(0) : '?')}
                    </div>
                    <div>
                        <strong>${p.name}</strong>
                        <div class="small muted">${this.getSectorName(p)} | Leg: ${p.legajo || '-'}</div>
                        <div style="margin-top:2px; font-size:0.9em;">
                            ${(p.badges || []).map(b => `<span title="${b.name}">${b.icon}</span>`).join(' ')}
                        </div>
                    </div>
                </div>
                <button class="btn small" onclick="viewPerson('${p.id}')">Ver/Editar</button>
            </div>
        `).join('');
    }
};

// ==========================================
// 3. FUNCIONES AUXILIARES (Organigrama y UI)
// ==========================================

function getNextJerId() {
    if (!people || people.length === 0) return 1;
    const maxId = people.reduce((max, p) => {
        const val = parseInt(p.personJerId) || 0;
        return val > max ? val : max;
    }, 0);
    return maxId + 1;
}

function getParentOptionsHTML(currentParentValue, currentPersonId) {
    const candidates = people.filter(p => p.id !== currentPersonId);
    let html = '<option value="">-- Sin Jefe (Raíz) --</option>';
    
    candidates.forEach(c => {
        const jerId = c.personJerId || 0; 
        const isSelected = (String(currentParentValue) === String(jerId)) ? 'selected' : '';
        html += `<option value="${jerId}" ${isSelected}>[${jerId}] ${c.name} (${c.rol || '-'})</option>`;
    });
    return html;
}

function populateSectorSelects() {
    const allSectors = window.sectors || [];
    const options = allSectors.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    const formSelect = document.getElementById('personSector');
    if(formSelect) formSelect.innerHTML = '<option value="">Seleccione...</option>' + options;

    const filterSelect = document.getElementById('filterSector');
    if(filterSelect) filterSelect.innerHTML = '<option value="">Todos los sectores</option>' + options;
}

// ==========================================
// 4. FUNCIONES GLOBALES (Edit, Badges, Modal)
// ==========================================

// Esta función es la que pedías que volviera (llena el formulario principal)
window.fillForm = function(p) {
    document.getElementById('personId').value = p.id;
    document.getElementById('fullName').value = p.name || '';
    document.getElementById('cuil').value = p.cuil || '';
    document.getElementById('birthDate').value = p.birthDate || '';
    document.getElementById('address').value = p.address || '';
    document.getElementById('maritalStatus').value = p.maritalStatus || '';
    document.getElementById('emergencyContact').value = p.emergencyContact || '';
    
    document.getElementById('legajo').value = p.legajo || '';
    document.getElementById('categoria').value = p.categoria || '';
    document.getElementById('rol').value = p.rol || '';
    document.getElementById('area').value = p.area || '';
    document.getElementById('coordinador').value = p.coordinador || '';
    
    document.getElementById('personJerId').value = p.personJerId || '';
    document.getElementById('parent').value = p.parent || '';
    document.getElementById('direccionOficina').value = p.direccionOficina || '';
    
    document.getElementById('spouseInfo').value = p.spouseInfo || '';
    document.getElementById('childrenInfo').value = p.childrenInfo || '';
    
    document.getElementById('personSector').value = p.sectorId || '';
    document.getElementById('dateIn').value = p.dateIn || '';
    document.getElementById('dateOut').value = p.dateOut || '';
    document.getElementById('cbu').value = p.cbu || '';
    document.getElementById('obraSocial').value = p.obraSocial || '';
    document.getElementById('taxInfo').value = p.taxInfo || '';
    
    window.scrollTo({top: 0, behavior: 'smooth'});
};

// ==========================================
// FUNCIÓN VIEW PERSON (ACTUALIZADA CON CAMPOS EXTRA)
// ==========================================
window.viewPerson = function(id) {
    const p = people.find(x => x.id === id);
    if (!p) return;

    currentEditingId = id;
    if (!p.stats) p.stats = {};
    if (!p.badges) p.badges = [];
    if (!p.devNotes) p.devNotes = "";
    
    let displayJerId = p.personJerId || getNextJerId();

    // Render Modal Header
    document.getElementById('detailName').innerHTML = `<input type="text" id="mod_name" value="${p.name}" style="font-size:1.2rem; font-weight:bold; width:100%; border:none; border-bottom:1px solid #ccc;">`;
    
    const allSectors = window.sectors || [];
    const sectorOptions = allSectors.map(s => `<option value="${s.id}" ${p.sectorId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    document.getElementById('detailSector').innerHTML = `<select id="mod_sectorId" style="border:none; background:transparent; font-weight:bold; color:#666;"><option value="">-- Sin Sector --</option>${sectorOptions}</select>`;

    // --- CORRECCIÓN DE IMAGEN AQUÍ ---
    const avatar = document.getElementById('detailAvatar');
    avatar.style.backgroundImage = 'none'; // Limpiamos estilos viejos

    if (p.photoData) {
        // Inyectamos la etiqueta IMG para que el CSS (object-fit) funcione y se vea redonda
        avatar.innerHTML = `<img src="${p.photoData}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">`;
    } else {
        // Si no hay foto, mostramos la inicial
        avatar.innerHTML = `<span style="font-size:2.5rem; color:#cbd5e0;">${p.name ? p.name.charAt(0).toUpperCase() : '?'}</span>`;
    }
    // --------------------------------
    // --- PESTAÑA 1: DATOS PERSONALES (Expandida) ---
    document.getElementById('detailPersonal').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div><label class="lbl-mini">CUIL/DNI</label><input class="full-w" id="mod_cuil" value="${p.cuil || ''}"></div>
            <div><label class="lbl-mini">Nacimiento</label><input type="date" class="full-w" id="mod_birthDate" value="${p.birthDate || ''}"></div>
            <div><label class="lbl-mini">Nacionalidad</label><input class="full-w" id="mod_nacionalidad" value="${p.nacionalidad || ''}" placeholder="Ej: Argentina"></div>
            <div><label class="lbl-mini">Estado Civil</label><input class="full-w" id="mod_maritalStatus" value="${p.maritalStatus || ''}"></div>
            
            <div style="grid-column: span 2;"><label class="lbl-mini">Domicilio</label><input class="full-w" id="mod_address" value="${p.address || ''}"></div>
            
            <div style="grid-column: span 2;">
                <label class="lbl-mini">🎓 Estudios / Título</label>
                <textarea class="full-w" id="mod_estudios" rows="2" placeholder="Ej: Abogacía - UNNE">${p.estudios || ''}</textarea>
            </div>
            <div style="grid-column: span 2;">
                <label class="lbl-mini">Experiencia Laboral</label>
                <textarea class="full-w" id="mod_experienciaLaboral" rows="2" placeholder="ESTUDIO JURÍDICO EN POSADAS , MISIONES (2020)">${p.experienciaLaboral || ''}</textarea>
            </div>

            <div style="grid-column: span 2;"><label class="lbl-mini">Contacto Emergencia</label><input class="full-w" id="mod_emergencyContact" value="${p.emergencyContact || ''}"></div>
            <div style="grid-column: span 2;"><label class="lbl-mini">Dirección Oficina</label><input class="full-w" id="mod_direccionOficina" value="${p.direccionOficina || ''}"></div>
        </div>`;

    // --- PESTAÑA 2: FAMILIA ---
    document.getElementById('detailFamily').innerHTML = `
        <div style="margin-bottom:10px;"><label class="lbl-mini">Cónyuge</label><input class="full-w" id="mod_spouseInfo" value="${p.spouseInfo || ''}"></div>
        <div><label class="lbl-mini">Hijos/Dependientes</label><textarea class="full-w" rows="2" id="mod_childrenInfo">${p.childrenInfo || ''}</textarea></div>`;

    const parentHTML = getParentOptionsHTML(p.parent, p.id);

    // --- PESTAÑA 3: DATOS LABORALES (Expandida con Misión y Competencias) ---
    document.getElementById('detailDocs').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div><label class="lbl-mini">Legajo</label><input class="full-w" id="mod_legajo" value="${p.legajo || ''}"></div>
            <div><label class="lbl-mini">Categoría</label><input class="full-w" id="mod_categoria" value="${p.categoria || ''}"></div>
            <div style="grid-column: span 2;"><label class="lbl-mini">Rol / Puesto</label><input class="full-w" id="mod_rol" value="${p.rol || ''}"></div>
            
            <div><label class="lbl-mini">Área</label><input class="full-w" id="mod_area" value="${p.area || ''}"></div>
            <div><label class="lbl-mini">Coordinador</label><input class="full-w" id="mod_coordinador" value="${p.coordinador || ''}"></div>
            
            <div style="grid-column: span 2; margin-top:5px;">
                <label class="lbl-mini" style="font-weight:bold; color:#555;">🎯 Misión del Puesto</label>
                <textarea class="full-w" rows="2" id="mod_mision" placeholder="Propósito principal del cargo...">${p.mision || ''}</textarea>
            </div>
            <div style="grid-column: span 2;">
                <label class="lbl-mini" style="font-weight:bold; color:#555;">📋 Responsabilidades Clave</label>
                <textarea class="full-w" rows="3" id="mod_responsabilidades" placeholder="- Tarea 1\n- Tarea 2...">${p.responsabilidades || ''}</textarea>
            </div>

            <div style="grid-column: span 2; display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:5px;">
                <div>
                    <label class="lbl-mini" style="font-weight:bold;">Competencias Técnicas</label>
                    <textarea class="full-w" rows="2" id="mod_compTecnicas">${p.compTecnicas || ''}</textarea>
                </div>
                <div>
                    <label class="lbl-mini" style="font-weight:bold;">Competencias Conductuales</label>
                    <textarea class="full-w" rows="2" id="mod_compConductuales">${p.compConductuales || ''}</textarea>
                </div>
            </div>
            
            <div style="border-top:1px solid #eee; grid-column: span 2; margin-top:5px; padding-top:5px; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                <div><label class="lbl-mini">Ingreso</label><input type="date" class="full-w" id="mod_dateIn" value="${p.dateIn || ''}"></div>
                <div><label class="lbl-mini">Egreso</label><input type="date" class="full-w" id="mod_dateOut" value="${p.dateOut || ''}"></div>
                <div><label class="lbl-mini">CBU</label><input class="full-w" id="mod_cbu" value="${p.cbu || ''}"></div>
                <div><label class="lbl-mini">Obra Social</label><input class="full-w" id="mod_obraSocial" value="${p.obraSocial || ''}"></div>
                <div style="grid-column: span 2;"><label class="lbl-mini">Info Fiscal</label><input class="full-w" id="mod_taxInfo" value="${p.taxInfo || ''}"></div>
            </div>

            <div style="grid-column: span 2; background:#eef; padding:10px; border-radius:4px; margin-top:5px; border:1px solid #ccd;">
                <h4 style="margin:0 0 10px 0; color:#333;">🌳 Configuración Organigrama</h4>
                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:10px;">
                    <div>
                        <label class="lbl-mini" style="font-weight:bold; color:#0056b3;">ID Nodo</label>
                        <input type="number" id="mod_personJerId" value="${displayJerId}" class="full-w" style="font-weight:bold; text-align:center;">
                    </div>
                    <div>
                        <label class="lbl-mini" style="font-weight:bold;">Reporta a (Jefe)</label>
                        <select id="mod_parent" class="full-w">${parentHTML}</select>
                    </div>
                </div>
            </div>
        </div>
        <style>.lbl-mini { font-size:0.8em; color:#666; display:block; } .full-w { width:100%; box-sizing:border-box; }</style>
    `;

    renderDevelopmentTab(p);

    document.getElementById('detailModal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    const editBtn = document.getElementById('editFromModal');
    editBtn.textContent = "💾 Guardar Todo";
    editBtn.onclick = () => { savePersonFromModal(p.id); };

    document.getElementById('deleteFromModal').onclick = async () => {
        if(confirm("¿Estás seguro de eliminar este registro?")) {
            const old = p;
            people = people.filter(x => x.id !== id);
            await PeopleModule.save();
            PeopleModule.renderPeople();
            if(typeof BacklogService !== 'undefined') BacklogService.log('BORRAR','PERSONA', old, null);
            closeDetail();
        }
    };
};

function renderDevelopmentTab(p) {
    let devContainer = document.getElementById('detailDevelopment');
    if (!devContainer) {
        const docsDiv = document.getElementById('detailDocs');
        devContainer = document.createElement('div');
        devContainer.id = 'detailDevelopment';
        devContainer.style.marginTop = "15px";
        devContainer.style.borderTop = "2px solid #eee";
        devContainer.style.paddingTop = "10px";
        docsDiv.parentNode.appendChild(devContainer);
    }
    const iconOptions = PREDEFINED_ICONS.map(i => `<option value="${i.icon}">${i.icon} ${i.label}</option>`).join('');

    devContainer.innerHTML = `
        <h3 style="margin:10px 0;">📈 Ficha de Desarrollo</h3>
        
        <div style="background:#f9f9f9; padding:10px; border-radius:5px; margin-bottom:10px;">
            <strong>Estadísticas (0 al 10)</strong>
            ${STAT_KEYS.map(key => `
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:5px;">
                    <label style="font-size:0.9em; width:120px;">${key}</label>
                    <input type="range" min="0" max="10" step="1" value="${p.stats[key] || 0}" 
                        id="stat_${key}" style="flex:1" oninput="document.getElementById('val_${key}').innerText = this.value">
                    <span id="val_${key}" style="width:20px; text-align:right; font-weight:bold;">${p.stats[key] || 0}</span>
                </div>
            `).join('')}
        </div>

        <div style="background:#f9f9f9; padding:10px; border-radius:5px; margin-bottom:10px;">
            <strong>🏅 Medallas e Insignias</strong>
            <div id="activeBadgesArea" style="display:flex; flex-wrap:wrap; gap:10px; padding:10px 0; min-height:40px;">
                ${renderBadgesHTML(p.badges)}
            </div>
            <div style="border-top:1px solid #ddd; padding-top:10px; margin-top:5px; display:flex; gap:5px; align-items:center;">
                <select id="newBadgeIcon" style="font-size:1.2em; padding:5px; width:70px;">${iconOptions}</select>
                <input type="text" id="newBadgeName" placeholder="Título" style="flex:1;">
                <button class="btn small" type="button" onclick="addNewBadgeManual()">Agregar</button>
            </div>
        </div>

        <div style="margin-top:20px; border-top: 1px solid #ddd; padding-top:15px;">
            <h4 style="background:#e3f2fd; padding:8px; border-radius:4px; color:#0d47a1; margin-bottom:10px;">📋 EVALUACIÓN DEL DESEMPEÑO</h4>
            <label class="lbl-mini" style="font-weight:bold;">1. INDICADORES CLAVES</label>
            <textarea id="mod_evalIndicadores" class="full-w" rows="2">${p.evalIndicadores || ''}</textarea>
            <label class="lbl-mini" style="font-weight:bold; margin-top:8px;">2. RESULTADOS ALCANZADOS</label>
            <textarea id="mod_evalResultados" class="full-w" rows="2">${p.evalResultados || ''}</textarea>
            <label class="lbl-mini" style="font-weight:bold; margin-top:8px;">3. COMPORTAMIENTOS OBSERVADOS</label>
            <textarea id="mod_evalComportamientos" class="full-w" rows="2">${p.evalComportamientos || ''}</textarea>
            <label class="lbl-mini" style="font-weight:bold; margin-top:8px;">4. NIVEL DE DESEMPEÑO</label>
            <textarea id="mod_evalNivel" class="full-w" rows="2">${p.evalNivel || ''}</textarea>
        </div>

        <div style="margin-top:20px; border-top: 1px solid #ddd; padding-top:15px;">
            <h4 style="background:#e8f5e9; padding:8px; border-radius:4px; color:#1b5e20; margin-bottom:10px;">🚀 DESARROLLO Y CAPACITACIÓN</h4>
            <label class="lbl-mini" style="font-weight:bold;">1. NECESIDADES DETECTADAS</label>
            <textarea id="mod_capNecesidades" class="full-w" rows="2">${p.capNecesidades || ''}</textarea>
            <label class="lbl-mini" style="font-weight:bold; margin-top:8px;">2. PLAN DE CAPACITACIÓN</label>
            <textarea id="mod_capPlan" class="full-w" rows="2">${p.capPlan || ''}</textarea>
            <label class="lbl-mini" style="font-weight:bold; margin-top:8px;">3. ACCIONES DE SEGUIMIENTO</label>
            <textarea id="mod_capSeguimiento" class="full-w" rows="2">${p.capSeguimiento || ''}</textarea>
        </div>

        <div style="margin-top:20px; border-top: 1px solid #ddd; padding-top:15px;">
            <h4 style="background:#fff3e0; padding:8px; border-radius:4px; color:#e65100; margin-bottom:10px;">🗂️ DOCUMENTACIÓN Y ARCHIVOS</h4>
            
            <div id="fileListArea" style="margin-bottom:10px;">
                ${renderFilesListHTML(p.attachments)}
            </div>

            <div style="display:flex; gap:10px; align-items:center; background:#fafafa; padding:10px; border:1px dashed #ccc; border-radius:5px;">
                <input type="file" id="newFileInput" style="flex:1;" multiple>
                <button class="btn small" type="button" onclick="handleFileUploadManual()">Subir Archivo</button>
            </div>
            <p style="font-size:0.75em; color:#999; margin-top:5px;">* Nota: Evitar archivos muy pesados hasta tener el servidor local.</p>
        </div>
    `;
}
function renderBadgesHTML(badges) {
    if(!badges || badges.length === 0) return '<span style="color:#999; font-size:0.8em;">Sin medallas aún...</span>';
    return badges.map((b, idx) => `
        <div style="position:relative; cursor:help; font-size:1.5em; border:1px solid #eee; border-radius:5px; padding:2px;" title="${b.name}">
            ${b.icon}
            <span onclick="removeBadge(${idx})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; width:15px; height:15px; font-size:10px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">x</span>
        </div>
    `).join('');
}

window.addNewBadgeManual = function() {
    const icon = document.getElementById('newBadgeIcon').value;
    const name = document.getElementById('newBadgeName').value;
    if(!name) return alert('Debes escribir un nombre para la medalla');
    const p = people.find(x => x.id === currentEditingId);
    if(p) {
        if(!p.badges) p.badges = [];
        p.badges.push({ icon, name });
        document.getElementById('activeBadgesArea').innerHTML = renderBadgesHTML(p.badges);
        document.getElementById('newBadgeName').value = ''; 
    }
};

window.removeBadge = function(idx) {
    const p = people.find(x => x.id === currentEditingId);
    if(p && p.badges && confirm('¿Quitar esta medalla?')) {
        p.badges.splice(idx, 1);
        document.getElementById('activeBadgesArea').innerHTML = renderBadgesHTML(p.badges);
    }
};

// ==========================================
// FUNCIÓN SAVE PERSON FROM MODAL (ACTUALIZADA)
// ==========================================
window.savePersonFromModal = async function(id) {
    const idx = people.findIndex(x => x.id === id);
    if(idx === -1) return;

    const oldData = JSON.parse(JSON.stringify(people[idx]));
    const p = people[idx];

    // Mapeo seguro usando getSafeValue
    // Nota: getSafeValue es una función auxiliar que te pasé en la respuesta anterior.
    // Si no la tienes definida, usa document.getElementById(...).value directamente.
    
    const getValue = (elemId) => {
        const el = document.getElementById(elemId);
        return el ? el.value : '';
    };

    p.name = getValue('mod_name');
    p.sectorId = getValue('mod_sectorId');
    p.cuil = getValue('mod_cuil');
    p.birthDate = getValue('mod_birthDate');
    p.maritalStatus = getValue('mod_maritalStatus');
    p.address = getValue('mod_address');
    
    // Campos Nuevos Personales
    p.nacionalidad = getValue('mod_nacionalidad');
    p.estudios = getValue('mod_estudios');
    p.experienciaLaboral = getValue('mod_experienciaLaboral');

    p.emergencyContact = getValue('mod_emergencyContact');
    p.direccionOficina = getValue('mod_direccionOficina');
    p.spouseInfo = getValue('mod_spouseInfo');
    p.childrenInfo = getValue('mod_childrenInfo');
    
    // Laborales
    p.legajo = getValue('mod_legajo');
    p.categoria = getValue('mod_categoria');
    p.rol = getValue('mod_rol');
    p.area = getValue('mod_area');
    p.coordinador = getValue('mod_coordinador');
    
    // Campos Nuevos Laborales
    p.mision = getValue('mod_mision');
    p.responsabilidades = getValue('mod_responsabilidades');
    p.compTecnicas = getValue('mod_compTecnicas');
    p.compConductuales = getValue('mod_compConductuales');

    p.dateIn = getValue('mod_dateIn');
    p.dateOut = getValue('mod_dateOut');
    p.cbu = getValue('mod_cbu');
    p.obraSocial = getValue('mod_obraSocial');
    p.taxInfo = getValue('mod_taxInfo');

    // Organigrama
    p.personJerId = getValue('mod_personJerId'); 
    p.parent = getValue('mod_parent'); 

    // Stats y Notas
    p.stats = {};
    STAT_KEYS.forEach(k => {
        const val = getValue('stat_' + k);
        p.stats[k] = val;
    });
    p.devNotes = getValue('mod_devNotes');
    // Evaluación
    p.evalIndicadores = getValue('mod_evalIndicadores');
    p.evalResultados = getValue('mod_evalResultados');
    p.evalComportamientos = getValue('mod_evalComportamientos');
    p.evalNivel = getValue('mod_evalNivel');
    // Capacitación
    p.capNecesidades = getValue('mod_capNecesidades');
    p.capPlan = getValue('mod_capPlan');
    p.capSeguimiento = getValue('mod_capSeguimiento');

    await PeopleModule.save(); // Esperamos al servidor
    PeopleModule.renderPeople();

    if(typeof BacklogService !== 'undefined') {
        BacklogService.log('EDITAR','PERSONA', oldData, p);
    }
    alert('Ficha actualizada correctamente');
    closeDetail();
};

window.closeDetail = function() { 
    document.getElementById('detailModal').classList.add('hidden'); 
    document.body.classList.remove('modal-open'); 
    currentEditingId = null;
};

// ==========================================
// 5. INICIALIZACIÓN (DOMContentLoaded)
// ==========================================
async function initPeopleUI() {
    console.log("⏳ Cargando personal desde servidor...");
    
    // 1. CARGAMOS DATOS DEL SERVIDOR
    people = await API.cargar('people');
    // Si usas sectores dinámicos, descomenta la siguiente línea:
    // window.sectors = await API.cargar('sectors'); 
    console.log("📦 3. Datos recibidos del servidor:", people);
    console.log("🔢 Cantidad de personas:", people.length);
    // 2. Renderizamos
    populateSectorSelects();
    PeopleModule.renderPeople();

    // Lógica del FORMULARIO PRINCIPAL (Submit) ... (El resto sigue igual abajo)
    // Lógica del FORMULARIO PRINCIPAL (Submit)
    const form = document.getElementById('personForm');
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Si hay un ID en el hidden, es edición. Si no, creación con timestamp
            const id = document.getElementById('personId').value || 'p-' + Date.now();
            const existing = people.find(p => p.id === id);

            const data = {
                id,
                name: document.getElementById('fullName').value,
                cuil: document.getElementById('cuil').value,
                birthDate: document.getElementById('birthDate').value,
                address: document.getElementById('address').value,
                maritalStatus: document.getElementById('maritalStatus').value,
                emergencyContact: document.getElementById('emergencyContact').value,
                legajo: document.getElementById('legajo').value,
                categoria: document.getElementById('categoria').value,
                rol: document.getElementById('rol').value,
                area: document.getElementById('area').value,
                coordinador: document.getElementById('coordinador').value,
                
                // --- ID JERÁRQUICO AUTOMÁTICO ---
                // Si el campo está vacío, genera uno.
                personJerId: document.getElementById('personJerId').value || getNextJerId(),
                parent: document.getElementById('parent').value,

                direccionOficina: document.getElementById('direccionOficina').value,
                spouseInfo: document.getElementById('spouseInfo').value,
                childrenInfo: document.getElementById('childrenInfo').value,
                sectorId: document.getElementById('personSector').value,
                dateIn: document.getElementById('dateIn').value,
                dateOut: document.getElementById('dateOut').value,
                cbu: document.getElementById('cbu').value,
                obraSocial: document.getElementById('obraSocial').value,
                taxInfo: document.getElementById('taxInfo').value,
                
                // Mantener datos complejos
                photoData: existing?.photoData || null,
                stats: existing?.stats || {},
                badges: existing?.badges || [],
                devNotes: existing?.devNotes || ""
            };

            const file = document.getElementById('photoInput').files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    data.photoData = ev.target.result;
                    saveAndRefresh(data, id);
                };
                reader.readAsDataURL(file);
            } else {
                saveAndRefresh(data, id);
            }
        });
    }

    async function saveAndRefresh(data, id) {
        const idx = people.findIndex(p => p.id === id);
        if (idx !== -1) {
            const old = JSON.parse(JSON.stringify(people[idx]));
            people[idx] = data;
            if(typeof BacklogService !== 'undefined') BacklogService.log('EDITAR','PERSONA', old, people[idx]);
        } else {
            people.unshift(data);
            if(typeof BacklogService !== 'undefined') BacklogService.log('CREAR','PERSONA', null, data);
        }
        
        await PeopleModule.save();
        PeopleModule.renderPeople();
        form.reset();
        document.getElementById('personId').value = '';
        alert('Datos guardados correctamente');
    }

    // Listeners UI
    document.getElementById('modalClose')?.addEventListener('click', window.closeDetail);
    document.getElementById('closeModalBottom')?.addEventListener('click', window.closeDetail);
    document.getElementById('searchInput')?.addEventListener('input', () => PeopleModule.renderPeople());
    document.getElementById('filterSector')?.addEventListener('change', () => PeopleModule.renderPeople());
    
    document.getElementById('btnClear')?.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterSector').value = '';
        PeopleModule.renderPeople();
    });
    
    document.getElementById('btnReset')?.addEventListener('click', () => {
        if(form) form.reset();
        document.getElementById('personId').value = '';
    });
}

document.addEventListener('DOMContentLoaded', initPeopleUI);

// Dibuja la lista de archivos
function renderFilesListHTML(attachments) {
    if (!attachments || attachments.length === 0) return '<div style="color:#999; font-style:italic;">No hay archivos adjuntos.</div>';
    
    return attachments.map((file, idx) => {
        // Detectamos si es visualizable (Imagen o PDF)
        const isViewable = file.type.includes('image') || file.type === 'application/pdf';
        
        // Botón de Ver (Solo si es compatible)
        const viewBtn = isViewable 
            ? `<button type="button" onclick="previewFile(${idx})" style="background:#e3f2fd; border:1px solid #2196f3; color:#0d47a1; cursor:pointer; margin-right:5px; padding:2px 8px; border-radius:4px; font-weight:bold;" title="Ver archivo">👁️</button>` 
            : '';

        return `
        <div style="display:flex; align-items:center; justify-content:space-between; background:white; border:1px solid #eee; padding:5px; margin-bottom:5px; border-radius:4px;">
            <div style="display:flex; align-items:center; gap:8px; overflow:hidden; flex:1;">
                <span style="font-size:1.2em;">📄</span>
                <div style="overflow:hidden;">
                    <a href="${file.data}" download="${file.name}" style="text-decoration:none; color:#333; font-weight:bold; white-space:nowrap; font-size:0.9em;">
                        ${file.name}
                    </a>
                    <div style="font-size:0.7em; color:#999;">${file.date || '-'}</div>
                </div>
            </div>
            <div style="display:flex; align-items:center;">
                ${viewBtn}
                <a href="${file.data}" download="${file.name}" style="text-decoration:none; background:#f5f5f5; border:1px solid #ccc; color:#333; padding:2px 8px; border-radius:4px; margin-right:5px; font-size:0.8em;">⬇</a>
                <button type="button" onclick="removeFileManual(${idx})" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold; font-size:1.1em;">×</button>
            </div>
        </div>
    `;
    }).join('');
}

// Procesa la subida del archivo (Base64)
window.handleFileUploadManual = function() {
    const input = document.getElementById('newFileInput');
    // 1. Obtenemos la lista de todos los archivos seleccionados
    const files = input.files; 
    
    if (!files || files.length === 0) return alert("Selecciona al menos un archivo.");

    const p = people.find(x => x.id === currentEditingId);
    if (!p) return;
    
    if (!p.attachments) p.attachments = [];

    // 2. Convertimos la lista a Array y la recorremos archivo por archivo
    Array.from(files).forEach(file => {
        
        // Validación de tamaño (2MB) por archivo para no saturar el LocalStorage
        if (file.size > 2 * 1024 * 1024) {
            alert(`El archivo "${file.name}" es muy pesado (>2MB) y se omitió.`);
            return; // Salta este archivo y sigue con el siguiente
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Agregamos el archivo al array de la persona
            p.attachments.push({
                name: file.name,
                type: file.type,
                date: new Date().toLocaleDateString(),
                data: e.target.result // Aquí guardamos el Base64
            });

            // Actualizamos la vista de la lista inmediatamente
            document.getElementById('fileListArea').innerHTML = renderFilesListHTML(p.attachments);
        };
        
        // Leemos el archivo actual
        reader.readAsDataURL(file);
    });

    // Limpiamos el input al final para que quede listo para otra carga
    input.value = '';
};
// Borra archivo
window.removeFileManual = function(idx) {
    const p = people.find(x => x.id === currentEditingId);
    if (p && p.attachments && confirm("¿Eliminar este archivo adjunto?")) {
        p.attachments.splice(idx, 1);
        document.getElementById('fileListArea').innerHTML = renderFilesListHTML(p.attachments);
    }
};

// Vista previa de archivo en nueva pestaña
window.previewFile = function(idx) {
    const p = people.find(x => x.id === currentEditingId);
    if (!p || !p.attachments[idx]) return;

    const file = p.attachments[idx];

    // Abrir una nueva pestaña en blanco
    const newTab = window.open();
    
    if (!newTab) {
        alert("El navegador bloqueó la ventana emergente. Por favor permite pop-ups para ver el archivo.");
        return;
    }

    // Escribir el contenido en la nueva pestaña
    newTab.document.write(`
        <html>
            <head><title>Vista Previa: ${file.name}</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#333; height:100vh;">
                <iframe src="${file.data}" style="border:none; width:100%; height:100%;" allowfullscreen></iframe>
            </body>
        </html>
    `);
    newTab.document.close(); // Importante para que el navegador termine de cargar
};