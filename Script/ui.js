// Manejo de Secciones (Dashboard, Personas, etc)
document.querySelectorAll('.nav-item[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = link.getAttribute('data-section');
        // Toggle active nav item
        document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
        link.classList.add('active');
        // Show target section
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(target).classList.remove('hidden');
        // small UX: scroll to top of content
        document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// On load: ensure there is a visible section (prefer dashboard)
window.addEventListener('DOMContentLoaded', () => {
    const active = document.querySelector('.nav-item.active[data-section]');
    if (active) {
        const target = active.getAttribute('data-section');
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(target)?.classList.remove('hidden');
    } else {
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById('section-dashboard')?.classList.remove('hidden');
        // set nav active
        document.querySelectorAll('.nav-item[data-section]').forEach(n => n.classList.remove('active'));
        document.querySelector('.nav-item[data-section="section-dashboard"]')?.classList.add('active');
    }
});

/*/ Render de Actividad (Dashboard)
function renderRecentActivity() {
    const el = document.getElementById('recentList');
    const logs = BacklogService.getHistory();
    if (!el) return;
    
    el.innerHTML = logs.slice(0, 5).map(log => `
        <div class="log-item">
            <strong>${log.action}</strong> (${log.entity}) - ${log.details.name}
            <div class="muted small">${log.user} • ${new Date(log.timestamp).toLocaleString()}</div>
        </div>
    `).join('');
}
*/
// Stats updater
function updateStats(){
    const ppl = (JSON.parse(localStorage.getItem('hr_people_v1')||'[]')).length || 0;
    const secs = (JSON.parse(localStorage.getItem('hr_sectors_v1')||'[]')).length || 0;
    const wks = (JSON.parse(localStorage.getItem('hr_workshops_v1')||'[]')).length || 0;
    document.getElementById('statPeople') && (document.getElementById('statPeople').textContent = ppl);
    document.getElementById('statSectors') && (document.getElementById('statSectors').textContent = secs);
    document.getElementById('statWorkshops') && (document.getElementById('statWorkshops').textContent = wks);
}

// Auto update recent activity and stats on load
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{ renderRecentActivity(); updateStats(); });
else { renderRecentActivity(); updateStats(); }

document.addEventListener('DOMContentLoaded', () => {
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');

    if (btnToggle && sidebar) {
        btnToggle.addEventListener('click', () => {
            // Alterna la clase 'collapsed' en la sidebar
            sidebar.classList.toggle('collapsed');
            
            // Opcional: Guardar la preferencia en localStorage 
            // para que si refresca la página se mantenga como estaba
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_state', isCollapsed ? 'hidden' : 'visible');
        });
    }

    // Al cargar la página, recuperar el estado anterior
    if (localStorage.getItem('sidebar_state') === 'hidden') {
        sidebar.classList.add('collapsed');
    }
});