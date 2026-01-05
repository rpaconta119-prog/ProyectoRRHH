// ==========================================
// SISTEMA DE AUTENTICACIÓN (ACTUALIZADO CON VALIDACIÓN)
// ==========================================

const LS_CURRENT = 'hr_current_user';

function ensureLogin() {
    const cur = JSON.parse(localStorage.getItem(LS_CURRENT) || 'null');
    if (!cur) { 
        window.location.href = 'login.html'; 
        return null; 
    }
    // Poblar interfaz
    if (document.getElementById('userArea')) document.getElementById('userArea').textContent = cur.user;
    if (document.getElementById('sideName')) document.getElementById('sideName').textContent = cur.name || cur.user;
    return cur;
}

// Logout global
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem(LS_CURRENT);
    window.location.href = 'login.html';
});

function initLoginPage(){
    const loginForm = document.getElementById('loginForm');
    const createForm = document.getElementById('createForm');
    const btnGoCreate = document.getElementById('btnGoCreate');
    const btnBackLogin = document.getElementById('btnBackLogin');

    if (!loginForm) return; 

    btnGoCreate?.addEventListener('click', ()=>{
      loginForm.classList.add('hidden');
      createForm.classList.remove('hidden');
    });
    btnBackLogin?.addEventListener('click', ()=>{
      createForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });

    // --- 1. LOGIN ---
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value;

      try {
          const users = await API.cargar('users'); 
          const found = users.find(u => u.user === user && u.pass === pass);
          
          if (!found) return alert('Usuario o contraseña incorrectos.');
          
          // NUEVA VALIDACIÓN DE SEGURIDAD
          if (found.validated !== true) {
             return alert('Tu cuenta ha sido creada pero aún no ha sido aprobada por un administrador.');
          }

          // Guardamos sesión (incluyendo el rol para saber si puede ver el gestor)
          localStorage.setItem(LS_CURRENT, JSON.stringify({
              user: found.user, 
              name: found.name,
              role: found.role || 'user' // Guardamos el rol
          }));
          
          window.location.href = 'index.html';
      } catch (error) {
          console.error(error);
          alert('Error de conexión con el servidor');
      }
    });

    // --- 2. CREAR CUENTA ---
    createForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('createDisplay').value.trim();
      const user = document.getElementById('createUser').value.trim();
      const pass = document.getElementById('createPass').value;

      if(!user || !pass || !name) return alert('Complete todos los campos.');

      try {
          const users = await API.cargar('users'); 

          if (users.some(u => u.user === user)) return alert('El usuario ya existe.');

          // NUEVO: Agregamos 'validated: false' y 'role: user'
          users.push({
              user, 
              pass, 
              name,
              validated: false, // Por defecto nadie entra hasta que el admin quiera
              role: 'user'
          });

          await API.guardar('users', users); 

          alert('Cuenta solicitada con éxito. Por favor, espera a que un administrador valide tu acceso.');
          
          // Volvemos al login, no lo dejamos entrar directo
          createForm.classList.add('hidden');
          loginForm.classList.remove('hidden');

      } catch (error) {
          console.error(error);
          alert('Error al crear usuario. Verifica el servidor.');
      }
    });
}

// Inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ()=>{
    initLoginPage();
    if (!window.location.pathname.endsWith('login.html')) ensureLogin();
  });
} else {
  initLoginPage();
  if (!window.location.pathname.endsWith('login.html')) ensureLogin();
}

function ensureLogin() {
    const cur = JSON.parse(localStorage.getItem(LS_CURRENT) || 'null');
    
    // Si no hay sesión, mandar al login
    if (!cur) { 
        window.location.href = 'login.html'; 
        return null; 
    }
    
    // --- LÓGICA DE UI DEL USUARIO ---
    
    // 1. Poner nombres
    if (document.getElementById('userArea')) document.getElementById('userArea').textContent = cur.user;
    if (document.getElementById('sideName')) document.getElementById('sideName').textContent = cur.name || cur.user;
    
    // 2. Poner Rol en el sidebar
    if (document.getElementById('sideRole')) {
        // Convertimos 'admin' a 'Administrador' para que se vea bonito
        const roleDisplay = (cur.role === 'admin') ? 'Administrador' : 'Usuario';
        document.getElementById('sideRole').textContent = roleDisplay;
    }

    // 3. MOSTRAR/OCULTAR GESTOR DE CUENTAS
    const navGestor = document.getElementById('nav-gestor');
    if (navGestor) {
        if (cur.role === 'admin') {
            navGestor.style.display = 'block'; // O 'flex' según tu CSS
        } else {
            navGestor.style.display = 'none';
        }
    }
    
    return cur;
}

// ... (El resto del código de login/logout y createForm se mantiene igual al paso anterior) ...
// Logout global
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem(LS_CURRENT);
    window.location.href = 'login.html';
});

// (Aquí sigue la función initLoginPage igual que antes)