const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DE DIRETÓRIOS
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const CONTATOS_PATH = path.join(DATA_DIR, 'contatos.json');

[DATA_DIR, UPLOADS, TEMP].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });

if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
if (!fs.existsSync(CONTATOS_PATH)) fs.writeFileSync(CONTATOS_PATH, JSON.stringify([], null, 2));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use('/fotos', express.static(UPLOADS));
app.use('/temp', express.static(TEMP));

const limparID = (id) => String(id).replace('#', '').trim();

// ==========================================
//           ROTAS PÚBLICAS (CLIENTE)
// ==========================================

app.post('/api/registrar-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.sessoes.push({ id_visto: limparID(req.body.id_visto), servico: req.body.servico, status: "pendente", data: new Date() });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => limparID(x.id_visto) === limparID(req.params.id));
    res.json({ status: s ? s.status : 'pendente' });
});

app.post('/api/contato-chatbot', (req, res) => {
    const contatos = JSON.parse(fs.readFileSync(CONTATOS_PATH));
    contatos.push({ telefone: req.body.telefone, data: new Date().toLocaleString('pt-BR') });
    fs.writeFileSync(CONTATOS_PATH, JSON.stringify(contatos, null, 2));
    res.json({ success: true });
});

app.get('/api/galeria', (req, res) => res.json(fs.readdirSync(UPLOADS)));

app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores.filter(c => c.aprovado));
});

app.post('/api/upload-galeria', upload.single('foto'), (req, res) => res.json({ success: true }));

app.post('/api/colaborador', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.colaboradores.push({ id: Date.now(), ...req.body, aprovado: false });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// ==========================================
//           ROTAS ADMINISTRATIVAS
// ==========================================

// Leads e IDs
app.get('/api/admin/contatos', (req, res) => res.json(JSON.parse(fs.readFileSync(CONTATOS_PATH))));

app.post('/api/admin/liberar-por-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const id = limparID(req.body.id_visto);
    const i = db.sessoes.findIndex(s => limparID(s.id_visto) === id);
    if (i !== -1) {
        db.sessoes[i].status = "liberado";
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else res.status(404).json({ error: "Erro" });
});

// Gestão de Técnicos
app.get('/api/admin/listar-colabs', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores);
});

app.post('/api/admin/aprovar-colab', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const i = db.colaboradores.findIndex(c => c.id == req.body.id);
    if(i !== -1) db.colaboradores[i].aprovado = true;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.post('/api/admin/excluir-colab', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.colaboradores = db.colaboradores.filter(c => c.id != req.body.id);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// Gestão de Fotos
app.get('/api/admin/temp-fotos', (req, res) => res.json(fs.readdirSync(TEMP)));

app.post('/api/admin/aprovar-foto', (req, res) => {
    const foto = req.body.nome;
    fs.renameSync(path.join(TEMP, foto), path.join(UPLOADS, foto));
    res.json({ success: true });
});

app.post('/api/admin/excluir-foto', (req, res) => {
    const { nome, pasta } = req.body;
    const alvo = pasta === 'temp' ? TEMP : UPLOADS;
    if (fs.existsSync(path.join(alvo, nome))) fs.unlinkSync(path.join(alvo, nome));
    res.json({ success: true });
});

// Limpezas
app.post('/api/admin/limpar-sessoes', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.sessoes = [];
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.post('/api/admin/limpar-leads', (req, res) => {
    fs.writeFileSync(CONTATOS_PATH, JSON.stringify([], null, 2));
    res.json({ success: true });
});

app.listen(3000, () => console.log("🚀 Servidor Full Power na Porta 3000"));
