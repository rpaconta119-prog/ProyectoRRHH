// ==========================================
// APP BOOTSTRAP (CARGADOR PRINCIPAL)
// ==========================================

const App = (function(){
  
  // Hacemos la función ASYNC para soportar las nuevas llamadas al servidor
  async function load(){
    console.log("🔄 Sincronizando interfaz completa...");

    try {
        // 1. Refrescar Sectores (Dropdowns y Filtros)
        if (window.SectorsModule && typeof SectorsModule.renderSectors === 'function') {
            SectorsModule.renderSectors();
        }

        // 2. Refrescar Personas (Grilla de tarjetas)
        // Nota: PeopleModule es el objeto que definimos en people.js
        if (typeof PeopleModule !== 'undefined' && typeof PeopleModule.renderPeople === 'function') {
            PeopleModule.renderPeople();
        }

        // 3. Refrescar Talleres (Listas)
        if (window.WorkshopModule && typeof WorkshopModule.renderList === 'function') {
            WorkshopModule.renderList('workshopsList');
        }

        // 4. Actualizar Estadísticas del Dashboard (KPIs)
        // Como modificamos updateStats en ui.js para que sea async, aquí usamos await
        if (typeof updateStats === 'function') {
            await updateStats();
        }

    } catch (error) {
        console.error("⚠️ Error en la carga automática:", error);
    }
  }

  // Ejecutar al cargar la página
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => load());
  } else {
      load();
  }

  // Exponemos la función load para poder llamar a App.load() desde la consola si hace falta refrescar
  return { load };
})();

window.App = App;