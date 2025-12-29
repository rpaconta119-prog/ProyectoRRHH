let people = JSON.parse(localStorage.getItem('hr_people_v1') || '[]');

// Variable global para saber a quién estamos editando
let currentEditingId = null; 

// 1. EL "ENUM" DE ICONOS (Aquí agregas los que quieras)
const PREDEFINED_ICONS = [
    { icon: '🏆', label: 'Copa' },
    { icon: '🥇', label: 'Medalla Oro' },
    { icon: '🥈', label: 'Medalla Plata' },
    { icon: '🥉', label: 'Medalla Bronce' },
    { icon: '⭐', label: 'Estrella' },
    { icon: '🔥', label: 'Racha/Fuego' },
    { icon: '👑', label: 'Liderazgo' },
    { icon: '🎓', label: 'Capacitación' },
    { icon: '🚀', label: 'Proactivo' },
    { icon: '💎', label: 'Valor' },
    { icon: '💡', label: 'Idea/Innovación' },
    { icon: '🤝', label: 'Compañerismo' },
    { icon: '🐧', label: 'Actitud' },
    { icon: '🛡️', label: 'Seguridad' }
];

const STAT_KEYS = ['Liderazgo', 'Comunicación', 'Trabajo en Equipo', 'Resolución', 'Puntualidad'];

