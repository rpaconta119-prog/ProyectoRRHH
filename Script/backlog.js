// ==========================================
// SERVICIO DE HISTORIAL (BACKLOG) - VERSIÓN SERVIDOR
// ==========================================

const BacklogService = {
    // Función para registrar cambios (Ahora es ASYNC)
    log: async function(action, entity, oldData = null, newData = null) {
        console.log("📝 Registrando actividad en servidor...");

        try {
            // 1. Obtener historial existente del SERVIDOR
            let logs = await API.cargar('backlog');
            
            // Validación de seguridad por si el archivo está vacío
            if (!Array.isArray(logs)) logs = [];
            
            // 2. Obtener usuario actual (La sesión sigue estando en el navegador)
            const currentUser = JSON.parse(localStorage.getItem('hr_current_user') || '{}');

            // 3. Crear nueva entrada
            const entry = {
                id: 'log-' + Date.now(),
                timestamp: new Date().toISOString(),
                user: currentUser.user || 'Sistema',
                action: action, 
                entity: entity,
                // Guardamos detalle estructurado
                details: { 
                    name: newData?.name || newData?.nombre || oldData?.name || oldData?.nombre || 'N/A', 
                    old: oldData, 
                    new: newData 
                }
            };

            // 4. Agregar al inicio del array
            logs.unshift(entry);
            
            // 5. GUARDAR EN EL SERVIDOR
            await API.guardar('backlog', logs);

            // 6. Actualizar interfaz si corresponde
            if (typeof renderRecentActivity === 'function') renderRecentActivity();
            if (typeof updateStats === 'function') updateStats(); // Si tienes un dashboard con stats

        } catch (error) {
            console.error("❌ Error al registrar log:", error);
        }
    },

    // Función para leer historial (Ahora es ASYNC)
    getHistory: async () => {
        const data = await API.cargar('backlog');
        return Array.isArray(data) ? data : [];
    }
};

// --- FUNCIÓN DE VISUALIZACIÓN ---
async function renderRecentActivity() {
    const listContainer = document.getElementById('recentList');
    if (!listContainer) return; // Si no estamos en la página correcta, salir.

    // Mostramos un "Cargando..." sutil
    listContainer.innerHTML = '<div style="padding:10px; text-align:center; color:#999;">Cargando actividad...</div>';

    // Pedimos los datos al servidor
    const logs = await BacklogService.getHistory();
    
    if (logs.length === 0) {
        listContainer.innerHTML = '<div style="padding:15px; text-align:center; color:#999;">No hay actividad registrada.</div>';
        return;
    }

    // Renderizamos la lista (El HTML es idéntico al que tenías)
    listContainer.innerHTML = logs.map(log => {
        const dateObj = new Date(log.timestamp);
        const fecha = dateObj.toLocaleDateString();
        const hora = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Definir colores según la acción
        let colorStyle = '#666';
        let bgStyle = '#f3f4f6';
        
        if(log.action === 'CREAR') { colorStyle = '#059669'; bgStyle = '#d1fae5'; } // Verde
        if(log.action === 'BORRAR') { colorStyle = '#dc2626'; bgStyle = '#fee2e2'; } // Rojo
        if(log.action === 'EDITAR') { colorStyle = '#2563eb'; bgStyle = '#dbeafe'; } // Azul

        // Manejo seguro del nombre
        const detalle = log.details || {};
        const detalleNombre = (typeof detalle === 'object') ? (detalle.name || 'N/A') : detalle;

        return `
        <div style="border-bottom: 1px solid #f0f0f0; padding: 10px 5px; font-size: 0.9em; display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; justify-content:space-between; color:#888; font-size:0.85em;">
                <span>${fecha} - ${hora}</span>
                <span style="font-weight:600; color:#444;">${log.user}</span>
            </div>
            <div style="display:flex; align-items:center; gap: 8px;">
                <span style="background:${bgStyle}; color:${colorStyle}; padding: 2px 8px; border-radius: 4px; font-weight:bold; font-size:0.8em;">
                    ${log.action}
                </span>
                <span style="font-weight:600; color:#333;">${log.entity}:</span>
                <span style="color:#555;">${detalleNombre}</span>
            </div>
        </div>
        `;
    }).join('');
}

// Inicializar al cargar la página (si existe el contenedor)
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('recentList')) {
        renderRecentActivity();
    }
});