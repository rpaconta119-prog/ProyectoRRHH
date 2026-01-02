// ==========================================
// api.js - VERSIÓN FINAL (Fuerza Ngrok)
// ==========================================

console.log("⚡ CARGANDO NUEVO API.JS CON PARCHE NGROK ⚡"); // <--- BUSCA ESTO EN CONSOLA

// Tu URL de Ngrok (revisa que no haya cambiado en la pantalla negra)
const SERVIDOR_URL = 'https://unruminant-francina-froglike.ngrok-free.dev/api';

const API = {
    // --- FUNCIÓN PARA LEER DATOS (GET) ---
    async cargar(endpoint) {
        try {
            const url = `${SERVIDOR_URL}/${endpoint}`;
            console.log(`📡 Solicitando: ${endpoint}`); // Log para depurar

            const respuesta = await fetch(url, {
                method: 'GET',
                headers: new Headers({
                    // ESTA ES LA CLAVE PARA SALTAR LA ADVERTENCIA:
                    'ngrok-skip-browser-warning': '69420', 
                    'Content-Type': 'application/json'
                })
            });

            // Si Ngrok nos devuelve HTML (Error), lo detectamos aquí
            const texto = await respuesta.text();
            
            try {
                return JSON.parse(texto); // Intentamos convertir a JSON
            } catch (jsonError) {
                console.error("🔥 NGROK BLOQUEÓ LA PETICIÓN. RESPUESTA RECIBIDA:", texto);
                throw new Error("Ngrok devolvió HTML en lugar de JSON. Revisa la consola.");
            }

        } catch (error) {
            console.error(`❌ Error cargando ${endpoint}:`, error);
            return []; 
        }
    },

    // --- FUNCIÓN PARA GUARDAR DATOS (POST) ---
    async guardar(endpoint, datos) {
        try {
            const url = `${SERVIDOR_URL}/${endpoint}`;

            const respuesta = await fetch(url, {
                method: 'POST',
                headers: new Headers({ 
                    'ngrok-skip-browser-warning': '69420',
                    'Content-Type': 'application/json' 
                }),
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) throw new Error(`Error guardando: ${respuesta.status}`);

            return await respuesta.json();

        } catch (error) {
            console.error(`❌ Error guardando ${endpoint}:`, error);
            alert('¡Error crítico! No se pudo conectar con el servidor.');
        }
    }
};