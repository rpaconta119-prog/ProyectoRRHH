const SERVIDOR_URL = 'https://unruminant-francina-froglike.ngrok-free.dev/api';

const API = {
    // Función genérica para cargar datos
    async cargar(endpoint) {
        try {
            const respuesta = await fetch(`${SERVIDOR_URL}/${endpoint}`);
            if (!respuesta.ok) throw new Error('Error en conexión');
            return await respuesta.json();
        } catch (error) {
            console.error(`❌ Error cargando ${endpoint}:`, error);
            return []; // Retorna lista vacía si falla para no romper la web
        }
    },

    // Función genérica para guardar datos
    async guardar(endpoint, datos) {
        try {
            const respuesta = await fetch(`${SERVIDOR_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            return await respuesta.json();
        } catch (error) {
            console.error(`❌ Error guardando ${endpoint}:`, error);
            alert('¡Error crítico! No se pudo guardar en el servidor.');
        }
    }
};