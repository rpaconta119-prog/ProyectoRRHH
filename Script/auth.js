const LS_USERS = 'hr_users_v1';
const LS_CURRENT = 'hr_current_user';

function ensureLogin() {
    const cur = JSON.parse(localStorage.getItem(LS_CURRENT) || 'null');
    if (!cur) { window.location.href = 'login.html'; return null; }
    
    // Poblar interfaz de usuario
    if (document.getElementById('userArea')) document.getElementById('userArea').textContent = cur.user;
    if (document.getElementById('sideName')) document.getElementById('sideName').textContent = cur.name || cur.user;
    return cur;
}

// Logout global
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem(LS_CURRENT);
    window.location.href = 'login.html';
});

// Manejo de la página de login (si está presente)
function initLoginPage(){
    const loginForm = document.getElementById('loginForm');
    const createForm = document.getElementById('createForm');
    const btnGoCreate = document.getElementById('btnGoCreate');
    const btnBackLogin = document.getElementById('btnBackLogin');

    if (!loginForm) return; // no estamos en la página de login

    btnGoCreate?.addEventListener('click', ()=>{
      loginForm.classList.add('hidden');
      createForm.classList.remove('hidden');
    });
    btnBackLogin?.addEventListener('click', ()=>{
      createForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });

    loginForm.addEventListener('submit', e=>{
      e.preventDefault();
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value;
      const users = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
      const found = users.find(u => u.user === user && u.pass === pass);
      if (!found) return alert('Usuario/contraseña incorrectos (o crear cuenta).');
      localStorage.setItem(LS_CURRENT, JSON.stringify({user: found.user, name: found.name}));
      location.href = 'index.html';
    });

    createForm?.addEventListener('submit', e=>{
      e.preventDefault();
      const name = document.getElementById('createDisplay').value.trim();
      const user = document.getElementById('createUser').value.trim();
      const pass = document.getElementById('createPass').value;
      if(!user || !pass || !name) return alert('Complete los campos.');
      const users = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
      if (users.some(u=>u.user===user)) return alert('Usuario ya existe.');
      users.push({user, pass, name});
      localStorage.setItem(LS_USERS, JSON.stringify(users));
      localStorage.setItem(LS_CURRENT, JSON.stringify({user, name}));
      location.href = 'index.html';
    });
}

// Inicializar según contexto de la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ()=>{
    initLoginPage();
    if (!window.location.pathname.endsWith('login.html')) ensureLogin();
  });
} else {
  initLoginPage();
  if (!window.location.pathname.endsWith('login.html')) ensureLogin();
}