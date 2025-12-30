/**
 * Script/Organigrama.js
 * Lógica para generar el árbol y manejar la búsqueda de ruta crítica (Pathfinding)
 */

$(function() {
    // =========================================================
    // 1. CARGA DE DATOS (Variable compartida)
    // =========================================================
    const rawData = JSON.parse(localStorage.getItem('hr_people_v1') || '[]');

    // =========================================================
    // 2. FUNCIONES DE AYUDA
    // =========================================================

    // Transforma la lista plana en estructura de árbol
    function buildHierarchy(data) {
        const map = {};
        let root = null;

        // Paso 1: Mapear todos los nodos
        data.forEach(item => {
            map[item.personJerId] = { 
                ...item, 
                // Guardamos el ID explícitamente para uso interno
                id: item.personJerId, 
                name: item.name, 
                title: item.categoria || 'Sin cargo',
                children: [] 
            };
        });

        // Paso 2: Conectar hijos con padres
        data.forEach(item => {
            const parentId = item.parent;
            const currentId = item.personJerId;

            if (parentId && map[parentId]) {
                map[parentId].children.push(map[currentId]);
            } else {
                // Si no tiene padre, o el padre no existe en el mapa, es raíz (o huérfano)
                // Asumimos que el primero sin padre válido es el Root principal
                if (!root && !parentId) {
                    root = map[currentId];
                }
            }
        });

        return root;
    }

    // Lógica del Buscador: Resalta el camino desde el empleado hasta el rango 0
    function filterChart() {
        // 1. Limpiar estilos anteriores
        $('.node').removeClass('path-highlight dimmed');
        
        // 2. Obtener texto de búsqueda
        const keyword = $('#key-word').val().toLowerCase().trim();
        
        // Si está vacío, salimos
        if (!keyword) return;

        // 3. Buscar coincidencias en los datos
        const matches = rawData.filter(p => p.name && p.name.toLowerCase().includes(keyword));

        if (matches.length === 0) {
            alert('No se encontró a nadie con ese nombre.');
            return;
        }

        // 4. Atenuar (oscurecer) todo el diagrama para dar efecto de foco
        $('.node').addClass('dimmed');

        // 5. Trazar la ruta (Pathfinding) hacia arriba para cada coincidencia
        matches.forEach(person => {
            let currentId = person.personJerId;
            
            // Bucle: Mientras tengamos un ID (subimos por la jerarquía)
            while (currentId) {
                // Buscamos el nodo visual en el HTML usando el ID que asignamos en createNode
                const $node = $('#node-' + currentId);
                
                // Si el nodo existe visualmente
                if ($node.length) {
                    $node.removeClass('dimmed').addClass('path-highlight');
                }

                // Buscamos al padre en los datos para la siguiente iteración
                const personData = rawData.find(p => p.personJerId == currentId);
                
                // Si existe la persona y tiene padre, seguimos subiendo. Si no, cortamos el bucle.
                if (personData && personData.parent) {
                    currentId = personData.parent;
                } else {
                    currentId = null; // Llegamos al rango 0 (Jefe máximo)
                }
            }
        });
    }

    // Limpia el buscador y restaura el gráfico
    function clearFilter() {
        $('#key-word').val('');
        $('.node').removeClass('path-highlight dimmed');
    }

    // =========================================================
    // 3. INICIALIZACIÓN Y RENDERIZADO
    // =========================================================

    // Validación básica
    if (rawData.length === 0) {
        $('#chart-container').html('<p style="margin-top:20px;">No hay personal registrado en la base de datos.</p>');
        return;
    }

    const datasource = buildHierarchy(rawData);

    if (!datasource) {
        $('#chart-container').html('<p style="margin-top:20px; color:red;">Error: No se pudo identificar al jefe principal (Rango 0). Revisa los datos.</p>');
        return;
    }

    // Configuración del plugin OrgChart
    $('#chart-container').orgchart({
        'data' : datasource,
        'nodeContent': 'title',
        'verticalLevel': 3,    // A partir de qué nivel se ponen verticales (ajustar a gusto)
        'visibleLevel': 99,    // Mostramos todos los niveles expandidos por defecto para facilitar la búsqueda
        'toggleSiblingsResp': true,
        'createNode': function($node, data) {
            // *** CRÍTICO: Asignamos un ID único al elemento HTML del nodo ***
            // Esto nos permite encontrar el cuadro específico después con $('#node-123')
            $node.attr('id', 'node-' + data.personJerId);

            // Renderizado de la foto
            if (data.photoData) {
                $node.prepend(`
                    <div class="chart-avatar" style="
                        background-image:url(${data.photoData}); 
                        background-size:cover; 
                        background-position:center; 
                        width:50px; height:50px; 
                        border-radius:50%; 
                        margin: 5px auto;">
                    </div>`
                );
            } else {
                const initial = data.name ? data.name.charAt(0) : '?';
                $node.prepend(`
                    <div class="chart-avatar-placeholder" style="
                        width:50px; height:50px; 
                        border-radius:50%; 
                        background:#ddd; 
                        margin: 5px auto; 
                        display:flex; align-items:center; justify-content:center; 
                        font-weight:bold;">
                        ${initial}
                    </div>`
                );
            }

            // Estilo especial para el Rango 0 (Jefe sin parent)
            if (!data.parent) {
                $node.find('.title').css('background-color', '#1a252f'); // Un color más oscuro
            }
        }
    });

    // =========================================================
    // 4. LISTENERS (EVENTOS)
    // =========================================================

    // Botón Buscar
    $('#btn-search').on('click', filterChart);
    
    // Botón Limpiar
    $('#btn-clear').on('click', clearFilter);

    // Tecla Enter en el input
    $('#key-word').on('keyup', function(e) {
        if(e.keyCode === 13) {
            filterChart();
        }
        // Si borra todo el texto manualmente, limpiar filtro
        if ($(this).val().length === 0) {
            clearFilter();
        }
    });

});