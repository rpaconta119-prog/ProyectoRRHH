// ==========================================
// Script/licencias.js
// Gestión de Vacaciones, Licencias y Calendario Visual
// ==========================================

let allPeople = [];
let allLeaves = [];
let currentEditingLeaveId = null;
let calendarInstance = null; // Variable para el calendario

// Configuración de Vacaciones según ley
function getVacationLimit(dateInString) {
    if (!dateInString) return 14; 
    const entryDate = new Date(dateInString);
    const today = new Date();
    let years = today.getFullYear() - entryDate.getFullYear();
    const m = today.getMonth() - entryDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < entryDate.getDate())) years--;

    if (years < 5) return 14;
    if (years < 10) return 21;
    if (years < 20) return 28;
    return 35;
}

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("📅 Iniciando módulo de licencias...");
    
    // Cargar datos
    allPeople = await API.cargar('people');
    allLeaves = await API.cargar('leaves') || [];

    // Inicializar UI
    renderEmployeeSelect();
    renderLeavesList();
    initCalendar(); // <--- INICIAMOS EL CALENDARIO AQUÍ

    // Event Listeners
    document.getElementById('employeeSelect').addEventListener('change', updateBalanceCard);
    document.getElementById('dateStart').addEventListener('change', calculateDaysPreview);
    document.getElementById('dateEnd').addEventListener('change', calculateDaysPreview);
    document.getElementById('leaveForm').addEventListener('submit', handleLeaveSubmit);
    
    // Filtros
    document.getElementById('searchLeave').addEventListener('input', renderLeavesList);
    document.getElementById('filterType').addEventListener('change', renderLeavesList);
});

// ==========================================
// 2. LÓGICA DEL CALENDARIO (FullCalendar)
// ==========================================
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es', // Idioma español
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        buttonText: {
            today: 'Hoy',
            month: 'Mes',
            list: 'Lista'
        },
        events: getCalendarEvents(), // Carga los eventos
        eventClick: function(info) {
            // Al hacer clic en la barra del calendario, edita esa licencia
            editLeave(info.event.id);
        }
    });

    calendarInstance.render();
}

function getCalendarEvents() {
    return allLeaves.map(l => {
        // Colores según tipo
        let color = '#3788d8'; // Azul (Vacaciones)
        if (l.type === 'Enfermedad') color = '#dc3545'; // Rojo
        if (l.type === 'Estudio') color = '#6f42c1'; // Violeta
        if (l.type === 'Personal') color = '#fd7e14'; // Naranja

        // AJUSTE DE FECHA: FullCalendar no incluye el día final visualmente
        // así que le sumamos 1 día para que el dibujo sea exacto.
        let endObj = new Date(l.endDate);
        endObj.setDate(endObj.getDate() + 1);
        
        return {
            id: l.id,
            title: `${l.personName} (${l.type})`,
            start: l.startDate,
            end: endObj.toISOString().split('T')[0], // Formato YYYY-MM-DD
            backgroundColor: color,
            allDay: true
        };
    });
}

function refreshCalendar() {
    if (calendarInstance) {
        calendarInstance.removeAllEvents();
        calendarInstance.addEventSource(getCalendarEvents());
    }
}

// ==========================================
// 3. LÓGICA DE UI
// ==========================================

