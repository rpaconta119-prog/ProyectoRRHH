// ==========================================
// CONTROLADOR DE UI Y DASHBOARD (UI.JS)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LÓGICA DEL SIDEBAR (MEJORADA PARA MÓVIL Y PC) ---
    const sidebar = document.getElementById('sidebar');
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const btnCloseMobile = document.getElementById('btn-close-sidebar');

    // Recuperar estado guardado (solo para escritorio)
    if (localStorage.getItem('sidebar_state') === 'collapsed' && window.innerWidth > 768) {
        sidebar.classList.add('collapsed');
    }

    if (btnToggle) {
        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (window.innerWidth <= 768) {
                // MÓVIL: Abrir/Cerrar deslizando
                sidebar.classList.toggle('mobile-open');
            } else {
                // ESCRITORIO: Contraer/Expandir
                sidebar.classList.toggle('collapsed');
                // Guardar preferencia
                const isCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('sidebar_state', isCollapsed ? 'collapsed' : 'expanded');
            }
        });
    }

    // Botón X (Solo Móvil)
    if (btnCloseMobile) {
        btnCloseMobile.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
        });
    }

    // Cerrar al hacer clic fuera (Solo Móvil)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('mobile-open') && 
            !sidebar.contains(e.target) && 
            !btnToggle.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });


    // --- 2. NAVEGACIÓN ENTRE SECCIONES (TABS) ---
    const navLinks = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Si estamos en móvil, cerrar el menú al hacer clic en una opción
            if(window.innerWidth <= 768) {
                sidebar.classList.remove('mobile-open');
            }

            const targetId = link.getAttribute('data-section');
            const targetSection = document.getElementById(targetId);

            if(targetSection) {
                e.preventDefault(); // Solo prevenimos si es una navegación interna (SPA)

                // 1. Quitar activo de todos los links
                navLinks.forEach(n => n.classList.remove('active'));
                // 2. Ocultar todas las secciones
                sections.forEach(s => s.classList.add('hidden'));

                // 3. Activar el link clickeado
                link.classList.add('active');
                // 4. Mostrar la sección deseada
                targetSection.classList.remove('hidden');

                // 5. Scroll arriba
                document.querySelector('.content').scrollTo({ top: 0, behavior: 'smooth' });

                // 6. Si volvemos al dashboard, recargar datos
                if(targetId === 'section-dashboard') {
                    updateStats();
                    renderRecentActivity();
                }
            }
        });
    });

    // --- 3. CARGA INICIAL DE DATOS ---
    updateStats();
    renderRecentActivity();
});


// ==========================================
// FUNCIONES DE DATOS (CONECTADAS AL SERVER)
// ==========================================

// A. Render de Actividad Reciente (ASÍNCRONO)
async function renderRecentActivity() {
    const el = document.getElementById('recentList');
    if (!el) return;

    // Verificar si existe el servicio Backlog
    if (typeof BacklogService === 'undefined') {
        el.innerHTML = '<div class="muted small">Error: BacklogService no cargado.</div>';
        return;
    }

    try {
        el.innerHTML = '<div class="muted small">Cargando...</div>';
        
        // AWAIT: Espera real al servidor
        const logs = await BacklogService.getHistory();
        
        if (!logs || logs.length === 0) {
            el.innerHTML = '<div class="muted small" style="text-align:center; padding:10px;">Sin actividad reciente.</div>';
            return;
        }

        // Renderizado del HTML de los logs
        el.innerHTML = logs.slice(0, 10).map(log => { // Muestro los ultimos 10
            const detalle = log.details || {};
            // Intenta obtener un nombre legible, si no usa "Detalle"
            const nombreDetalle = (typeof detalle === 'object') ? (detalle.nombre || detalle.name || log.entity) : detalle;
            
            // Formatear fecha bonita
            const fechaObj = new Date(log.timestamp);
            const fechaStr = fechaObj.toLocaleDateString() + ' ' + fechaObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            // Colores según acción (Opcional, para que se vea pro)
            let badgeColor = '#cbd5e0'; // Gris default
            let badgeText = 'INFO';
            if(log.action === 'CREAR') { badgeColor = '#c6f6d5'; badgeText = 'NUEVO'; } // Verde
            if(log.action === 'BORRAR') { badgeColor = '#fed7d7'; badgeText = 'BAJA'; } // Rojo
            if(log.action === 'EDITAR') { badgeColor = '#bee3f8'; badgeText = 'MOD'; }  // Azul

            return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #edf2f7;">
                <div>
                    <span style="background:${badgeColor}; font-size:0.7rem; padding:2px 6px; border-radius:4px; font-weight:bold; margin-right:5px; color:#2d3748;">
                        ${log.action || badgeText}
                    </span>
                    <span style="font-weight:500; color:#2d3748;">${log.entity}: ${nombreDetalle}</span>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.75rem; color:#718096;">${log.user}</div>
                    <div style="font-size:0.7rem; color:#a0aec0;">${fechaStr}</div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error cargando actividad:", error);
        el.innerHTML = '<div class="muted small" style="color:red;">Error de conexión.</div>';
    }
}

// B. Actualizador de Estadísticas (ASÍNCRONO PARALELO)
async function updateStats(){
    const elPeople = document.getElementById('statPeople');
    const elSectors = document.getElementById('statSectors');
    const elWorkshops = document.getElementById('statWorkshops');

    if (!elPeople && !elSectors && !elWorkshops) return;

    try {
        // Carga paralela para mayor velocidad
        const [people, sectors, workshops] = await Promise.all([
            API.cargar('people').catch(() => []),    // Si falla uno, retorna array vacío para no romper todo
            API.cargar('sectors').catch(() => []),
            API.cargar('workshops').catch(() => [])
        ]);

        if(elPeople) elPeople.textContent = people.length || 0;
        if(elSectors) elSectors.textContent = sectors.length || 0;
        if(elWorkshops) elWorkshops.textContent = workshops.length || 0;

    } catch (error) {
        console.error("Error actualizando estadísticas:", error);
    }
}