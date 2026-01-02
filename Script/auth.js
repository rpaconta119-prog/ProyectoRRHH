// ==========================================
// SISTEMA DE AUTENTICACIÓN (CONECTADO AL SERVIDOR)
// ==========================================

// NOTA: LS_USERS ya no se usa porque los usuarios están en el servidor.
// LS_CURRENT sí se queda en el navegador para recordar quién está logueado.
const LS_CURRENT = 'hr_current_user';

function ensureLogin() {
    const cur = JSON.parse(localStorage.getItem(LS_CURRENT) || 'null');
    
    // Si no hay sesión, mandar al login
    if (!cur) { 
        window.location.href = 'login.html'; 
        return null; 
    }
    
    // Poblar interfaz de usuario (Nombre en el sidebar, etc)
    if (document.getElementById('userArea')) document.getElementById('userArea').textContent = cur.user;
    if (document.getElementById('sideName')) document.getElementById('sideName').textContent = cur.name || cur.user;
    
    return cur;
}

// Logout global (Borra la sesión del navegador)
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem(LS_CURRENT);
    window.location.href = 'login.html';
});

// Manejo de la página de login
function initLoginPage(){
    const loginForm = document.getElementById('loginForm');
    const createForm = document.getElementById('createForm');
    const btnGoCreate = document.getElementById('btnGoCreate');
    const btnBackLogin = document.getElementById('btnBackLogin');

    if (!loginForm) return; // Si no estamos en login.html, salimos

    // Alternar entre Login y Crear Cuenta
    btnGoCreate?.addEventListener('click', ()=>{
      loginForm.classList.add('hidden');
      createForm.classList.remove('hidden');
    });
    btnBackLogin?.addEventListener('click', ()=>{
      createForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });

    // --- 1. LOGIN (AHORA ASÍNCRONO) ---
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value;

      try {
          // CAMBIO: Pedimos la lista al servidor, no al localStorage
          const users = await API.cargar('users'); 
          
          const found = users.find(u => u.user === user && u.pass === pass);
          
          if (!found) return alert('Usuario o contraseña incorrectos.');
          
          // Guardamos la sesión en el navegador (esto está bien que sea local)
          localStorage.setItem(LS_CURRENT, JSON.stringify({user: found.user, name: found.name}));
          
          window.location.href = 'index.html';
      } catch (error) {
          console.error(error);
          alert('Error de conexión con el servidor');
      }
    });

    // --- 2. CREAR CUENTA (AHORA ASÍNCRONO) ---
    createForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('createDisplay').value.trim();
      const user = document.getElementById('createUser').value.trim();
      const pass = document.getElementById('createPass').value;

      if(!user || !pass || !name) return alert('Complete todos los campos.');

      try {
          // CAMBIO: Leemos usuarios del servidor
          const users = await API.cargar('users'); 

          // Validamos si ya existe
          if (users.some(u => u.user === user)) return alert('El usuario ya existe.');

          // Agregamos el nuevo
          users.push({user, pass, name});

          // CAMBIO: Guardamos la lista actualizada en el servidor
          await API.guardar('users', users); 

          // Iniciamos sesión automáticamente
          localStorage.setItem(LS_CURRENT, JSON.stringify({user, name}));
          window.location.href = 'index.html';

      } catch (error) {
          console.error(error);
          alert('Error al crear usuario. Verifica que el servidor esté encendido.');
      }
    });
}

// Inicializar según contexto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ()=>{
    initLoginPage();
    if (!window.location.pathname.endsWith('login.html')) ensureLogin();
  });
} else {
  initLoginPage();
  if (!window.location.pathname.endsWith('login.html')) ensureLogin();
}