function renderEmployeeSelect() {
    const select = document.getElementById('employeeSelect');
    select.innerHTML = '<option value="">Seleccione un empleado...</option>';
    allPeople.sort((a, b) => a.name.localeCompare(b.name));
    allPeople.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

function updateBalanceCard() {
    const personId = document.getElementById('employeeSelect').value;
    const card = document.getElementById('vacationBalanceCard');
    
    if (!personId) { card.style.display = 'none'; return; }

    const person = allPeople.find(p => p.id === personId);
    if (!person) return;

    const limit = getVacationLimit(person.dateIn);
    const dateIn = new Date(person.dateIn);
    const yearIn = dateIn.getFullYear();
    const tenureText = isNaN(yearIn) ? "Sin fecha de ingreso" : `Ingreso: ${yearIn} (Límite: ${limit} días)`;

    const currentYear = new Date().getFullYear();
    const used = allLeaves
        .filter(l => l.personId === personId && l.type === 'Vacaciones' && l.id !== currentEditingLeaveId)
        .reduce((sum, l) => {
            const lYear = new Date(l.startDate).getFullYear();
            return lYear === currentYear ? sum + parseInt(l.days) : sum;
        }, 0);

    document.getElementById('txtTenure').textContent = tenureText;
    document.getElementById('daysUsed').textContent = used;
    document.getElementById('daysTotal').textContent = limit;

    const percentage = Math.min((used / limit) * 100, 100);
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${percentage}%`;
    
    if (used >= limit) {
        progressBar.style.backgroundColor = '#ef4444';
        document.getElementById('msgBalance').style.display = 'block';
    } else {
        progressBar.style.backgroundColor = '#0ea5e9';
        document.getElementById('msgBalance').style.display = 'none';
    }
    card.style.display = 'block';
}

function calculateDaysPreview() {
    const start = document.getElementById('dateStart').value;
    const end = document.getElementById('dateEnd').value;
    const counter = document.getElementById('daysCount');
    if (start && end) {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        counter.textContent = diffDays > 0 ? diffDays : 0;
    } else {
        counter.textContent = 0;
    }
}

// ==========================================
// 4. LÓGICA DE GUARDADO (CRUD)
// ==========================================

async function handleLeaveSubmit(e) {
    e.preventDefault();

    const personId = document.getElementById('employeeSelect').value;
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('dateStart').value;
    const end = document.getElementById('dateEnd').value;
    const reason = document.getElementById('leaveReason').value;

    if (new Date(end) < new Date(start)) return alert("La fecha de fin no puede ser anterior a la de inicio.");

    const d1 = new Date(start);
    const d2 = new Date(end);
    const daysRequested = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;

    if (type === 'Vacaciones') {
        const person = allPeople.find(p => p.id === personId);
        const limit = getVacationLimit(person.dateIn);
        const currentYear = new Date().getFullYear();
        const used = allLeaves
            .filter(l => l.personId === personId && l.type === 'Vacaciones' && l.id !== currentEditingLeaveId)
            .reduce((sum, l) => {
                const lYear = new Date(l.startDate).getFullYear();
                return lYear === currentYear ? sum + parseInt(l.days) : sum;
            }, 0);

        if ((used + daysRequested) > limit) {
            return alert(`⛔ ERROR: Estás solicitando ${daysRequested} días, pero al empleado solo le quedan ${limit - used} días disponibles.`);
        }
    }

    if (type !== 'Vacaciones' && (!reason || reason.trim() === "")) {
        return alert("⚠️ Para licencias especiales, la justificación es obligatoria.");
    }

    const leaveData = {
        id: currentEditingLeaveId || 'l-' + Date.now(),
        personId,
        personName: allPeople.find(p => p.id === personId).name,
        type,
        startDate: start,
        endDate: end,
        days: daysRequested,
        reason,
        status: 'Aprobado'
    };

    if (currentEditingLeaveId) {
        const index = allLeaves.findIndex(l => l.id === currentEditingLeaveId);
        if (index !== -1) {
            const oldData = JSON.parse(JSON.stringify(allLeaves[index]));
            allLeaves[index] = leaveData;
            if(typeof BacklogService !== 'undefined') BacklogService.log('EDITAR', 'LICENCIA', oldData, leaveData);
            alert("✅ Solicitud actualizada correctamente.");
        }
    } else {
        allLeaves.unshift(leaveData);
        if(typeof BacklogService !== 'undefined') BacklogService.log('CREAR', 'LICENCIA', null, leaveData);
        alert("✅ Solicitud registrada correctamente.");
    }

    try {
        await API.guardar('leaves', allLeaves);
        resetForm();
        renderLeavesList();
        refreshCalendar(); // <--- ACTUALIZAMOS EL CALENDARIO
    } catch (error) {
        console.error(error);
        alert("Error al guardar en servidor.");
    }
}

// ==========================================
// 5. FUNCIONES GLOBALES
// ==========================================

window.editLeave = function(id) {
    const leave = allLeaves.find(l => l.id === id);
    if (!leave) return;

    document.getElementById('employeeSelect').value = leave.personId;
    document.getElementById('leaveType').value = leave.type;
    document.getElementById('dateStart').value = leave.startDate;
    document.getElementById('dateEnd').value = leave.endDate;
    document.getElementById('leaveReason').value = leave.reason || '';

    currentEditingLeaveId = id;
    
    updateBalanceCard();
    calculateDaysPreview();
    
    const btnSubmit = document.querySelector('#leaveForm button[type="submit"]');
    btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
    btnSubmit.classList.remove('primary');
    btnSubmit.style.backgroundColor = '#f59e0b';

    let btnCancel = document.getElementById('btnCancelEdit');
    if (!btnCancel) {
        btnCancel = document.createElement('button');
        btnCancel.id = 'btnCancelEdit';
        btnCancel.type = 'button';
        btnCancel.className = 'btn';
        btnCancel.style.marginTop = '10px';
        btnCancel.innerHTML = 'Cancelar Edición';
        btnCancel.onclick = resetForm;
        document.getElementById('leaveForm').appendChild(btnCancel);
    }
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.deleteLeave = async function(id) {
    if (!confirm("¿Estás seguro de eliminar esta solicitud?")) return;
    const leaveToDelete = allLeaves.find(l => l.id === id);
    if (!leaveToDelete) return;

    allLeaves = allLeaves.filter(l => l.id !== id);
    if(typeof BacklogService !== 'undefined') BacklogService.log('BORRAR', 'LICENCIA', leaveToDelete, null);

    try {
        await API.guardar('leaves', allLeaves);
        if (currentEditingLeaveId === id) resetForm();
        renderLeavesList();
        updateBalanceCard(); 
        refreshCalendar(); // <--- ACTUALIZAMOS EL CALENDARIO
    } catch (e) {
        alert("Error al borrar.");
    }
};

function resetForm() {
    document.getElementById('leaveForm').reset();
    currentEditingLeaveId = null;
    document.getElementById('vacationBalanceCard').style.display = 'none';
    document.getElementById('daysCount').textContent = '0';
    
    const btnSubmit = document.querySelector('#leaveForm button[type="submit"]');
    btnSubmit.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar Solicitud';
    btnSubmit.classList.add('primary');
    btnSubmit.style.backgroundColor = '';

    const btnCancel = document.getElementById('btnCancelEdit');
    if (btnCancel) btnCancel.remove();
}

function renderLeavesList() {
    const container = document.getElementById('leavesContainer');
    const search = document.getElementById('searchLeave').value.toLowerCase();
    const typeFilter = document.getElementById('filterType').value;
    container.innerHTML = '';
    const filtered = allLeaves.filter(l => {
        const matchName = l.personName.toLowerCase().includes(search);
        const matchType = typeFilter ? l.type === typeFilter : true;
        return matchName && matchType;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="muted" style="text-align:center;">No hay registros.</div>';
        return;
    }

    filtered.forEach(l => {
        let borderLeftColor = '#3788d8';
        let icon = '📝';
        if (l.type === 'Vacaciones') { borderLeftColor = '#3788d8'; icon = '🏖️'; }
        if (l.type === 'Enfermedad') { borderLeftColor = '#dc3545'; icon = '💊'; }
        if (l.type === 'Estudio') { borderLeftColor = '#6f42c1'; icon = '🎓'; }

        // Función auxiliar rápida para formatear YYYY-MM-DD a DD/MM/YYYY
        const formatDateStr = (dateString) => {
            if (!dateString) return '-';
            const [year, month, day] = dateString.split('-'); // Separa por guión
            return `${day}/${month}/${year}`; // Reordena a día/mes/año
        };

        const fStart = formatDateStr(l.startDate);
        const fEnd = formatDateStr(l.endDate);
        const card = document.createElement('div');
        card.className = 'leave-card';
        card.style = `
            background: white; border: 1px solid #eee; border-left: 4px solid ${borderLeftColor}; 
            padding: 10px; margin-bottom: 10px; border-radius: 4px; position: relative;
        `;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <strong>${l.personName}</strong>
                    <span style="font-size:0.8em; background:#f3f4f6; padding:2px 6px; border-radius:4px; margin-left:5px;">${icon} ${l.type}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn small" onclick="editLeave('${l.id}')" title="Editar" style="padding:2px 6px;"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn small danger" onclick="deleteLeave('${l.id}')" title="Borrar" style="padding:2px 6px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div style="font-size:0.9em; color:#555; margin-top:5px;">Del ${fStart} al ${fEnd} (${l.days} días)</div>
            ${l.reason ? `<div style="font-size:0.85em; color:#777; margin-top:4px; font-style:italic;">"${l.reason}"</div>` : ''}
        `;
        container.appendChild(card);
    });
}