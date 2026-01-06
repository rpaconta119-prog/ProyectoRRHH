// ==========================================
// api.js - VERSIÓN LOCAL + CACHÉ INTELIGENTE
// ==========================================

console.log("🏠 CARGANDO API EN MODO RED LOCAL (LAN)");

// ⚠️ IMPORTANTE: CAMBIA ESTO POR LA IP DE TU PC SERVIDOR (La que viste en ipconfig)
// Mantén el puerto :3000
const SERVIDOR_IP = '172.22.105.38'; // <--- ¡EDITAR ESTO! (Ej: 192.168.0.12)
const PUERTO = '3000';
const BASE_URL = `http://${SERVIDOR_IP}:${PUERTO}/api`;

// --- SISTEMA DE CACHÉ EN MEMORIA ---
// Esto evita descargar el archivo gigante cada vez que tocas un botón
const CACHE_LOCAL = {
    datos: {},      // Aquí guardamos los JSON (applicants, people, etc.)
    timestamp: {}   // Aquí guardamos cuándo fue la última vez que se actualizó
};

// Tiempo en milisegundos para considerar el caché "viejo" y forzar recarga (Ej: 5 minutos)
// Si estás solo vos cargando, puedes subirlo. Si son varios, bájalo.
const TIEMPO_VALIDEZ = 60 * 1000 * 5; 

const API = {
    
    // --- FUNCIÓN PARA LEER DATOS (GET) ---
    async cargar(endpoint) {
        const ahora = Date.now();
        const ultimaCarga = CACHE_LOCAL.timestamp[endpoint] || 0;

        // 1. ESTRATEGIA DE CACHÉ:
        // Si ya tenemos datos en memoria Y hace menos de X tiempo que los bajamos...
        // ¡Usamos la memoria! (Instantáneo, no consume red)
        if (CACHE_LOCAL.datos[endpoint] && (ahora - ultimaCarga < TIEMPO_VALIDEZ)) {
            console.log(`⚡ Usando Caché Local para: ${endpoint}`);
            return JSON.parse(JSON.stringify(CACHE_LOCAL.datos[endpoint])); // Devolvemos copia segura
        }

        // 2. Si no hay caché o es viejo, vamos al servidor local
        try {
            console.log(`📡 Descargando desde Servidor Local: ${endpoint}...`);
            const url = `${BASE_URL}/${endpoint}`;
            
            const respuesta = await fetch(url);
            
            if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);

            const datos = await respuesta.json();

            // 3. GUARDAR EN CACHÉ para la próxima
            CACHE_LOCAL.datos[endpoint] = datos;
            CACHE_LOCAL.timestamp[endpoint] = Date.now();

            return datos;

        } catch (error) {
            console.error(`❌ Error conectando a ${BASE_URL}:`, error);
            // Si falla la red, intentamos devolver lo que haya en caché aunque sea viejo
            if (CACHE_LOCAL.datos[endpoint]) {
                console.warn("⚠️ Sin conexión. Mostrando datos cacheados antiguos.");
                return CACHE_LOCAL.datos[endpoint];
            }
            alert("No se puede conectar con la PC Servidor. Revisa que Node.js esté corriendo y la IP sea correcta.");
            return []; 
        }
    },

    // --- FUNCIÓN PARA GUARDAR DATOS (POST) ---
    async guardar(endpoint, datos) {
        try {
            const url = `${BASE_URL}/${endpoint}`;

            // 1. Enviamos los datos al servidor para que se guarden en el archivo real
            const respuesta = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos) // Enviamos datos completos
            });

            if (!respuesta.ok) throw new Error(`Error guardando: ${respuesta.status}`);

            // 2. TRUCO DE OPTIMIZACIÓN:
            // Actualizamos nuestro CACHÉ LOCAL inmediatamente.
            // Así la próxima vez que llames a cargar(), ya tiene los datos nuevos
            // sin tener que volver a descargarlos del servidor.
            CACHE_LOCAL.datos[endpoint] = datos;
            CACHE_LOCAL.timestamp[endpoint] = Date.now();
            console.log(`💾 Guardado y Caché actualizado para: ${endpoint}`);

            return await respuesta.json();

        } catch (error) {
            console.error(`❌ Error guardando en ${endpoint}:`, error);
            alert('¡Error al guardar! Verifica la conexión con la PC Servidor.');
        }
    },

    // Función extra por si quieres forzar recarga manual
    limpiarCache(endpoint) {
        if(endpoint) delete CACHE_LOCAL.datos[endpoint];
        else CACHE_LOCAL.datos = {};
        console.log("🧹 Caché limpiado.");
    }
};