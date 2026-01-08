document.addEventListener('DOMContentLoaded', async () => {
    // Aquí podrías verificar si el usuario logueado es admin antes de cargar
    await cargarTablaUsuarios();
});

// --- FUNCIÓN PRINCIPAL DE CARGA ---
async function cargarTablaUsuarios() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Cargando datos...</td></tr>';

    try {
        const users = await API.cargar('users'); 
        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay usuarios registrados.</td></tr>';
            return;
        }

        users.forEach((u, index) => {
            const tr = document.createElement('tr');
            const isValidated = u.validated === true;
            const role = u.role || 'user';

            // Renderizamos la fila
            tr.innerHTML = `
                <td>${u.name}</td>
                <td>${u.user}</td>
                <td style="font-family: monospace; color: #555;">${u.pass}</td> 
                <td><span class="${role === 'admin' ? 'role-admin' : ''}">${role.toUpperCase()}</span></td>
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
        tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center">Error al conectar con la base de datos.</td></tr>';
    }
}

// --- RENDERIZADO DE BOTONES ---
function renderButtons(index, isValidated, role) {
    // Si es admin, mostramos texto de protegido (opcional, para no borrar al jefe por error)
    if (role === 'admin') {
         // Igual permitimos editar al admin, pero con cuidado. 
         // Si quieres bloquear todo al admin, retorna solo el span.
         return `<button class="action-btn btn-edit" title="Editar" onclick="abrirModal(${index})"><i class="fa-solid fa-pen"></i></button> 
                 <span style="color:#999; font-size:0.8rem; margin-left:5px;">(Admin)</span>`;
    }

    let html = '';

    // 1. Botón EDITAR (Amarillo)
    html += `<button class="action-btn btn-edit" title="Editar" onclick="abrirModal(${index})"><i class="fa-solid fa-pen"></i></button>`;

    // 2. Botón VALIDAR / BLOQUEAR
    if (!isValidated) {
        // Si no está validado -> Botón verde Check
        html += `<button class="action-btn btn-approve" title="Aprobar acceso" onclick="cambiarEstado(${index}, true)"><i class="fa-solid fa-check"></i></button>`;
    } else {
        // Si está validado -> Botón gris Bloquear
        html += `<button class="action-btn btn-revoke" title="Revocar acceso" onclick="cambiarEstado(${index}, false)"><i class="fa-solid fa-ban"></i></button>`;
    }

    // 3. Botón ELIMINAR (Rojo)
    html += `<button class="action-btn btn-delete" title="Eliminar usuario" onclick="eliminarUsuario(${index})"><i class="fa-solid fa-trash"></i></button>`;

    return html;
}

// --- LÓGICA DEL MODAL (EDITAR) ---

window.abrirModal = async (index) => {
    try {
        const users = await API.cargar('users');
        const user = users[index];

        if (!user) return;

        // Llenamos el formulario con los datos actuales
        document.getElementById('editIndex').value = index;
        document.getElementById('editName').value = user.name || '';
        document.getElementById('editUser').value = user.user || '';
        document.getElementById('editPass').value = user.pass || '';
        document.getElementById('editRole').value = user.role || 'user';

        // Mostramos el modal
        document.getElementById('modalEditar').style.display = 'flex';
    } catch (e) {
        console.error(e);
        alert("Error al cargar datos para editar");
    }
};

window.cerrarModal = () => {
    document.getElementById('modalEditar').style.display = 'none';
};

window.guardarCambiosUsuario = async () => {
    const index = document.getElementById('editIndex').value;
    
    const newName = document.getElementById('editName').value;
    const newUser = document.getElementById('editUser').value;
    const newPass = document.getElementById('editPass').value;
    const newRole = document.getElementById('editRole').value;

    if(!newName || !newUser || !newPass) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    try {
        const users = await API.cargar('users');
        
        // Actualizamos datos
        users[index].name = newName;
        users[index].user = newUser;
        users[index].pass = newPass;
        users[index].role = newRole;

        // Guardamos
        await API.guardar('users', users);
        
        // Cerramos y refrescamos
        cerrarModal();
        await cargarTablaUsuarios();
        alert("Usuario modificado con éxito.");
    } catch (e) {
        console.error(e);
        alert("Error al guardar los cambios.");
    }
};

// --- LÓGICA DE ESTADO Y ELIMINACIÓN ---

window.cambiarEstado = async (index, nuevoEstado) => {
    try {
        const users = await API.cargar('users');
        users[index].validated = nuevoEstado;
        
        await API.guardar('users', users);
        await cargarTablaUsuarios();
        
        // Feedback visual rápido
        // alert(nuevoEstado ? 'Usuario habilitado' : 'Usuario bloqueado');
    } catch (e) {
        console.error(e);
        alert('Error al cambiar el estado');
    }
};

window.eliminarUsuario = async (index) => {
    if(!confirm('¿Estás seguro de eliminar este usuario permanentemente?')) return;

    try {
        const users = await API.cargar('users');
        users.splice(index, 1); // Elimina 1 elemento en la posición index
        
        await API.guardar('users', users);
        await cargarTablaUsuarios();
    } catch (e) {
        console.error(e);
        alert('Error al eliminar');
    }
};

// --- LOGOUT ---
document.getElementById('btn-logout')?.addEventListener('click', () => {
    // Ajusta 'hr_current_user' según la clave que uses en auth.js
    localStorage.removeItem('hr_current_user'); 
    window.location.href = 'login.html';
});