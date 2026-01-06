let todosLosDatos = []; 
let carpetaActualId = null; 
let terminoBusqueda = ""; 
let tipoFiltro = "todo"; // Nuevo estado para el filtro

document.addEventListener('DOMContentLoaded', () => {
    cargarDocumentos();

    // Listener para el input de texto
    const inputBusqueda = document.getElementById('inputBuscador');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', (e) => {
            terminoBusqueda = e.target.value.toLowerCase();
            renderizar();
        });
    }

    // Listener para el selector (dropdown)
    const selectFiltro = document.getElementById('filtroTipo');
    if (selectFiltro) {
        selectFiltro.addEventListener('change', (e) => {
            tipoFiltro = e.target.value;
            renderizar(); // Re-renderizar cuando cambia la opción
        });
    }
});

async function cargarDocumentos() {
    todosLosDatos = await API.cargar('documents');
    if (!Array.isArray(todosLosDatos)) todosLosDatos = [];
    renderizar();
}

function renderizar() {
    const grid = document.getElementById('grid-contenido');
    grid.innerHTML = '';

    let itemsAMostrar = [];

    // --- LÓGICA DE BÚSQUEDA ---
    // Si hay texto escrito, buscamos globalmente
    if (terminoBusqueda.length > 0) {
        
        itemsAMostrar = todosLosDatos.filter(item => {
            // 1. Coincidencia de nombre
            const coincideNombre = item.nombre.toLowerCase().includes(terminoBusqueda);
            
            // 2. Coincidencia de tipo (Filtro Select)
            let pasaFiltroTipo = true;
            if (tipoFiltro === 'archivos' && item.tipo === 'carpeta') pasaFiltroTipo = false;
            if (tipoFiltro === 'carpetas' && item.tipo !== 'carpeta') pasaFiltroTipo = false;

            return coincideNombre && pasaFiltroTipo;
        });
        
        // Actualizar UI para modo búsqueda
        const breadcrumbs = document.getElementById('breadcrumbs');
        if(breadcrumbs) breadcrumbs.innerHTML = `<span>🔍 Buscando: "${terminoBusqueda}" (${tipoFiltro})</span>`;
        
        const btnAtras = document.getElementById('btn-atras');
        if(btnAtras) btnAtras.disabled = true;

    } else {
        // --- NAVEGACIÓN NORMAL (SIN BUSCADOR) ---
        // Aquí mostramos solo lo que hay en la carpeta actual
        // Nota: En navegación normal, ignoramos el filtro "todo/archivos/carpetas" 
        // para no ocultar cosas por error mientras navegas, pero si quieres aplicarlo también aquí, avísame.
        
        itemsAMostrar = todosLosDatos.filter(item => item.parentId === carpetaActualId);
        
        const btnAtras = document.getElementById('btn-atras');
        if (btnAtras) btnAtras.disabled = (carpetaActualId === null);
        
        actualizarBreadcrumbs();
    }

    // Mensaje si no hay resultados
    if (itemsAMostrar.length === 0) {
        let mensaje = carpetaActualId === null ? 'Carpeta vacía.' : 'Esta carpeta está vacía.';
        if (terminoBusqueda.length > 0) mensaje = 'No se encontraron resultados con ese filtro.';
        
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; margin-top: 50px;">${mensaje}</p>`;
        return;
    }

    // Ordenar (Carpetas primero) solo si no estamos buscando
    if (!terminoBusqueda) {
        itemsAMostrar.sort((a, b) => {
            if (a.tipo === 'carpeta' && b.tipo !== 'carpeta') return -1;
            if (a.tipo !== 'carpeta' && b.tipo === 'carpeta') return 1;
            return a.nombre.localeCompare(b.nombre);
        });
    }

    // --- RENDERIZADO DE ITEMS ---
    itemsAMostrar.forEach(item => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        let icono = '📄';
        if (item.tipo === 'carpeta') icono = '📁';
        else if (item.tipo.includes('image')) icono = '🖼️';
        else if (item.tipo.includes('pdf')) icono = '📕';

        div.innerHTML = `
            <button class="delete-btn" onclick="eliminarItem('${item.id}', event)">🗑️</button>
            <span class="icon">${icono}</span>
            <div class="file-name" title="${item.nombre}">${item.nombre}</div>
            ${item.size ? `<div class="file-meta">${item.size}</div>` : ''}
            ${terminoBusqueda ? `<div class="file-meta">En: ${obtenerNombreCarpeta(item.parentId)}</div>` : ''}
        `;

        div.onclick = (e) => {
            if(e.target.classList.contains('delete-btn')) return;
            
            if (item.tipo === 'carpeta') {
                // Si haces click en una carpeta encontrada por el buscador:
                // Limpiamos el buscador y entramos a esa carpeta
                if(terminoBusqueda) {
                    terminoBusqueda = "";
                    document.getElementById('inputBuscador').value = "";
                    // Opcional: Resetear el filtro a 'todo' si quieres
                    // tipoFiltro = "todo"; 
                    // document.getElementById('filtroTipo').value = "todo";
                    entrarCarpeta(item.id);
                } else {
                    entrarCarpeta(item.id);
                }
            } else {
                manejarClickArchivo(item);
            }
        };
        grid.appendChild(div);
    });
}

