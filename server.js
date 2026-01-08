const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3080;

app.use(cors());
// Aumentamos el límite de tamaño para recibir datos grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DB_PATH = path.join(__dirname, 'db');

app.use(express.static(__dirname));

// Opcional: Para que al entrar a la IP sola, te mande al login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
// --- HELPER: GUARDAR ---
const guardarDatos = (archivo, datos, res) => {
    const filePath = path.join(DB_PATH, archivo);
    fs.writeFile(filePath, JSON.stringify(datos, null, 2), (err) => {
        if (err) {
            console.error(`Error guardando ${archivo}:`, err);
            return res.status(500).json({ error: 'Error al guardar datos' });
        }
        res.json({ message: 'Guardado correctamente', success: true });
    });
};

// --- HELPER: LEER ---
const leerDatos = (archivo, res) => {
    const filePath = path.join(DB_PATH, archivo);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            // Si el archivo no existe, devolvemos array vacío para no romper nada
            console.log(`Archivo ${archivo} no encontrado, devolviendo []`);
            return res.json([]); 
        }
        try {
            // Si el archivo está vacío (0 bytes), devolvemos array vacío
            if (!data) return res.json([]);
            res.json(JSON.parse(data));
        } catch (e) {
            console.error(`Error leyendo ${archivo}:`, e);
            res.status(500).send('Error formato JSON inválido');
        }
    });
};

// --- TUS RUTAS NUEVAS (ENDPOINTS) ---

// 1. USUARIOS (hr_users_v1.json)
app.get('/api/users', (req, res) => leerDatos('hr_users_v1.json', res));
app.post('/api/users', (req, res) => guardarDatos('hr_users_v1.json', req.body, res));

// 2. PERSONAL / PEOPLE (hr_people_v1.json)
app.get('/api/people', (req, res) => leerDatos('hr_people_v1.json', res));
app.post('/api/people', (req, res) => guardarDatos('hr_people_v1.json', req.body, res));

// 3. TALLERES / WORKSHOPS (hr_workshops_v1.json)
app.get('/api/workshops', (req, res) => leerDatos('hr_workshops_v1.json', res));
app.post('/api/workshops', (req, res) => guardarDatos('hr_workshops_v1.json', req.body, res));

// 4. SECTORES (hr_sectors_v1.json)
app.get('/api/sectors', (req, res) => leerDatos('hr_sectors_v1.json', res));
app.post('/api/sectors', (req, res) => guardarDatos('hr_sectors_v1.json', req.body, res));

// 5. BACKLOG / HISTORIAL (hr_backlog_v1.json)
app.get('/api/backlog', (req, res) => leerDatos('hr_backlog_v1.json', res));
app.post('/api/backlog', (req, res) => guardarDatos('hr_backlog_v1.json', req.body, res));

// 6. EVENTOS (hr_events_v1.json)
app.get('/api/events', (req, res) => leerDatos('hr_events_v1.json', res));
app.post('/api/events', (req, res) => guardarDatos('hr_events_v1.json', req.body, res));

// 7. Vacaciones (hr_leaves_v1.json) - Rutas comentadas para futura implementación
app.get('/api/leaves', (req, res) => leerDatos('hr_leaves_v1.json', res));
app.post('/api/leaves', (req, res) => guardarDatos('hr_leaves_v1.json', req.body, res));

// 8. Aspirantes 
app.get('/api/applicants', (req, res) => leerDatos('hr_applicant_v1.json', res));
app.post('/api/applicants', (req, res) => guardarDatos('hr_applicant_v1.json', req.body, res));

// 9. DOCUMENTACIÓN (hr_documents_v1.json)
app.get('/api/documents', (req, res) => leerDatos('hr_documents_v1.json', res));
app.post('/api/documents', (req, res) => guardarDatos('hr_documents_v1.json', req.body, res));

app.get('/api/projects', (req, res) => leerDatos('hr_projects_v1.json', res));
app.post('/api/projects', (req, res) => guardarDatos('hr_projects_v1.json', req.body, res));

// INICIO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`SERVIDOR RRHH ACTIVO EN: http://localhost:${PORT}`);
    console.log(`Rutas disponibles:`);
    console.log(` - /api/users`);
    console.log(` - /api/people`);
    console.log(` - /api/workshops`);
    console.log(` - /api/sectors`);
    console.log(` - /api/backlog`);
    console.log(` - /api/events`);
    console.log(` - /api/leaves`);
    console.log(`--------------------------------------------------`);
});