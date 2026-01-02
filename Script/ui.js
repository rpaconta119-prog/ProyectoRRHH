// ==========================================
// CONTROLADOR DE UI Y DASHBOARD (CONECTADO AL SERVIDOR)
// ==========================================

// 1. Manejo de Secciones (Navegación entre pestañas)
// --------------------------------------------------
document.querySelectorAll('.nav-item[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = link.getAttribute('data-section');
        
        // Cambiar clase activa en menú
        document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
        link.classList.add('active');
        
        // Mostrar sección correspondiente
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
        
        // Scroll arriba suave
        document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });

        // Si volvemos al dashboard, actualizamos los datos
        if(target === 'section-dashboard') {
            updateStats();
            renderRecentActivity();
        }
    });
});

// Inicialización de Pestañas al Cargar
window.addEventListener('DOMContentLoaded', () => {
    const active = document.querySelector('.nav-item.active[data-section]');
    if (active) {
        const target = active.getAttribute('data-section');
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(target)?.classList.remove('hidden');
    } else {
        // Por defecto Dashboard
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById('section-dashboard')?.classList.remove('hidden');
        document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-section="section-dashboard"]')?.classList.add('active');
    }
});


// 2. Render de Actividad (Dashboard) - AHORA ASÍNCRONO
// ----------------------------------------------------
/*async function renderRecentActivity() {
    const el = document.getElementById('recentList');
    if (!el) return;

    // AWAIT: Esperamos a que el servicio traiga los datos del servidor
    // Nota: Asegúrate de tener cargado backlog.js antes de este script
    if (typeof BacklogService === 'undefined') return;

    const logs = await BacklogService.getHistory();
    
    if (logs.length === 0) {
        el.innerHTML = '<div class="muted small" style="text-align:center; padding:10px;">Sin actividad reciente.</div>';
        return;
    }

    el.innerHTML = logs.slice(0, 5).map(log => {
        // Manejo seguro de los detalles (por si es objeto o string)
        const detalle = log.details || {};
        const nombreDetalle = (typeof detalle === 'object') ? (detalle.name || 'N/A') : detalle;
        const fecha = new Date(log.timestamp).toLocaleString();

        return `
        <div class="log-item" style="border-bottom:1px solid #eee; padding:5px 0; margin-bottom:5px;">
            <div style="font-size:0.95em;">
                <strong>${log.action}</strong> 
                <span style="color:#666;">(${log.entity})</span> - 
                <span>${nombreDetalle}</span>
            </div>
            <div class="muted small" style="font-size:0.8em; color:#888;">
                ${log.user} • ${fecha}
            </div>
        </div>
        `;
    }).join('');
}
*/

// 3. Actualizador de Estadísticas - AHORA ASÍNCRONO Y PARALELO
// ------------------------------------------------------------
async function updateStats(){
    // Verificamos si los elementos existen en el HTML antes de llamar a la API
    const elPeople = document.getElementById('statPeople');
    const elSectors = document.getElementById('statSectors');
    const elWorkshops = document.getElementById('statWorkshops');

    if (!elPeople && !elSectors && !elWorkshops) return;

    try {
        // TRUCO DE VELOCIDAD: Pedimos las 3 listas al mismo tiempo (en paralelo)
        // en lugar de esperar una por una.
        const [people, sectors, workshops] = await Promise.all([
            API.cargar('people'),
            API.cargar('sectors'),
            API.cargar('workshops')
        ]);

        // Actualizamos el DOM
        if(elPeople) elPeople.textContent = people.length || 0;
        if(elSectors) elSectors.textContent = sectors.length || 0;
        if(elWorkshops) elWorkshops.textContent = workshops.length || 0;

    } catch (error) {
        console.error("Error actualizando estadísticas:", error);
    }
}


// 4. Inicialización Global y Sidebar
// ----------------------------------

// Cargar datos al inicio
document.addEventListener('DOMContentLoaded', () => {
    renderRecentActivity(); 
    updateStats();
});

// Lógica del Sidebar (Esto se mantiene local porque es preferencia de UI)
document.addEventListener('DOMContentLoaded', () => {
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');

    if (btnToggle && sidebar) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_state', isCollapsed ? 'hidden' : 'visible');
        });
    }

    if (localStorage.getItem('sidebar_state') === 'hidden') {
        sidebar.classList.add('collapsed');
    }
});