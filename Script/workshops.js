// ==========================================
// MÓDULO DE TALLERES (WORKSHOPS) - SERVIDOR
// ==========================================

const WorkshopModule = (function(){
  // Variable en memoria
  let workshops = [];

  // Helper para obtener personas (necesario para nombres de asistentes)
  async function getPeople() {
    if (window.people && window.people.length > 0) return window.people;
    return await API.cargar('people');
  }

  // --- FUNCIÓN DE GUARDADO (ASYNC) ---
  async function save(){
    try {
        await API.guardar('workshops', workshops);
        window.workshops = workshops;
        
        // Actualizar UI
        if (typeof updateStats === 'function') updateStats();
        if (typeof renderList === 'function') renderList();
        if (typeof renderCalendar === 'function') renderCalendar();
        
        // Si hay un reporte abierto, refrescarlo
        const reportModal = document.getElementById('reportModal');
        if (reportModal && !reportModal.classList.contains('hidden')) {
            // Buscamos el ID del taller que se está mostrando en el reporte
            // (Un poco hacky, pero efectivo: buscamos en el título)
            const title = document.getElementById('reportTitle')?.textContent; 
            // O mejor, si tienes una variable global de "taller actual", úsala.
        }

    } catch (error) {
        console.error("❌ Error guardando talleres:", error);
    }
  }

  // --- Fechas / Calendario utilities ---
  let calendar = null;

  async function ensureDates() {
    let changed = false;
    workshops.forEach(w => {
      if (!w.start) {
        if (w.date) w.start = w.date;
        else { w.start = new Date().toISOString(); changed = true; }
      }
      if (!w.end) {
        try {
          const s = new Date(w.start);
          const e = new Date(s.getTime() + 60*60*1000);
          w.end = e.toISOString(); changed = true;
        } catch(e) { /* ignore */ }
      }
      if (!w.logs) { w.logs = []; changed = true; }
      if (!w.docs) { w.docs = []; changed = true; }
    });
    
    if (changed) await save();
  }

  function formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    try { return d.toLocaleString(); } catch(e) { return iso; }
  }

  // --- Calendario ---
  function initCalendar(){
    const el = document.getElementById('calendar');
    if (!el || !window.FullCalendar) return;
    if (calendar) { try { calendar.destroy(); } catch(_){} }
    
    calendar = new FullCalendar.Calendar(el, {
      initialView: 'dayGridMonth',
      locale: 'es',
      firstDay: 1,
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
      events: [],
      eventClick: function(info){
        const wid = info.event.extendedProps?.workshopId || info.event.id;
        if (typeof renderSidePanel === 'function') renderSidePanel(wid); else exportReport(wid);
      },
      eventDidMount: function(info) {
        info.el.style.cursor = 'pointer';
      },
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false }
    });
    
    renderCalendar();
    calendar.render();
  }

  function renderCalendar(){
    if (!calendar) return;
    calendar.removeAllEvents();
    
    workshops.forEach(w => {
      if (Array.isArray(w.weekdays) && w.weekdays.length > 0 && w.start && w.end) {
        const s = new Date(w.start);
        const e = new Date(w.end);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
          if (w.weekdays.includes(d.getDay())) {
            const startTime = new Date(w.start);
            const endTime = new Date(w.end);
            const evStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startTime.getHours(), startTime.getMinutes());
            const evEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), endTime.getHours(), endTime.getMinutes());
            calendar.addEvent({ id: w.id + '-' + evStart.toISOString(), title: w.name, start: evStart.toISOString(), end: evEnd.toISOString(), extendedProps: { workshopId: w.id } });
          }
        }
      } else {
        calendar.addEvent({ id: w.id, title: w.name, start: w.start || w.date, end: w.end, extendedProps: { workshopId: w.id } });
      }
    });
  }

  // --- Panel Lateral ---
  async function renderSidePanel(id){
    const el = document.getElementById('sideWorkshop');
    if(!el) return;
    if(!id){ el.innerHTML = '<p class="muted">Seleccioná un taller para ver sus detalles e informes.</p>'; return; }
    
    const w = workshops.find(x=>x.id===id);
    if(!w) { el.innerHTML = '<p class="muted">Taller no encontrado.</p>'; return; }
    
    // Obtenemos personas (async)
    const ppl = await getPeople();

    const attendees = (w.attendees||[]).map(a => {
      const p = ppl.find(pp => pp.id === a.id) || {};
      return `<li><strong>${p.name || a.name || '—'}</strong> ${p.legajo?`<small class="muted">• ${p.legajo}</small>`:''}</li>`;
    }).join('') || '<li class="muted">Sin asistentes</li>';

    const logs = (w.logs||[]).map(l => `<div class="log-card ${l.featured? 'featured':''}"><div class="log-header"><strong>${l.author}</strong> <small>${formatDateTime(l.date)}</small></div><div style="margin-top:6px">${l.content}</div><div style="text-align:right;margin-top:6px"><button class="btn small" onclick="WorkshopModule.removeLog('${w.id}','${l.id}')">Eliminar</button></div></div>`).join('') || '<p class="muted">Sin notas</p>';

    const docs = (w.docs||[]).map(d => `<div class="doc-card"><span>📄 ${d.name} <small class="muted">(${formatDateTime(d.date)})</small></span><div><button class="btn small" onclick="WorkshopModule.downloadDoc('${w.id}','${d.id}')">Descargar</button> <button class="btn small" onclick="WorkshopModule.removeDoc('${w.id}','${d.id}')">✕</button></div></div>`).join('') || '<p class="muted">Sin documentos</p>';

    el.innerHTML = `
      <div class="panel-header">
        <div>
          <h4 style="margin:0">${w.name}</h4>
          <div class="muted small">Instructor: ${w.instructor||'-'} • ${formatDateTime(w.start)}</div>
        </div>
      </div>
      <div class="workshop-side-actions">
        <button class="btn" onclick="WorkshopModule.exportReport('${w.id}')">Abrir Informe</button>
        <button class="btn" onclick="WorkshopModule.assign('${w.id}')">Asignar</button>
        <button class="btn" onclick="openWorkshopModal('${w.id}')">Editar</button>
      </div>

      <h4>Asistentes (${(w.attendees||[]).length})</h4>
      <ul>${attendees}</ul>

      <h4>Bitácora</h4>
      <div>${logs}</div>
      <div style="margin-top:8px;" class="no-print">
        <textarea id="sideLogInput" placeholder="Agregar nota rápida..." style="width:100%;height:50px;margin-top:8px"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;"><label><input type="checkbox" id="sideLogFeatured"> Importante</label><button class="btn" onclick="(function(){ WorkshopModule.addLog('${w.id}', document.getElementById('sideLogInput').value, document.getElementById('sideLogFeatured').checked); document.getElementById('sideLogInput').value=''; })()">Guardar</button></div>
      </div>

      <h4>Documentos</h4>
      <div>${docs}</div>
      <div style="margin-top:8px" class="no-print"><input type="file" onchange="WorkshopModule.uploadDoc('${w.id}', this.files[0])"></div>
    `;
  }

  // --- Gestión de Bitácora ---
  async function addLog(workshopId, text, isFeatured = false) {
    if (!text || !text.trim()) return alert('Escribe un comentario para la bitácora.');
    const idx = workshops.findIndex(w => w.id === workshopId);
    if (idx === -1) return;

    const newLog = {
      id: 'log-' + Date.now(),
      date: new Date().toISOString(),
      content: text,
      featured: isFeatured,
      author: JSON.parse(localStorage.getItem('hr_current_user'))?.user || 'Sistema'
    };

    if (!workshops[idx].logs) workshops[idx].logs = [];
    workshops[idx].logs.unshift(newLog);
    
    await save();
    
    exportReport(workshopId);
    if (document.getElementById('sideWorkshop')) renderSidePanel(workshopId);
    return newLog;
  }

  async function removeLog(workshopId, logId) {
    if(!confirm('¿Eliminar esta nota?')) return;
    const w = workshops.find(x => x.id === workshopId);
    if (!w || !w.logs) return;
    w.logs = w.logs.filter(l => l.id !== logId);
    
    await save();
    
    exportReport(workshopId);
    if (document.getElementById('sideWorkshop')) renderSidePanel(workshopId);
  }

  // --- Gestión de Documentos ---
  function uploadDoc(workshopId, file) {
    if (!file) return;
    // Límite local para no saturar subida
    if (file.size > 2 * 1024 * 1024) return alert("El archivo supera el límite recomendado de 2MB.");

    const reader = new FileReader();
    reader.onload = async function(e) {
      const idx = workshops.findIndex(w => w.id === workshopId);
      if (idx === -1) return;

      const newDoc = {
        id: 'doc-' + Date.now(),
        name: file.name,
        type: file.type,
        date: new Date().toISOString(),
        data: e.target.result
      };

      if (!workshops[idx].docs) workshops[idx].docs = [];
      workshops[idx].docs.push(newDoc);
      
      await save();
      
      exportReport(workshopId);
      if (document.getElementById('sideWorkshop')) renderSidePanel(workshopId);
    };
    reader.readAsDataURL(file);
  }

  async function removeDoc(workshopId, docId) {
    if (!confirm("¿Eliminar este documento?")) return;
    const w = workshops.find(x => x.id === workshopId);
    if (w && w.docs) {
      w.docs = w.docs.filter(d => d.id !== docId);
      await save();
      exportReport(workshopId);
      if (document.getElementById('sideWorkshop')) renderSidePanel(workshopId);
    }
  }

  function downloadDoc(workshopId, docId) {
    const w = workshops.find(x => x.id === workshopId);
    const doc = w?.docs?.find(d => d.id === docId);
    if (!doc) return;
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    link.click();
  }

  // --- Modals y CRUD ---
  function openWorkshopModal(id){
    const modal = document.getElementById('workshopModal');
    if (!modal) return;
    document.getElementById('workshopFormModal').reset();
    document.getElementById('workshopId').value = id || '';
    document.getElementById('workshopModalTitle').textContent = id ? 'Editar taller' : 'Nuevo taller';
    if (id) {
      const w = workshops.find(x => x.id === id);
      if (!w) return alert('Taller no encontrado');
      document.getElementById('workshopNameModal').value = w.name || '';
      document.getElementById('workshopInstructorModal').value = w.instructor || '';
      document.getElementById('workshopStartModal').value = w.start ? new Date(w.start).toISOString().slice(0,16).replace('T',' ') : '';
      document.getElementById('workshopEndModal').value = w.end ? new Date(w.end).toISOString().slice(0,16).replace('T',' ') : '';
      document.getElementById('workshopDescModal').value = w.desc || '';
      const weekChecks = document.querySelectorAll('input[name="weekday"]');
      weekChecks.forEach(ch => { ch.checked = Array.isArray(w.weekdays) && w.weekdays.includes(Number(ch.value)); });
    }
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    // Inicializar Flatpickr si existe
    if (window.flatpickr) {
      flatpickr('#workshopStartModal', {enableTime:true,dateFormat:'Y-m-d H:i', time_24hr:true});
      flatpickr('#workshopEndModal', {enableTime:true,dateFormat:'Y-m-d H:i', time_24hr:true});
    }
  }

  function closeWorkshopModal() {
    const modal = document.getElementById('workshopModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('modal-open');
      document.getElementById('workshopFormModal').reset();
    }
  }

  async function saveWorkshopFromForm(e){
    e.preventDefault();
    const id = document.getElementById('workshopId').value || 'w-' + Date.now();
    const startVal = document.getElementById('workshopStartModal').value;
    const endVal = document.getElementById('workshopEndModal').value;
    const selectedWeekdays = Array.from(document.querySelectorAll('input[name="weekday"]:checked')).map(c=>Number(c.value));
    
    const idx = workshops.findIndex(w => w.id === id);
    const oldData = idx !== -1 ? JSON.parse(JSON.stringify(workshops[idx])) : null;

    const data = {
      id,
      name: document.getElementById('workshopNameModal').value,
      instructor: document.getElementById('workshopInstructorModal').value,
      start: startVal ? new Date(startVal).toISOString() : null,
      end: endVal ? new Date(endVal).toISOString() : null,
      weekdays: selectedWeekdays,
      desc: document.getElementById('workshopDescModal').value,
      attendees: idx !== -1 ? workshops[idx].attendees : [],
      logs: idx !== -1 ? workshops[idx].logs : [],
      docs: idx !== -1 ? workshops[idx].docs : []
    };

    if (idx !== -1) {
      // EDITAR
      workshops[idx] = Object.assign({}, workshops[idx], data);
      await save();
      if(typeof BacklogService !== 'undefined') BacklogService.log('EDITAR', 'TALLER', oldData, workshops[idx]);
    } else {
      // CREAR
      if (!data.start) data.start = new Date().toISOString();
      if (!data.end) data.end = new Date(Date.parse(data.start) + 60*60*1000).toISOString();
      workshops.unshift(data);
      await save();
      if(typeof BacklogService !== 'undefined') BacklogService.log('CREAR', 'TALLER', null, data);
    }
    
    document.getElementById('workshopModal')?.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (document.getElementById('sideWorkshop')) renderSidePanel(id);
  }

  async function remove(id){
    if (!confirm('¿Eliminar este taller?')) return;
    const idx = workshops.findIndex(w => w.id === id);
    if (idx === -1) return;
    
    const old = workshops[idx];
    workshops.splice(idx,1);
    
    await save();
    
    if(typeof BacklogService !== 'undefined') BacklogService.log('BORRAR', 'TALLER', old, null);
    
    const reportModal = document.getElementById('reportModal');
    if (reportModal && !reportModal.classList.contains('hidden')) {
      reportModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
    const assignModal = document.getElementById('assignModal');
    if (assignModal && !assignModal.classList.contains('hidden')) {
      assignModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
    try { document.getElementById('sideWorkshop') && (document.getElementById('sideWorkshop').innerHTML = '<p class="muted">Seleccioná un taller para ver sus detalles e informes.</p>'); } catch(e){}
  }

  // --- Reporte Detallado ---
  async function exportReport(id){
    const w = workshops.find(x=>x.id===id);
    if(!w) return alert('Taller no encontrado');
    
    const ppl = await getPeople(); // Personas async
    
    const user = JSON.parse(localStorage.getItem('hr_current_user'))?.user || 'Sistema';
    const generated = new Date().toLocaleString();

    // Helper para sector
    const getSectorName = (sid) => {
        if(window.sectors){
            return window.sectors.find(s=>s.id===sid)?.name || sid || '-';
        }
        return sid || '-';
    };

    const rows = (w.attendees||[]).map((a,i) => {
      const p = ppl.find(pp => pp.id === a.id) || {};
      const sectorName = getSectorName(p.sectorId);
      return `<tr><td>${i+1}</td><td>${p.name || a.name}</td><td>${p.legajo || ''}</td><td>${p.cuil || ''}</td><td>${sectorName}</td></tr>`;
    }).join('');

    const logsHtml = (w.logs || []).map(l => `
      <div style="border-left: 4px solid ${l.featured ? '#f1c40f' : '#3498db'}; background: #f9f9f9; padding: 10px; margin-bottom: 10px; border-radius: 4px; position:relative;">
        <div style="font-size:11px; color:#666; display:flex; justify-content:space-between;">
          <span><strong>${l.author}</strong> - ${formatDateTime(l.date)}</span>
          <button class="no-print" style="color:red;border:none;background:none;cursor:pointer;" onclick="WorkshopModule.removeLog('${w.id}','${l.id}')">Eliminar</button>
        </div>
        <p style="margin: 5px 0 0; font-size: 14px;">${l.featured ? '⭐ ' : ''}${l.content}</p>
      </div>`).join('');

    const docsHtml = (w.docs || []).map(d => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:#eee; padding:5px 10px; margin-bottom:5px; border-radius:4px; font-size:12px;">
        <span>📄 ${d.name} <small class="muted">(${formatDateTime(d.date)})</small></span>
        <div>
          <button class="btn small" onclick="WorkshopModule.downloadDoc('${w.id}','${d.id}')">Descargar</button>
          <button class="no-print" style="color:red;border:none;background:none;cursor:pointer;margin-left:5px;" onclick="WorkshopModule.removeDoc('${w.id}','${d.id}')">✕</button>
        </div>
      </div>`).join('');

    const bodyHtml = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <img src="Assets/LOGO.png" style="height:48px;object-fit:contain;" onerror="this.style.display='none'"/>
        <div><h2 style="margin:0">Informe: ${w.name}</h2><div style="color:#666;font-size:13px">Instructor: ${w.instructor||'-'} • Fecha: ${formatDateTime(w.start)}</div></div>
      </div>
      <div style="display:grid; grid-template-columns: 1.6fr 1fr; gap:20px;">
        <div>
          <h4>Asistentes (${(w.attendees||[]).length}) <button class="btn no-print" onclick="WorkshopModule.assign('${w.id}')" style="margin-left:10px">+ Gestionar</button></h4>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:#f2f2f2"><th>#</th><th>Nombre</th><th>Legajo</th><th>CUIL</th><th>Sector</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;">Sin asistentes</td></tr>'}</tbody>
          </table>
        </div>
        <div>
          <h4>Bitácora del Taller</h4>
          <div class="no-print" style="margin-bottom:15px; background:#f0f7ff; padding:10px; border-radius:8px;">
            <textarea id="logInput" placeholder="¿Cómo estuvo el taller hoy?" style="width:100%; height:50px; margin-bottom:5px;"></textarea>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="font-size:12px;"><input type="checkbox" id="logFeatured"> Importante</label>
              <button class="btn" onclick="WorkshopModule.addLog('${w.id}', document.getElementById('logInput').value, document.getElementById('logFeatured').checked)">Guardar</button>
            </div>
          </div>
          <div style="max-height:250px; overflow-y:auto;">${logsHtml || '<p class="muted">Sin notas.</p>'}</div>
          <h4 style="margin-top:15px;">Documentos Adjuntos</h4>
          <input type="file" class="no-print" style="font-size:11px; width:100%;" onchange="WorkshopModule.uploadDoc('${w.id}', this.files[0])">
          <div style="margin-top:10px;">${docsHtml || '<p class="muted">Sin archivos.</p>'}</div>
        </div>
      </div>
      <p style="color:#666;font-size:11px;margin-top:20px; border-top:1px solid #eee;">Generado por ${user} • ${generated}</p>
    `;

    const modal = document.getElementById('reportModal');
    if (modal) {
      document.getElementById('reportTitle').textContent = `Informe Detallado`;
      document.getElementById('reportBody').innerHTML = bodyHtml;
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
      document.getElementById('reportPrint').onclick = () => { window.print(); };
      document.getElementById('reportDownload').onclick = () => {
        const content = '<html><body>' + document.getElementById('reportBody').innerHTML + '</body></html>';
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${w.name.replace(/\s+/g,'_')}.doc`; a.click();
      };
      document.getElementById('reportClose').onclick = () => { modal.classList.add('hidden'); document.body.classList.remove('modal-open'); };
    }
  }

  function renderList(containerId){
    const ids = containerId ? [containerId] : ['workshopsList','workshopList'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      el.innerHTML = workshops.map(w => `
        <div class="panel" style="padding:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <strong>${w.name}</strong>
            <div class="muted small">${w.instructor || ''} • ${formatDateTime(w.start)}</div>
            <div class="muted small">👥 Asistentes: ${(w.attendees||[]).length} | 📝 Notas: ${(w.logs||[]).length}</div>
          </div>
          <div style="display:flex;gap:5px;">
            <button class="btn" onclick="WorkshopModule.exportReport('${w.id}')">Informe</button>
            <button class="btn" onclick="WorkshopModule.assign('${w.id}')">Asignar</button>
            <button class="btn danger" onclick="WorkshopModule.remove('${w.id}')">Eliminar</button>
          </div>
        </div>`).join('');
    });
  }

  let currentAssignId = null;
  function openAssign(id){
    currentAssignId = id;
    renderAssignList();
    const modal = document.getElementById('assignModal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    }
  }

  async function renderAssignList(){
    const el = document.getElementById('assignList');
    if(!el) return;
    
    const ppl = await getPeople(); // Personas async
    
    const w = workshops.find(x=>x.id===currentAssignId);
    const selected = new Set((w?.attendees||[]).map(a=>a.id));
    
    el.innerHTML = ppl.map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:5px;border-bottom:1px solid #f0f0f0;">
        <input type="checkbox" data-id="${p.id}" ${selected.has(p.id)?'checked':''}>
        <div style="flex:1;"><strong>${p.name}</strong><div class="muted small">${p.legajo || ''}</div></div>
      </div>`).join('');
  }

  // --- INICIALIZACIÓN (Async) ---
  async function initUI(){
    console.log("🏫 Cargando talleres...");
    
    // Carga inicial
    workshops = await API.cargar('workshops');
    window.workshops = workshops;

    await ensureDates();
    renderList();
    initCalendar();

    // Listeners UI
    document.getElementById('workshopClose')?.addEventListener('click', closeWorkshopModal);
    document.getElementById('workshopCancel')?.addEventListener('click', closeWorkshopModal);

    window.addEventListener('click', (e) => {
      const workshopModal = document.getElementById('workshopModal');
      const assignModal = document.getElementById('assignModal');
      if (e.target === workshopModal) closeWorkshopModal();
      if (e.target === assignModal) {
        assignModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
      }
    });

    document.getElementById('workshopFormModal')?.addEventListener('submit', saveWorkshopFromForm);
    
    // GUARDAR ASIGNACIÓN CON LOG
    document.getElementById('assignSave')?.addEventListener('click', async () => {
      const checks = document.querySelectorAll('#assignList input:checked');
      const idx = workshops.findIndex(w => w.id === currentAssignId);
      if(idx !== -1) {
        // Guardar estado viejo para el log
        const oldData = JSON.parse(JSON.stringify(workshops[idx]));
        
        workshops[idx].attendees = Array.from(checks).map(c => ({ id: c.dataset.id }));
        
        await save();
        
        if(typeof BacklogService !== 'undefined') BacklogService.log('EDITAR', 'TALLER (ASIGN)', oldData, workshops[idx]);

        document.getElementById('assignModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
        if(!document.getElementById('reportModal').classList.contains('hidden')) exportReport(currentAssignId);
        if (document.getElementById('sideWorkshop')) renderSidePanel(currentAssignId);
      }
    });

    document.getElementById('assignClose')?.addEventListener('click', () => {
      document.getElementById('assignModal')?.classList.add('hidden');
      document.body.classList.remove('modal-open');
    });
    document.getElementById('assignCancel')?.addEventListener('click', () => {
      document.getElementById('assignModal')?.classList.add('hidden');
      document.body.classList.remove('modal-open');
    });

    document.getElementById('btnNewWorkshop')?.addEventListener('click', () => openWorkshopModal());
  }

  // Arranque seguro
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();
  
  return { 
    addLog, removeLog, uploadDoc, removeDoc, downloadDoc,
    exportReport, assign: openAssign, renderAssignList, renderSidePanel, remove, getAll: () => workshops 
  };
})();

window.WorkshopModule = WorkshopModule;