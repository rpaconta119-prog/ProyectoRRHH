// Script/gestor.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar seguridad: Solo un admin o usuario logueado debería ver esto
    // (Puedes agregar lógica extra aquí para patear al usuario si no es admin)
    
    await cargarTablaUsuarios();
});
// Script/gestor.js

async function cargarTablaUsuarios() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6">Cargando datos...</td></tr>'; // Nota: colspan 6 ahora

    try {
        const users = await API.cargar('users'); 
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hay usuarios registrados.</td></tr>';
            return;
        }

        users.forEach((u, index) => {
            const tr = document.createElement('tr');
            const isValidated = u.validated === true;
            const role = u.role || 'user';

            // AQUÍ AGREGAMOS LA CONTRASEÑA
            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.user}</td>
                <td style="font-family: monospace; color: #555;">${u.pass}</td> <td><span class="${role === 'admin' ? 'role-admin' : ''}">${role.toUpperCase()}</span></td>
                <td>
                    ${isValidated 
                        ? '<span class="status-ok">HABILITADO</span>' 
                        : '<span class="status-pending">PENDIENTE</span>'}
                </td>
                <td>
                    ${renderButtons(index, isValidated, role)}
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" style="color:red">Error al conectar con el servidor.</td></tr>';
    }
}




function renderButtons(index, isValidated, role) {
    // No permitimos borrar ni bloquear al admin principal (protección simple)
    if (role === 'admin') return '<span style="color:#999">Protegido</span>';

    let html = '';

    // Botón Validar / Revocar
    if (!isValidated) {
        html += `<button class="btn-action btn-approve" onclick="cambiarEstado(${index}, true)">Aprobar</button>`;
    } else {
        html += `<button class="btn-action btn-revoke" onclick="cambiarEstado(${index}, false)">Bloquear</button>`;
    }

    // Botón Eliminar
    html += `<button class="btn-action btn-delete" onclick="eliminarUsuario(${index})">Eliminar</button>`;

    return html;
}

// Función para Aprobar o Bloquear
window.cambiarEstado = async (index, nuevoEstado) => {
    try {
        const users = await API.cargar('users');
        
        // Modificamos el estado
        users[index].validated = nuevoEstado;

        // Guardamos en servidor
        await API.guardar('users', users);
        
        // Recargamos la tabla
        await cargarTablaUsuarios();
        alert(nuevoEstado ? 'Usuario aprobado.' : 'Usuario bloqueado.');
    } catch (e) {
        alert('Error al guardar cambios');
    }
};

// Función para Eliminar usuario permanentemente
window.eliminarUsuario = async (index) => {
    if(!confirm('¿Estás seguro de eliminar este usuario? No podrá recuperar sus datos.')) return;

    try {
        const users = await API.cargar('users');
        
        // Borramos del array
        users.splice(index, 1);

        // Guardamos
        await API.guardar('users', users);
        
        await cargarTablaUsuarios();
    } catch (e) {
        alert('Error al eliminar');
    }
};

// Logout (reutilizando lógica básica)
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('hr_current_user'); // Asegúrate que coincida con tu LS_CURRENT
    window.location.href = 'login.html';
});