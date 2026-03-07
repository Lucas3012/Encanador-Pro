const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'banco.json');

[UPLOADS, TEMP, DATA_DIR].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use('/fotos', express.static(UPLOADS));
app.use('/temp', express.static(TEMP));

// --- ROTAS CLIENTE ---
app.post('/api/registrar-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.sessoes = db.sessoes.filter(s => s.id_visto !== req.body.id_visto);
    db.sessoes.push({ ...req.body, status: "pendente", data: new Date() });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => x.id_visto === req.params.id);
    res.json({ status: s ? s.status : 'pendente' });
});

app.post('/api/upload-galeria', upload.single('foto'), (req, res) => res.json({ success: true }));
app.get('/api/galeria', (req, res) => res.json(fs.readdirSync(UPLOADS)));

app.post('/api/colaborador', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.colaboradores.push({ id: Date.now(), ...req.body, aprovado: false });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// Listar aprovados para o MAPA
app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores.filter(c => c.aprovado === true));
});

// --- ROTAS ADMIN ---
app.post('/api/admin/liberar-por-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const i = db.sessoes.findIndex(s => s.id_visto === req.body.id_visto);
    if (i !== -1) { db.sessoes[i].status = "liberado"; fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); res.json({ success: true }); }
    else res.status(404).send();
});

app.get('/api/admin/pendentes', (req, res) => res.json(fs.readdirSync(TEMP)));

app.post('/api/admin/decidir-foto', (req, res) => {
    const { foto, acao } = req.body;
    if (acao === 'aprovar') fs.renameSync(path.join(TEMP, foto), path.join(UPLOADS, foto));
    else fs.unlinkSync(path.join(TEMP, foto));
    res.json({ success: true });
});

app.get('/api/admin/colaboradores', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores);
});

app.post('/api/admin/decidir-colaborador', (req, res) => {
    const { id, acao } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const idx = db.colaboradores.findIndex(c => c.id == id);
    if (idx !== -1) {
        if (acao === 'aprovar') db.colaboradores[idx].aprovado = true;
        else db.colaboradores.splice(idx, 1);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else res.status(404).send();
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
