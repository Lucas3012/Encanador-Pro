const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// DIRETÓRIOS E CAMINHOS
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const CONTATOS_PATH = path.join(DATA_DIR, 'contatos.json');

// Garantir que as pastas existam
[DATA_DIR, UPLOADS, TEMP].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });

// Inicializar arquivos JSON
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
if (!fs.existsSync(CONTATOS_PATH)) fs.writeFileSync(CONTATOS_PATH, JSON.stringify([], null, 2));

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use('/fotos', express.static(UPLOADS));

const limparID = (id) => String(id).replace('#', '').trim();

// ==========================================
//           ROTAS DE DADOS E LEADS
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

app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores.filter(c => c.aprovado));
});

// ==========================================
//           ROTAS ADMINISTRATIVAS
// ==========================================

app.get('/api/admin/contatos', (req, res) => res.json(JSON.parse(fs.readFileSync(CONTATOS_PATH))));

app.post('/api/admin/liberar-por-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const id = limparID(req.body.id_visto);
    const i = db.sessoes.findIndex(s => limparID(s.id_visto) === id);
    if (i !== -1) {
        db.sessoes[i].status = "liberado";
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else res.status(404).json({ error: "ID não encontrado" });
});

// ROTAS DE LIMPEZA (RESSETAR SISTEMA)
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

app.listen(3000, () => console.log("🚀 Servidor Rodando na Porta 3000"));
