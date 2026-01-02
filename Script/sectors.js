// ==========================================
// MÓDULO DE SECTORES (CONECTADO AL SERVIDOR)
// ==========================================

const SectorsModule = (function(){
    // Variable local en memoria
    let sectors = []; 

    // Guardar en el servidor (Función interna)
    async function save(){
        try {
            await API.guardar('sectors', sectors);
            window.sectors = sectors; // Exponer globalmente
        } catch (error) {
            console.error("❌ Error guardando sectores:", error);
        }
    }

    // Agregar nuevo sector
    async function add(name){
        if(!name) return;
        
        const s = { id: 'sec-' + Date.now(), name: name.trim() };
        sectors.push(s); 
        
        await save(); // Guardar en servidor
        
        // Log en el historial
        if(typeof BacklogService !== 'undefined') {
            BacklogService.log('CREAR','SECTOR', null, s);
        }

        renderSectors();     // Actualiza selects en otras pantallas
        renderSectorsList(); // Actualiza la lista visual
    }

    // Eliminar sector
    async function remove(id){
        if (confirm('¿Seguro que quieres eliminar este sector?')) {
            const old = sectors.find(s => s.id === id);
            sectors = sectors.filter(s => s.id !== id);
            
            await save(); // Guardar cambios
            
            if(typeof BacklogService !== 'undefined') {
                BacklogService.log('BORRAR','SECTOR', old, null);
            }

            renderSectors();
            renderSectorsList();
        }
    }

    // 1. Renderiza las opciones en los <select> de toda la app
    function renderSectors(){
        const selects = document.querySelectorAll('#personSector, #filterSector, #filterSectorAssign');
        
        selects.forEach(sel => {
            if(!sel) return;
            const currentVal = sel.value; 
            const firstOpt = sel.options[0]; // "Seleccione..."
            
            sel.innerHTML = '';
            if(firstOpt) sel.appendChild(firstOpt);
            
            sectors.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                sel.appendChild(opt);
            });

            sel.value = currentVal; // Intentar restaurar selección
        });
    }

    // 2. Renderiza la lista visual (UI de configuración)
    function renderSectorsList() {
        const list = document.getElementById('sectorsListUI');
        if (!list) return; // No estamos en la pantalla de configuración
        
        if (sectors.length === 0) {
            list.innerHTML = '<li class="muted" style="padding:10px; text-align:center; background:#f9f9f9;">No hay sectores creados.</li>';
            return;
        }

        list.innerHTML = sectors.map(s => `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#fff; border:1px solid #eee; margin-bottom:5px; border-radius:6px;">
                <span style="font-weight:500;">${s.name}</span> 
                <button class="btn small danger" onclick="SectorsModule.remove('${s.id}')">Eliminar</button>
            </li>
        `).join('');
    }

    // INICIALIZACIÓN (Carga datos del servidor)
    async function init(){
        console.log("🏭 Cargando sectores...");
        
        // 1. Cargar del servidor
        sectors = await API.cargar('sectors');
        
        // 2. Si está vacío, crear datos de prueba iniciales
        if (!Array.isArray(sectors) || sectors.length === 0) {
            console.log("⚠️ Lista vacía, creando sectores por defecto...");
            sectors = [
                {id:'sec-1', name:'Administración'}, 
                {id:'sec-2', name:'Recursos Humanos'}, 
                {id:'sec-3', name:'Ventas'}
            ];
            await save(); // Guardarlos en el servidor
        }
        
        // 3. Exponer y renderizar
        window.sectors = sectors;
        renderSectors();
        renderSectorsList();
        
        // 4. Configurar formulario (si existe en esta pantalla)
        const form = document.getElementById('sectorForm');
        if(form) {
            // Clonamos el nodo para eliminar listeners viejos (truco anti-duplicados)
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', e => {
                e.preventDefault();
                const input = document.getElementById('sectorNameInput');
                if(input.value.trim() !== "") {
                    add(input.value);
                    input.value = '';
                }
            });
        }
    }

    // Disparador al cargar la página
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Exponer funciones públicas
    return { add, remove, renderSectors };
})();