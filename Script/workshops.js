// ==========================================
// MÓDULO DE TALLERES (WORKSHOPS) - COMPLETO CON LLEGADA TARDE
// ==========================================

const WorkshopModule = (function(){
  // 1. Variable en memoria
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

    } catch (error) {
        console.error("❌ Error guardando talleres:", error);
    }
  }

  // --- 2. VISOR DE MATRIZ DE ASISTENCIA (MODIFICADO PARA 'T') ---
  async function showAttendanceMatrix(id) {
    const w = workshops.find(x => x.id === id);
    if (!w) return alert('Taller no encontrado');

    const ppl = await getPeople();
    
    // Obtener todas las fechas registradas y ordenarlas
    const dates = Object.keys(w.attendanceLog || {}).sort();
    
    if (dates.length === 0) return alert("Aún no se ha tomado asistencia en ninguna fecha.");

    // Construir Encabezado
    let headHtml = '<tr><th style="z-index:10; background:#f8f9fa; position:sticky; left:0;">Alumno / Fecha</th>';
    dates.forEach(dateStr => {
        const parts = dateStr.split('-');
        const shortDate = `${parts[2]}/${parts[1]}`;
        headHtml += `<th style="text-align:center;">${shortDate}</th>`;
    });
    headHtml += '<th style="text-align:center;">% Asis.</th></tr>';
    document.getElementById('attGridHead').innerHTML = headHtml;

    // Construir Cuerpo
    let bodyHtml = '';
    
    (w.attendees || []).forEach(att => {
        const p = ppl.find(x => x.id === att.id) || { name: 'Desconocido', legajo: '' };
        
        let rowHtml = `<tr>
            <td style="position:sticky; left:0; background:#fff; border-right:1px solid #eee;">
                <div style="font-weight:bold;">${p.name}</div>
                <div style="font-size:10px; color:#888;">${p.legajo || '-'}</div>
            </td>`;
        
        let presentCount = 0;

        dates.forEach(dateStr => {
            const logDia = w.attendanceLog[dateStr];
            let status = 'A'; // Por defecto Ausente

            // COMPATIBILIDAD: Detectar si es el formato viejo (Array) o nuevo (Objeto)
            if (Array.isArray(logDia)) {
                if (logDia.includes(att.id)) status = 'P';
            } else if (typeof logDia === 'object' && logDia !== null) {
                status = logDia[att.id] || 'A';
            }
            
            if (status === 'P') {
                presentCount++;
                rowHtml += `<td class="cell-present" title="Presente">P</td>`;
            } else if (status === 'T' || status === 'L') { // T o L para Late
                presentCount++; // Cuenta como asistencia
                rowHtml += `<td class="cell-late" title="Tarde">T</td>`;
            } else {
                rowHtml += `<td class="cell-absent" title="Ausente">.</td>`;
            }
        });

        // Columna de Porcentaje
        const totalDates = dates.length;
        const percent = totalDates > 0 ? Math.round((presentCount / totalDates) * 100) : 0;
        const color = percent < 60 ? 'red' : 'green';
        
        rowHtml += `<td style="font-weight:bold; color:${color}; text-align:center;">${percent}%</td>`;
        rowHtml += '</tr>';
        
        bodyHtml += rowHtml;
    });

    document.getElementById('attGridBody').innerHTML = bodyHtml;

    // Mostrar Modal
    const modal = document.getElementById('attendanceModal');
    if(modal) {
        document.getElementById('attModalTitle').textContent = w.name;
        document.getElementById('attModalSubtitle').textContent = `Registro de ${dates.length} clases tomadas`;
        
        modal.classList.remove('hidden');
        
        document.getElementById('attClose').onclick = () => {
            modal.classList.add('hidden');
        };
    }
  }

  // --- 3. Fechas / Calendario utilities ---
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
        exportReport(wid);
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

  // --- Panel Lateral (Si existe) ---
  async function renderSidePanel(id){
    const el = document.getElementById('sideWorkshop');
    if(!el) return;
    if(!id){ el.innerHTML = '<p class="muted">Seleccioná un taller para ver sus detalles.</p>'; return; }
    
    const w = workshops.find(x=>x.id===id);
    if(!w) { el.innerHTML = '<p class="muted">Taller no encontrado.</p>'; return; }
    
    const ppl = await getPeople();

    const attendees = (w.attendees||[]).map(a => {
      const p = ppl.find(pp => pp.id === a.id) || {};
      return `<li><strong>${p.name || a.name || '—'}</strong></li>`;
    }).join('') || '<li class="muted">Sin asistentes</li>';

    el.innerHTML = `
      <div class="panel-header">
        <div>
          <h4 style="margin:0">${w.name}</h4>
          <div class="muted small">Instructor: ${w.instructor||'-'}</div>
        </div>
      </div>
      <div class="workshop-side-actions">
        <button class="btn" onclick="WorkshopModule.exportReport('${w.id}')">Abrir Informe</button>
        <button class="btn" onclick="openWorkshopModal('${w.id}')">Editar</button>
      </div>
      <h4>Asistentes (${(w.attendees||[]).length})</h4>
      <ul>${attendees}</ul>
    `;
  }

  // --- 4. GESTIÓN DE ASISTENCIAS (NUEVO SISTEMA P/T/A) ---
  
  // Función global para manejar el click en los botones P/T/A
  window.toggleAttBtn = function(personId, status) {
      // 1. Quitar clases activas del grupo
      const btns = document.querySelectorAll(`.btn-group-${personId} .att-btn`);
      btns.forEach(b => b.classList.remove('active-p', 'active-t', 'active-a'));

      // 2. Activar el presionado visualmente
      const btn = document.getElementById(`btn-${status}-${personId}`);
      if(btn) {
          if (status === 'P') btn.classList.add('active-p');
          if (status === 'T') btn.classList.add('active-t');
          if (status === 'A') btn.classList.add('active-a');
      }
      
      // 3. Actualizar el input oculto (que es lo que lee la función de guardar)
      const input = document.getElementById(`input-att-${personId}`);
      if(input) input.value = status;
  };

  async function saveAttendance(workshopId, dateKey) {
    const w = workshops.find(x => x.id === workshopId);
    if (!w) return;

    if (!w.attendanceLog) w.attendanceLog = {};

    // Preparar objeto del día
    const dayData = {};

    // Leer todos los inputs ocultos de la tabla
    const inputs = document.querySelectorAll('.att-status-input');
    inputs.forEach(inp => {
        const pid = inp.dataset.personId;
        const val = inp.value; // 'P', 'T', 'A'
        dayData[pid] = val;
    });

    // Guardar en la estructura
    w.attendanceLog[dateKey] = dayData;

    await save();
    
    // Refrescar para ver porcentajes actualizados
    exportReport(workshopId);
    alert('✅ Asistencia guardada para el día: ' + dateKey);
  }

  // --- 5. Reporte Detallado CON BOTONERA P/T/A ---
  async function exportReport(id){
    const w = workshops.find(x=>x.id===id);
    if(!w) return alert('Taller no encontrado');
    
    const ppl = await getPeople(); 
    const user = JSON.parse(localStorage.getItem('hr_current_user'))?.user || 'Sistema';
    const generated = new Date().toLocaleString();
    
    const totalDaysRecorded = w.attendanceLog ? Object.keys(w.attendanceLog).length : 0;
    const todayISO = new Date().toISOString().slice(0,10); 

    const getSectorName = (sid) => {
        if(window.sectors) return window.sectors.find(s=>s.id===sid)?.name || sid || '-';
        return sid || '-';
    };

    // GENERAR TABLA DE ASISTENTES CON BOTONES
    const rows = (w.attendees||[]).map((a,i) => {
      const p = ppl.find(pp => pp.id === a.id) || {};
      const sectorName = getSectorName(p.sectorId);
      
      // Calcular % (Tarde cuenta como presente para el %)
      let presentCount = 0;
      let lateCount = 0;
      if (w.attendanceLog) {
         Object.values(w.attendanceLog).forEach(dayVal => {
             // Compatibilidad Array
             if(Array.isArray(dayVal)) {
                 if(dayVal.includes(p.id)) presentCount++;
             } 
             // Nuevo Objeto
             else if(typeof dayVal === 'object' && dayVal !== null) {
                 const status = dayVal[p.id];
                 if(status === 'P') presentCount++;
                 if(status === 'T' || status === 'L') { presentCount++; lateCount++; }
             }
         });
      }
      const percentage = totalDaysRecorded > 0 ? Math.round((presentCount / totalDaysRecorded) * 100) : 0;
      const color = percentage < 50 && totalDaysRecorded > 0 ? 'red' : 'green';

      // ESTADO ACTUAL (HOY)
      let currentStatus = 'A'; // Default Ausente
      if (w.attendanceLog && w.attendanceLog[todayISO]) {
          const logToday = w.attendanceLog[todayISO];
          if(Array.isArray(logToday)) {
              currentStatus = logToday.includes(p.id) ? 'P' : 'A';
          } else if(typeof logToday === 'object') {
              currentStatus = logToday[p.id] || 'A';
          }
      }

      // Clases para marcar el botón activo inicial
      const clsP = currentStatus === 'P' ? 'active-p' : '';
      const clsT = (currentStatus === 'T' || currentStatus === 'L') ? 'active-t' : '';
      const clsA = currentStatus === 'A' ? 'active-a' : '';

      return `
        <tr>
            <td style="text-align:center;">${i+1}</td>
            <td>
                <strong>${p.name || a.name}</strong><br>
                <small class="muted">${sectorName}</small>
            </td>
            <td style="text-align:center;">
                <span style="font-size:14px; font-weight:bold; color:${color}">${presentCount}/${totalDaysRecorded}</span>
                <div style="font-size:10px; color:#666">(${lateCount} Tardes)</div>
            </td>
            <td class="no-print" style="text-align:center;">
                
                <div class="att-btn-group btn-group-${p.id}">
                    <div id="btn-P-${p.id}" class="att-btn ${clsP}" onclick="toggleAttBtn('${p.id}', 'P')" title="Presente">P</div>
                    <div id="btn-T-${p.id}" class="att-btn ${clsT}" onclick="toggleAttBtn('${p.id}', 'T')" title="Tarde">T</div>
                    <div id="btn-A-${p.id}" class="att-btn ${clsA}" onclick="toggleAttBtn('${p.id}', 'A')" title="Ausente">A</div>
                </div>
                
                <input type="hidden" id="input-att-${p.id}" class="att-status-input" data-person-id="${p.id}" value="${currentStatus}">
            </td>
        </tr>`;
    }).join('');

    // HTML DOCUMENTOS Y LOGS (Mantenemos tu lógica original)
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

    // LAYOUT DEL MODAL
    const bodyHtml = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <img src="Assets/LOGO.png" style="height:48px;object-fit:contain;" onerror="this.style.display='none'"/>
        <div>
            <h2 style="margin:0">Gestión: ${w.name}</h2>
            <div style="color:#666;font-size:13px">Instructor: ${w.instructor||'-'}</div>
        </div>
      </div>

      <div class="report-grid-layout">
        
        <div class="report-col">
          
          <div style="background: #eef5ff; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #d0e1f9;">
            <h4 style="margin:0 0 10px 0;">📋 Control de Asistencia</h4>
            
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
              <label>Fecha: <input type="date" id="attendanceDate" value="${todayISO}" onchange="WorkshopModule.exportReport('${w.id}')"></label>
              <button class="btn success small" onclick="WorkshopModule.saveAttendance('${w.id}', document.getElementById('attendanceDate').value)">Guardar</button>
            </div>
            
            <button class="btn" style="width:100%; border:1px solid #ccc; background:white; color:#333;" onclick="WorkshopModule.showMatrix('${w.id}')">Ver Planilla Completa</button>
            <p style="font-size:11px; margin: 5px 0 0; color:#666;">Selecciona la fecha, marca P/T/A y guarda.</p>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4>Nómina de Personal (${(w.attendees||[]).length})</h4>
            <button class="btn small no-print" onclick="WorkshopModule.assign('${w.id}')">Gestionar Personal</button>
          </div>

          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f2f2f2; text-align:left;">
                    <th style="padding:8px; text-align:center;">#</th>
                    <th style="padding:8px;">Personal</th>
                    <th style="padding:8px; text-align:center;">Historial</th>
                    <th style="padding:8px; text-align:center;" class="no-print">Estado Hoy</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="4" style="text-align:center;">Sin asistentes inscritos</td></tr>'}</tbody>
            </table>
          </div>

        </div> 
        
        <div class="report-col">
          <h4>Bitácora y Notas</h4>
          
          <div class="no-print" style="margin-bottom:15px; background:#f0f7ff; padding:10px; border-radius:8px;">
            <textarea id="logInput" placeholder="Nota rápida..." style="width:100%; height:50px; margin-bottom:5px;"></textarea>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label style="font-size:12px;"><input type="checkbox" id="logFeatured"> Importante</label>
              <button class="btn" onclick="WorkshopModule.addLog('${w.id}', document.getElementById('logInput').value, document.getElementById('logFeatured').checked)">Guardar</button>
            </div>
          </div>

          <div style="max-height:300px; overflow-y:auto; margin-bottom:20px;">
            ${logsHtml || '<p class="muted">Sin notas registradas.</p>'}
          </div>

          <h4>Documentos</h4>
          <input type="file" class="no-print" onchange="WorkshopModule.uploadDoc('${w.id}', this.files[0])">
          <div style="margin-top:10px;">${docsHtml || '<p class="muted">Sin documentos.</p>'}</div>
        </div>

      </div>
      
      <p style="color:#666;font-size:11px;margin-top:20px; border-top:1px solid #eee;">Generado por ${user} • ${generated}</p>
    `;

    const modal = document.getElementById('reportModal');
    if (modal) {
      document.getElementById('reportTitle').textContent = `Informe: ${w.name}`;
      document.getElementById('reportBody').innerHTML = bodyHtml;
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
      
      const btnClose = document.getElementById('reportClose');
      if (btnClose) {
          btnClose.onclick = () => { 
              modal.classList.add('hidden'); 
              document.body.classList.remove('modal-open'); 
          };
      }
    }
  }

  // --- 6. Gestión de Bitácora y Docs (Lógica Original) ---
  async function addLog(workshopId, text, isFeatured = false) {
    if (!text || !text.trim()) return alert('Escribe un comentario.');
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
  }

  async function removeLog(workshopId, logId) {
    if(!confirm('¿Eliminar nota?')) return;
    const w = workshops.find(x => x.id === workshopId);
    if (!w) return;
    w.logs = w.logs.filter(l => l.id !== logId);
    await save();
    exportReport(workshopId);
  }

  function uploadDoc(workshopId, file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("El archivo supera 2MB.");
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
    };
    reader.readAsDataURL(file);
  }

  async function removeDoc(workshopId, docId) {
    if (!confirm("¿Eliminar documento?")) return;
    const w = workshops.find(x => x.id === workshopId);
    if (w) {
      w.docs = w.docs.filter(d => d.id !== docId);
      await save();
      exportReport(workshopId);
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

  // --- 7. Listado, Modals y CRUD (Lógica Original) ---
  function renderList(){
      const el = document.getElementById('workshopList');
      if(!el) return;
      
      if(workshops.length === 0) {
          el.innerHTML = '<p class="muted" style="text-align:center; padding:20px; grid-column: 1/-1;">No hay talleres activos.</p>';
          return;
      }

      el.innerHTML = workshops.map(w => `
          <div class="workshop-card">
              <div>
                  <div class="workshop-header">
                      <span class="workshop-title">${w.name}</span>
                      <small style="white-space:nowrap; color:#666;">${w.start ? new Date(w.start).toLocaleDateString() : ''}</small>
                  </div>
                  <div class="workshop-instructor">
                      <i class="fa-solid fa-user-tie"></i> ${w.instructor || 'Sin instructor'}
                  </div>
                  <div class="muted small" style="margin-top:8px; display:flex; gap:15px;">
                      <span><i class="fa-solid fa-users"></i> ${w.attendees?.length||0}</span>
                      <span><i class="fa-solid fa-clipboard"></i> ${w.logs?.length||0}</span>
                  </div>
              </div>
              
              <div class="workshop-actions">
                  <button class="btn" onclick="WorkshopModule.exportReport('${w.id}')">
                    <i class="fa-solid fa-file-lines"></i> Ver Informe
                  </button>
                  <button class="btn" style="background:#f8f9fa; border:1px solid #ccc; color:#333;" onclick="WorkshopModule.assign('${w.id}')">
                    <i class="fa-solid fa-user-plus"></i> Asignar
                  </button>
                  <button class="btn danger" onclick="WorkshopModule.remove('${w.id}')">
                    <i class="fa-solid fa-trash-can"></i> Eliminar
                  </button>
              </div>
          </div>
      `).join('');
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
    const ppl = await getPeople();
    const w = workshops.find(x=>x.id===currentAssignId);
    const selected = new Set((w?.attendees||[]).map(a=>a.id));
    
    el.innerHTML = ppl.map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:5px;border-bottom:1px solid #f0f0f0;">
        <input type="checkbox" data-id="${p.id}" ${selected.has(p.id)?'checked':''}>
        <div style="flex:1;"><strong>${p.name}</strong><div class="muted small">${p.legajo || ''}</div></div>
      </div>`).join('');
  }

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
      docs: idx !== -1 ? workshops[idx].docs : [],
      attendanceLog: idx !== -1 ? workshops[idx].attendanceLog : {}
    };

    if (idx !== -1) { workshops[idx] = Object.assign({}, workshops[idx], data); } 
    else { 
        if (!data.start) data.start = new Date().toISOString();
        if (!data.end) data.end = new Date(Date.parse(data.start) + 60*60*1000).toISOString();
        workshops.unshift(data); 
    }
    
    await save();
    closeWorkshopModal();
  }

  async function remove(id){
    if (!confirm('¿Eliminar este taller?')) return;
    workshops = workshops.filter(w => w.id !== id);
    await save();
  }

  // --- INICIALIZACIÓN ---
  async function initUI(){
    console.log("🏫 Cargando talleres...");
    workshops = await API.cargar('workshops');
    window.workshops = workshops;
    await ensureDates();
    renderList();
    initCalendar();

    // Listeners
    document.getElementById('workshopClose')?.addEventListener('click', closeWorkshopModal);
    document.getElementById('workshopCancel')?.addEventListener('click', closeWorkshopModal);
    document.getElementById('workshopFormModal')?.addEventListener('submit', saveWorkshopFromForm);
    
    document.getElementById('assignSave')?.addEventListener('click', async () => {
      const checks = document.querySelectorAll('#assignList input:checked');
      const idx = workshops.findIndex(w => w.id === currentAssignId);
      if(idx !== -1) {
        workshops[idx].attendees = Array.from(checks).map(c => ({ id: c.dataset.id }));
        await save();
        document.getElementById('assignModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
        if(!document.getElementById('reportModal').classList.contains('hidden')) exportReport(currentAssignId);
      }
    });

    document.getElementById('assignClose')?.addEventListener('click', () => {
      document.getElementById('assignModal')?.classList.add('hidden');
      document.body.classList.remove('modal-open');
    });

    document.getElementById('btnNewWorkshop')?.addEventListener('click', () => openWorkshopModal());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();
  
  return { 
    addLog, removeLog, uploadDoc, removeDoc, downloadDoc,
    exportReport, saveAttendance, assign: openAssign, renderAssignList, renderSidePanel, remove, showMatrix: showAttendanceMatrix, getAll: () => workshops 
  };
})();

window.WorkshopModule = WorkshopModule;