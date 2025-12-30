// ==========================================
// 1. CONFIGURACIÓN Y DATOS GLOBALES
// ==========================================
let people = JSON.parse(localStorage.getItem('hr_people_v1') || '[]');
let currentEditingId = null; 

// Iconos para medallas
const PREDEFINED_ICONS = [
    { icon: '🏆', label: 'Copa' }, { icon: '🥇', label: 'Oro' }, { icon: '🥈', label: 'Plata' },
    { icon: '🥉', label: 'Bronce' }, { icon: '⭐', label: 'Estrella' }, { icon: '🔥', label: 'Fuego' },
    { icon: '👑', label: 'Liderazgo' }, { icon: '🎓', label: 'Graduado' }, { icon: '🚀', label: 'Cohete' },
    { icon: '💎', label: 'Diamante' }, { icon: '💡', label: 'Idea' }, { icon: '🤝', label: 'Manos' },
    { icon: '🐧', label: 'Pingüino' }, { icon: '🛡️', label: 'Escudo' }
];

const STAT_KEYS = ['Liderazgo', 'Comunicación', 'Trabajo en Equipo', 'Resolución', 'Puntualidad'];

// ==========================================
// 2. MÓDULO PRINCIPAL (CRUD)
// ==========================================
const PeopleModule = {
    save: function() { localStorage.setItem('hr_people_v1', JSON.stringify(people)); },

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

    const avatar = document.getElementById('detailAvatar');
    avatar.style.backgroundImage = p.photoData ? `url(${p.photoData})` : 'none';
    avatar.textContent = p.photoData ? '' : (p.name ? p.name.charAt(0) : '');

    // Render Body Tabs
    document.getElementById('detailPersonal').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div><label class="lbl-mini">CUIL</label><input class="full-w" id="mod_cuil" value="${p.cuil || ''}"></div>
            <div><label class="lbl-mini">Nacimiento</label><input type="date" class="full-w" id="mod_birthDate" value="${p.birthDate || ''}"></div>
            <div><label class="lbl-mini">Estado Civil</label><input class="full-w" id="mod_maritalStatus" value="${p.maritalStatus || ''}"></div>
            <div><label class="lbl-mini">Domicilio</label><input class="full-w" id="mod_address" value="${p.address || ''}"></div>
            <div style="grid-column: span 2;"><label class="lbl-mini">Contacto Emergencia</label><input class="full-w" id="mod_emergencyContact" value="${p.emergencyContact || ''}"></div>
            <div style="grid-column: span 2;"><label class="lbl-mini">Dirección Oficina</label><input class="full-w" id="mod_direccionOficina" value="${p.direccionOficina || ''}"></div>
        </div>`;

    document.getElementById('detailFamily').innerHTML = `
        <div style="margin-bottom:10px;"><label class="lbl-mini">Cónyuge</label><input class="full-w" id="mod_spouseInfo" value="${p.spouseInfo || ''}"></div>
        <div><label class="lbl-mini">Hijos/Dependientes</label><textarea class="full-w" rows="2" id="mod_childrenInfo">${p.childrenInfo || ''}</textarea></div>`;

    const parentHTML = getParentOptionsHTML(p.parent, p.id);

    document.getElementById('detailDocs').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div><label class="lbl-mini">Legajo</label><input class="full-w" id="mod_legajo" value="${p.legajo || ''}"></div>
            <div><label class="lbl-mini">Categoría</label><input class="full-w" id="mod_categoria" value="${p.categoria || ''}"></div>
            <div><label class="lbl-mini">Rol</label><input class="full-w" id="mod_rol" value="${p.rol || ''}"></div>
            <div><label class="lbl-mini">Área</label><input class="full-w" id="mod_area" value="${p.area || ''}"></div>
            <div><label class="lbl-mini">Coordinador</label><input class="full-w" id="mod_coordinador" value="${p.coordinador || ''}"></div>
            
            <div><label class="lbl-mini">Ingreso</label><input type="date" class="full-w" id="mod_dateIn" value="${p.dateIn || ''}"></div>
            <div><label class="lbl-mini">Egreso</label><input type="date" class="full-w" id="mod_dateOut" value="${p.dateOut || ''}"></div>
            <div><label class="lbl-mini">CBU</label><input class="full-w" id="mod_cbu" value="${p.cbu || ''}"></div>
            <div><label class="lbl-mini">Obra Social</label><input class="full-w" id="mod_obraSocial" value="${p.obraSocial || ''}"></div>
            <div style="grid-column: span 2;"><label class="lbl-mini">Info Fiscal</label><input class="full-w" id="mod_taxInfo" value="${p.taxInfo || ''}"></div>

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

    document.getElementById('deleteFromModal').onclick = () => {
        if(confirm("¿Estás seguro de eliminar este registro?")) {
            const old = p;
            people = people.filter(x => x.id !== id);
            PeopleModule.save();
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
            <strong>Estadísticas (1 al 5)</strong>
            ${STAT_KEYS.map(key => `
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:5px;">
                    <label style="font-size:0.9em; width:120px;">${key}</label>
                    <input type="range" min="1" max="5" step="1" value="${p.stats[key] || 0}" 
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
        <div>
            <label style="font-size:0.8em; font-weight:bold;">Notas de Desarrollo</label>
            <textarea id="mod_devNotes" style="width:100%; box-sizing:border-box;" rows="3">${p.devNotes || ''}</textarea>
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

window.savePersonFromModal = function(id) {
    const idx = people.findIndex(x => x.id === id);
    if(idx === -1) return;

    const oldData = JSON.parse(JSON.stringify(people[idx]));
    const p = people[idx];

    p.name = document.getElementById('mod_name').value;
    p.sectorId = document.getElementById('mod_sectorId').value;
    p.cuil = document.getElementById('mod_cuil').value;
    p.birthDate = document.getElementById('mod_birthDate').value;
    p.maritalStatus = document.getElementById('mod_maritalStatus').value;
    p.address = document.getElementById('mod_address').value;
    p.emergencyContact = document.getElementById('mod_emergencyContact').value;
    p.direccionOficina = document.getElementById('mod_direccionOficina').value;
    p.spouseInfo = document.getElementById('mod_spouseInfo').value;
    p.childrenInfo = document.getElementById('mod_childrenInfo').value;
    p.legajo = document.getElementById('mod_legajo').value;
    p.categoria = document.getElementById('mod_categoria').value;
    p.rol = document.getElementById('mod_rol').value;
    p.area = document.getElementById('mod_area').value;
    p.coordinador = document.getElementById('mod_coordinador').value;
    p.dateIn = document.getElementById('mod_dateIn').value;
    p.dateOut = document.getElementById('mod_dateOut').value;
    p.cbu = document.getElementById('mod_cbu').value;
    p.obraSocial = document.getElementById('mod_obraSocial').value;
    p.taxInfo = document.getElementById('mod_taxInfo').value;

    p.personJerId = document.getElementById('mod_personJerId').value; 
    p.parent = document.getElementById('mod_parent').value; 

    p.stats = {};
    STAT_KEYS.forEach(k => {
        const val = document.getElementById('stat_' + k).value;
        p.stats[k] = val;
    });
    p.devNotes = document.getElementById('mod_devNotes').value;

    PeopleModule.save();
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
function initPeopleUI() {
    
    populateSectorSelects();
    PeopleModule.renderPeople();

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

    function saveAndRefresh(data, id) {
        const idx = people.findIndex(p => p.id === id);
        if (idx !== -1) {
            const old = JSON.parse(JSON.stringify(people[idx]));
            people[idx] = data;
            if(typeof BacklogService !== 'undefined') BacklogService.log('EDITAR','PERSONA', old, people[idx]);
        } else {
            people.unshift(data);
            if(typeof BacklogService !== 'undefined') BacklogService.log('CREAR','PERSONA', null, data);
        }
        
        PeopleModule.save();
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