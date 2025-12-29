const LS_BACKLOG = 'hr_backlog_v1';

const BacklogService = {
    log: function(action, entity, oldData = null, newData = null) {
        // 1. Obtener historial existente
        const logs = JSON.parse(localStorage.getItem(LS_BACKLOG) || '[]');
        
        // 2. Crear nueva entrada
        const entry = {
            id: 'log-' + Date.now(),
            timestamp: new Date().toISOString(),
            user: JSON.parse(localStorage.getItem('hr_current_user'))?.user || 'Sistema',
            action, 
            entity,
            // Guardamos detalle estructurado
            details: { 
                name: newData?.name || newData?.nombre || oldData?.name || oldData?.nombre || 'N/A', 
                old: oldData, 
                new: newData 
            }
        };

        // 3. Agregar al inicio del array
        logs.unshift(entry);
        
        // 4. GUARDAR SIN LÍMITES (Base de datos completa)
        localStorage.setItem(LS_BACKLOG, JSON.stringify(logs));

        // 5. Actualizar interfaz si existe la función
        if (typeof renderRecentActivity === 'function') renderRecentActivity();
        if (typeof updateStats === 'function') updateStats();
    },

    getHistory: () => JSON.parse(localStorage.getItem(LS_BACKLOG) || '[]')
};

// --- FUNCIÓN DE VISUALIZACIÓN ---
// Esta función lee la base de datos completa y la muestra en el div con scroll
function renderRecentActivity() {
    const listContainer = document.getElementById('recentList');
    if (!listContainer) return;

    const logs = BacklogService.getHistory();
    
    if (logs.length === 0) {
        listContainer.innerHTML = '<div style="padding:15px; text-align:center; color:#999;">No hay actividad registrada.</div>';
        return;
    }

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

        // Manejo seguro del nombre (por si details es un string viejo o un objeto nuevo)
        const detalleNombre = typeof log.details === 'object' ? log.details.name : log.details;

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
