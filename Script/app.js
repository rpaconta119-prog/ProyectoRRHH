// App bootstrap
const App = (function(){
  function load(){
    if (window.SectorsModule && typeof SectorsModule.renderSectors === 'function') SectorsModule.renderSectors();
    if (window.PeopleModule && typeof PeopleModule.renderPeople === 'function') PeopleModule.renderPeople();
    if (window.WorkshopModule && typeof WorkshopModule.renderList === 'function') WorkshopModule.renderList('workshopsList');
    if (typeof updateStats === 'function') updateStats();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();

  return { load };
})();

window.App = App;