const PeopleModule = {
    save: function() { localStorage.setItem('hr_people_v1', JSON.stringify(people)); },

    getSectorName: function(p) {
        if (p.area && p.area.trim() !== "") return p.area;
        const found = (window.sectors || []).find(s => s.id === p.sectorId);
        return found ? found.name : 'Sin sector';
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

function viewPerson(id) {
    const p = people.find(x => x.id === id);
    if (!p) return;

    currentEditingId = id;

    if (!p.stats) p.stats = {};
    if (!p.badges) p.badges = [];
    if (!p.devNotes) p.devNotes = "";

    document.getElementById('detailName').innerHTML = `
        <input type="text" id="mod_name" value="${p.name}" style="font-size:1.2rem; font-weight:bold; width:100%; border:none; border-bottom:1px solid #ccc;">
    `;
    document.getElementById('detailSector').textContent = PeopleModule.getSectorName(p);

    const avatar = document.getElementById('detailAvatar');
    avatar.style.backgroundImage = p.photoData ? `url(${p.photoData})` : 'none';
    avatar.textContent = p.photoData ? '' : (p.name ? p.name.charAt(0) : '');

    document.getElementById('detailPersonal').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div><label style="font-size:0.8em; color:#666">CUIL</label><input class="full-w" id="mod_cuil" value="${p.cuil || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Nacimiento</label><input type="date" class="full-w" id="mod_birthDate" value="${p.birthDate || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Estado Civil</label><input class="full-w" id="mod_maritalStatus" value="${p.maritalStatus || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Domicilio</label><input class="full-w" id="mod_address" value="${p.address || ''}"></div>
            <div style="grid-column: span 2;"><label style="font-size:0.8em; color:#666">Contacto Emergencia</label><input class="full-w" style="width:100%" id="mod_emergencyContact" value="${p.emergencyContact || ''}"></div>
        </div>
    `;

    document.getElementById('detailFamily').innerHTML = `
        <div style="margin-bottom:10px;"><label style="font-size:0.8em; color:#666">Cónyuge</label><input style="width:100%" id="mod_spouseInfo" value="${p.spouseInfo || ''}"></div>
        <div><label style="font-size:0.8em; color:#666">Hijos/Dependientes</label><textarea style="width:100%" rows="2" id="mod_childrenInfo">${p.childrenInfo || ''}</textarea></div>
    `;

    document.getElementById('detailDocs').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
            <div><label style="font-size:0.8em; color:#666">Legajo</label><input style="width:100%" id="mod_legajo" value="${p.legajo || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Categoría</label><input style="width:100%" id="mod_categoria" value="${p.categoria || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Rol</label><input style="width:100%" id="mod_rol" value="${p.rol || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Área</label><input style="width:100%" id="mod_area" value="${p.area || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Coordinador</label><input style="width:100%" id="mod_coordinador" value="${p.coordinador || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Ingreso</label><input type="date" style="width:100%" id="mod_dateIn" value="${p.dateIn || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">CBU</label><input style="width:100%" id="mod_cbu" value="${p.cbu || ''}"></div>
            <div><label style="font-size:0.8em; color:#666">Obra Social</label><input style="width:100%" id="mod_obraSocial" value="${p.obraSocial || ''}"></div>
        </div>
    `;

    // --- NUEVA PESTAÑA DE DESARROLLO ---
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

    // Preparamos las opciones del SELECT usando el Array de arriba
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
                <select id="newBadgeIcon" style="font-size:1.2em; padding:5px; width:70px;">
                    ${iconOptions}
                </select>
                <input type="text" id="newBadgeName" placeholder="Título (ej: Vendedor del mes)" style="flex:1;">
                <button class="btn small" type="button" onclick="addNewBadgeManual()">Agregar</button>
            </div>
        </div>

        <div>
            <label style="font-size:0.8em; font-weight:bold;">Talleres / Notas de Desarrollo</label>
            <textarea id="mod_devNotes" style="width:100%; box-sizing:border-box;" rows="3" placeholder="Anotar cursos, talleres o metas...">${p.devNotes || ''}</textarea>
        </div>
    `;

    document.getElementById('detailModal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    const editBtn = document.getElementById('editFromModal');
    editBtn.textContent = "💾 Guardar Cambios";
    editBtn.onclick = () => { savePersonFromModal(p.id); };

    document.getElementById('deleteFromModal').onclick = () => {
        if(confirm("¿Eliminar registro?")) {
            const old = p;
            people = people.filter(x => x.id !== id);
            PeopleModule.save();
            PeopleModule.renderPeople();
            BacklogService.log('BORRAR','PERSONA', old, null);
            closeDetail();
        }
    };
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
        document.getElementById('newBadgeName').value = ''; // Limpiamos solo el nombre, el icono queda seleccionado
    }
}

window.removeBadge = function(idx) {
    const p = people.find(x => x.id === currentEditingId);
    if(p && p.badges) {
        if(confirm('¿Quitar esta medalla?')) {
            p.badges.splice(idx, 1);
            document.getElementById('activeBadgesArea').innerHTML = renderBadgesHTML(p.badges);
        }
    }
}

function savePersonFromModal(id) {
    const idx = people.findIndex(x => x.id === id);
    if(idx === -1) return;

    const oldData = JSON.parse(JSON.stringify(people[idx]));
    const p = people[idx];

    p.name = document.getElementById('mod_name').value;
    p.cuil = document.getElementById('mod_cuil').value;
    p.birthDate = document.getElementById('mod_birthDate').value;
    p.maritalStatus = document.getElementById('mod_maritalStatus').value;
    p.address = document.getElementById('mod_address').value;
    p.emergencyContact = document.getElementById('mod_emergencyContact').value;
    
    p.spouseInfo = document.getElementById('mod_spouseInfo').value;
    p.childrenInfo = document.getElementById('mod_childrenInfo').value;

    p.legajo = document.getElementById('mod_legajo').value;
    p.categoria = document.getElementById('mod_categoria').value;
    p.rol = document.getElementById('mod_rol').value;
    p.area = document.getElementById('mod_area').value;
    p.coordinador = document.getElementById('mod_coordinador').value;
    p.dateIn = document.getElementById('mod_dateIn').value;
    p.cbu = document.getElementById('mod_cbu').value;
    p.obraSocial = document.getElementById('mod_obraSocial').value;

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
}

function fillForm(p) {
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
}

function initPeopleUI() {
    const form = document.getElementById('personForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
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
            personJerId: document.getElementById('personJerId').value,
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

    document.getElementById('modalClose')?.addEventListener('click', closeDetail);
    document.getElementById('closeModalBottom')?.addEventListener('click', closeDetail);
    document.getElementById('searchInput')?.addEventListener('input', () => PeopleModule.renderPeople());
    document.getElementById('btnClear')?.addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterSector').value = '';
        PeopleModule.renderPeople();
    });
    document.getElementById('btnReset')?.addEventListener('click', () => {
        form.reset();
        document.getElementById('personId').value = '';
    });

    PeopleModule.renderPeople();
}

function closeDetail() { 
    document.getElementById('detailModal').classList.add('hidden'); 
    document.body.classList.remove('modal-open'); 
    currentEditingId = null;
}

document.addEventListener('DOMContentLoaded', initPeopleUI);
window.viewPerson = viewPerson;