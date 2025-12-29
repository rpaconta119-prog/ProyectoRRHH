const SectorsModule = (function(){
    const LS = 'hr_sectors_v1';
    let sectors = JSON.parse(localStorage.getItem(LS) || '[]');

    function save(){
        localStorage.setItem(LS, JSON.stringify(sectors));
        // Exponemos la variable globalmente para que otros scripts la lean
        window.sectors = sectors; 
    }

    function add(name){
        if(!name) return;
        const s = { id: 'sec-' + Date.now(), name: name.trim() };
        sectors.push(s); 
        save(); 
        
        // Log seguro
        if(typeof BacklogService !== 'undefined') {
            BacklogService.log('CREAR','SECTOR', null, s);
        }

        renderSectors();     // Actualiza los selectores ocultos
        renderSectorsList(); // Actualiza la lista visual
    }

    function remove(id){
        if (confirm('¿Seguro que quieres eliminar este sector?')) {
            const old = sectors.find(s => s.id === id);
            sectors = sectors.filter(s => s.id !== id);
            save();
            
            // Log seguro
            if(typeof BacklogService !== 'undefined') {
                BacklogService.log('BORRAR','SECTOR', old, null);
            }

            renderSectors();
            renderSectorsList();
        }
    }

    // 1. Renderiza las opciones en los <select> de otras pantallas (Personal, Filtros)
    function renderSectors(){
        const selects = document.querySelectorAll('#personSector, #filterSector, #filterSectorAssign');
        selects.forEach(sel => {
            if(!sel) return;
            // Guardar la opción seleccionada actualmente si existe
            const currentVal = sel.value; 
            
            // Mantener la primera opción (ej: "Seleccione un sector" o "Todos")
            const firstOpt = sel.options[0];
            sel.innerHTML = '';
            if(firstOpt) sel.appendChild(firstOpt);
            
            sectors.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                sel.appendChild(opt);
            });

            // Intentar restaurar valor
            sel.value = currentVal;
        });
    }

    // 2. Renderiza la lista visual en la pantalla de Sectores (La que arreglamos en el HTML)
    function renderSectorsList() {
        const list = document.getElementById('sectorsListUI');
        if (!list) return;
        
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

    function init(){
        // Datos iniciales si está vacío
        if (sectors.length === 0) {
            sectors = [{id:'sec-1', name:'Administración'}, {id:'sec-2', name:'Recursos Humanos'}, {id:'sec-3', name:'Ventas'}];
            save();
        }
        
        window.sectors = sectors;
        renderSectors();
        renderSectorsList();
        
        // Configurar el evento del formulario
        const form = document.getElementById('sectorForm');
        if(form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                const input = document.getElementById('sectorNameInput');
                if(input.value.trim() !== "") {
                    add(input.value);
                    input.value = '';
                }
            });
        }
    }

    // Inicialización segura
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Exponer funciones públicas
    return { add, remove, renderSectors };
})();