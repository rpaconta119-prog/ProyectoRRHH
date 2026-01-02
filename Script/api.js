// ==========================================
// api.js - VERSIÓN FINAL CON DESBLOQUEO NGROK
// ==========================================

// TU URL DE NGROK (Copiada de tu captura)
// Si reinicias Ngrok y cambia la URL, solo actualiza esta línea.
const SERVIDOR_URL = 'https://unruminant-francina-froglike.ngrok-free.dev/api';

const API = {
    // --- FUNCIÓN PARA LEER DATOS (GET) ---
    async cargar(endpoint) {
        try {
            const url = `${SERVIDOR_URL}/${endpoint}`;
            
            const respuesta = await fetch(url, {
                method: 'GET',
                headers: {
                    // ESTA ES LA CLAVE MAESTRA PARA NGROK:
                    'ngrok-skip-browser-warning': 'true',
                    // Headers estándar
                    'Content-Type': 'application/json'
                }
            });

            if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);
            
            // Convertimos la respuesta a JSON
            return await respuesta.json();

        } catch (error) {
            console.error(`❌ Error cargando ${endpoint}:`, error);
            // Retornamos array vacío para que la web no se rompa
            return []; 
        }
    },

    // --- FUNCIÓN PARA GUARDAR DATOS (POST) ---
    async guardar(endpoint, datos) {
        try {
            const url = `${SERVIDOR_URL}/${endpoint}`;

            const respuesta = await fetch(url, {
                method: 'POST',
                headers: { 
                    // AQUÍ TAMBIÉN PONEMOS LA CLAVE DE NGROK:
                    'ngrok-skip-browser-warning': 'true',
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) throw new Error(`Error guardando: ${respuesta.status}`);

            return await respuesta.json();

        } catch (error) {
            console.error(`❌ Error guardando ${endpoint}:`, error);
            alert('¡Error crítico! No se pudo conectar con el servidor.');
            throw error; // Lanzamos el error para que lo vea el código que llamó
        }
    }
};