// --- MANEJO DE VISTA PREVIA ---
function manejarClickArchivo(item) {
    const esImagen = item.tipo.includes('image');
    const esPdf = item.tipo.includes('pdf');

    if (esImagen || esPdf) {
        abrirModalPreview(item, esImagen ? 'img' : 'pdf');
    } else {
        descargarArchivo(item);
    }
}

function abrirModalPreview(item, tipo) {
    const modal = document.getElementById('modalPreview');
    const container = document.getElementById('previewContainer');
    const title = document.getElementById('modalTitle');
    const btnDescargar = document.getElementById('btnDescargarModal');

    title.innerText = item.nombre;
    container.innerHTML = ''; 
    btnDescargar.href = item.data; 
    btnDescargar.download = item.nombre; 

    if (tipo === 'img') {
        const img = document.createElement('img');
        img.src = item.data;
        container.appendChild(img);
    } else if (tipo === 'pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = item.data;
        iframe.style.border = "none";
        container.appendChild(iframe);
    }

    modal.style.display = 'flex'; 
}

function cerrarModal() {
    document.getElementById('modalPreview').style.display = 'none';
    document.getElementById('previewContainer').innerHTML = ''; 
}

window.onclick = function(event) {
    const modal = document.getElementById('modalPreview');
    if (event.target == modal) {
        cerrarModal();
    }
}

// --- FUNCIONES CORE (Navegación, CRUD) ---
function navegarAtras() {
    if (carpetaActualId === null) return; 
    const carpetaActual = todosLosDatos.find(c => c.id === carpetaActualId);
    if (carpetaActual) {
        carpetaActualId = carpetaActual.parentId;
        renderizar();
    } else {
        navegarRaiz();
    }
}

function crearCarpeta() {
    const nombre = prompt("Nombre de la nueva carpeta:");
    if (!nombre) return;

    const nuevaCarpeta = {
        id: 'folder-' + Date.now(),
        parentId: carpetaActualId,
        tipo: 'carpeta',
        nombre: nombre,
        fecha: new Date().toLocaleDateString()
    };

    todosLosDatos.push(nuevaCarpeta);
    guardarCambios();
}

function entrarCarpeta(id) {
    carpetaActualId = id;
    renderizar();
}

function navegarRaiz() {
    carpetaActualId = null;
    renderizar();
}

async function procesarSubida(input) {
    if (input.files.length === 0) return;

    for (const file of input.files) {
        const base64 = await leerArchivoBase64(file);
        const nuevoArchivo = {
            id: 'file-' + Date.now() + Math.random().toString(36).substr(2, 5),
            parentId: carpetaActualId,
            tipo: file.type || 'archivo',
            nombre: file.name,
            size: formatBytes(file.size),
            data: base64 
        };
        todosLosDatos.push(nuevoArchivo);
    }
    await guardarCambios();
    input.value = ''; 
}

const leerArchivoBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

function descargarArchivo(item) {
    const link = document.createElement("a");
    link.href = item.data;
    link.download = item.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function eliminarItem(id, event) {
    event.stopPropagation(); 
    if(!confirm("¿Eliminar este elemento?")) return;

    const idsABorrar = obtenerIdsDescendientes(id);
    idsABorrar.push(id); 

    todosLosDatos = todosLosDatos.filter(item => !idsABorrar.includes(item.id));
    await guardarCambios();
}

function obtenerIdsDescendientes(padreId) {
    let hijos = todosLosDatos.filter(item => item.parentId === padreId);
    let ids = hijos.map(h => h.id);
    hijos.forEach(hijo => {
        if (hijo.tipo === 'carpeta') {
            ids = ids.concat(obtenerIdsDescendientes(hijo.id));
        }
    });
    return ids;
}

function obtenerNombreCarpeta(id) {
    if(!id) return "Inicio";
    const c = todosLosDatos.find(x => x.id === id);
    return c ? c.nombre : "Desconocido";
}

async function guardarCambios() {
    await API.guardar('documents', todosLosDatos);
    renderizar();
}

function actualizarBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (!container) return;
    
    if (carpetaActualId === null) {
        container.innerHTML = '<span onclick="navegarRaiz()">🏠 Inicio</span>';
        return;
    }

    let camino = [];
    let tempId = carpetaActualId;
    while (tempId) {
        const carpeta = todosLosDatos.find(i => i.id === tempId);
        if (carpeta) {
            camino.unshift(carpeta);
            tempId = carpeta.parentId;
        } else {
            tempId = null;
        }
    }

    let html = '<span onclick="navegarRaiz()">🏠 Inicio</span>';
    camino.forEach((c, index) => {
        if (index === camino.length - 1) {
            html += ` > <span>${c.nombre}</span>`;
        } else {
            html += ` > <span onclick="entrarCarpeta('${c.id}')">${c.nombre}</span>`;
        }
    });
    container.innerHTML = html;
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}