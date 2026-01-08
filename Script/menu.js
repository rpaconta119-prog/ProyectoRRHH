// ==========================================
// MÓDULO DE MENÚ LATERAL (DINÁMICO + NAVEGACIÓN)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("sidebar-container");

    if (container) {
        // 1. Inyectamos el HTML del sidebar
        container.innerHTML = `
        <aside class="sidebar" id="sidebar">
            <button id="btn-close-sidebar" class="close-btn-mobile">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <div class="user-panel">
                <div class="avatar" id="sideAvatar">U</div>
                <div>
                    <div class="name" id="sideName">Cargando...</div>
                    <div class="role" id="sideRole">...</div>
                </div>
            </div>
            
            <nav class="nav">
                <h3 class="nav-title">Principal</h3>
                
                <a href="Personal.html" class="nav-item" title="Personas">
                    <i class="fa-solid fa-users nav-icon"></i> 
                    <span>Personas</span>
                </a>
                
                <a href="index.html#sectores" class="nav-item" title="Sectores" data-target="section-sectors">
                    <i class="fa-solid fa-building nav-icon"></i>
                    <span>Sectores</span>
                </a>
                
                <a href="Talleres.html" class="nav-item" title="Talleres">
                    <i class="fa-solid fa-chalkboard-user nav-icon"></i>
                    <span>Talleres</span>
                </a>
                
                <a href="Organigrama.html" class="nav-item" title="Organigrama">
                    <i class="fa-solid fa-sitemap nav-icon"></i>
                    <span>Organigrama</span>
                </a>

                <h3 class="nav-title">Gestión</h3>

                <a href="Entrevistas.html" class="nav-item" title="Entrevistas">
                    <i class="fa-solid fa-clipboard-user nav-icon"></i>
                    <span>Entrevistas</span>
                </a>
                
                <a href="Documentacion.html" class="nav-item" title="Documentación">
                    <i class="fa-solid fa-folder-open nav-icon"></i>
                    <span>Documentación</span>
                </a>
                
                <a href="Actas.html" class="nav-item" title="Actas Administrativas">
                    <i class="fa-solid fa-file-signature nav-icon"></i>
                    <span>Actas Administrativas</span>
                </a>
                
                <a href="Calendario de Licencias.html" class="nav-item" title="Calendario">
                    <i class="fa-solid fa-calendar-days nav-icon"></i>
                    <span>Calendario de Licencias</span>
                </a>

                <a href="Proyectos.html" class="nav-item" id="nav-proyectos" title="Proyectos" style="display: none;">
                    <i class="fa-solid fa-project-diagram nav-icon"></i>
                    <span>Proyectos</span>
                </a>

                <a href="Gestor de Cuentas.html" class="nav-item" id="nav-gestor" title="Gestor de Cuentas" style="display: none;">
                    <i class="fa-solid fa-user-gear nav-icon"></i>
                    <span>Gestor de Cuentas</span>
                </a>
            </nav>
        </aside>
        `;

        // 2. Actualizar datos de usuario
        actualizarDatosMenu();

        // 3. Resaltar página actual y manejar navegación
        gestionarNavegacion();
    }
});

function actualizarDatosMenu() {
    const LS_CURRENT = 'hr_current_user'; 
    const storedUser = localStorage.getItem(LS_CURRENT);
    
    if (storedUser) {
        try {
            const cur = JSON.parse(storedUser);
            
            const sideName = document.getElementById('sideName');
            const sideRole = document.getElementById('sideRole');
            const sideAvatar = document.getElementById('sideAvatar');
            
            // Botones especiales
            const navGestor = document.getElementById('nav-gestor');
            const navProyectos = document.getElementById('nav-proyectos'); // <--- 1. SELECCIONAMOS EL BOTÓN

            if (sideName) sideName.textContent = cur.name || cur.user || "Usuario";
            
            if (sideRole) {
                const roleDisplay = (cur.role === 'admin') ? 'Administrador' : 'Usuario';
                sideRole.textContent = roleDisplay;
            }

            if (sideAvatar && sideName.textContent) {
                sideAvatar.textContent = sideName.textContent.charAt(0).toUpperCase();
            }

            // Lógica para el Gestor de Cuentas (Solo Admin)
            if (navGestor) {
                navGestor.style.display = (cur.role === 'admin') ? 'flex' : 'none';
            }

            // Lógica para Proyectos (Aquí decides quién lo ve)
            if (navProyectos) {
                // OPCION A: Que lo vean TODOS
                navProyectos.style.display = 'flex'; 

                // OPCION B: Si quieres que solo lo vean los ADMINS, usa esta línea en su lugar:
                // navProyectos.style.display = (cur.role === 'admin') ? 'flex' : 'none';
            }

        } catch (e) {
            console.error("Error menu.js:", e);
        }
    }
}

// ... la función gestionarNavegacion() queda igual que antes ...
function gestionarNavegacion() {
    // 1. Resaltar enlace activo
    const path = window.location.pathname.split("/").pop() || 'index.html';
    const hash = window.location.hash;
    const links = document.querySelectorAll('.nav-item');
    
    links.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        
        if (href === 'index.html#sectores') {
            if (path === 'index.html' && hash === '#sectores') link.classList.add('active');
        } else if (href === path) {
            link.classList.add('active');
        }
    });

    // 2. LÓGICA DE NAVEGACIÓN INTERNA (Solo si estamos en index.html)
    if (path === 'index.html' || path === '') {
        const dash = document.getElementById('section-dashboard');
        const sect = document.getElementById('section-sectors');

        if (dash && sect) {
            if (hash === '#sectores') {
                dash.classList.add('hidden');
                sect.classList.remove('hidden');
                // Forzar recarga de lista si existe el módulo
                if(window.SectorsModule) window.SectorsModule.renderSectors();
            } else {
                dash.classList.remove('hidden');
                sect.classList.add('hidden');
            }
        }
    }

    // Escuchar cambios para actualizar sin recargar
    window.addEventListener('hashchange', gestionarNavegacion);
}