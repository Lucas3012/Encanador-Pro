const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DE DIRETÓRIOS
const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const CONTATOS_PATH = path.join(DATA_DIR, 'contatos.json');

// Garante que as pastas existam
[UPLOADS, TEMP, DATA_DIR].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });

// Inicializa arquivos se não existirem
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
if (!fs.existsSync(CONTATOS_PATH)) fs.writeFileSync(CONTATOS_PATH, JSON.stringify([], null, 2));

// Multer para Galeria
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use('/fotos', express.static(UPLOADS));
app.use('/temp', express.static(TEMP));

// FUNÇÃO AUXILIAR
const limparID = (id) => String(id).replace('#', '').trim();

// ==========================================
//           ROTAS DO CLIENTE
// ==========================================

// Registrar ID de Pagamento
app.post('/api/registrar-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.sessoes.push({
        id_visto: limparID(req.body.id_visto),
        servico: req.body.servico,
        status: "pendente",
        data: new Date().toISOString()
    });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// Verificar Status da Liberação
app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => limparID(x.id_visto) === limparID(req.params.id));
    res.json({ status: s ? s.status : 'pendente' });
});

// CAPTURAR CONTATO DO CHATBOT (LEADS)
app.post('/api/contato-chatbot', (req, res) => {
    const contatos = JSON.parse(fs.readFileSync(CONTATOS_PATH));
    contatos.push({
        telefone: req.body.telefone,
        data: new Date().toLocaleString('pt-BR'),
        origem: "Chatbot"
    });
    fs.writeFileSync(CONTATOS_PATH, JSON.stringify(contatos, null, 2));
    res.json({ success: true });
});

// Cadastro de Colaborador
app.post('/api/colaborador', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.colaboradores.push({ id: Date.now(), ...req.body, aprovado: false });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// Galeria e Técnicos Aprovados
app.get('/api/galeria', (req, res) => res.json(fs.readdirSync(UPLOADS)));
app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores.filter(c => c.aprovado));
});
app.post('/api/upload-galeria', upload.single('foto'), (req, res) => res.json({ success: true }));

// ==========================================
//           ROTAS DO ADMIN
// ==========================================

app.post('/api/admin/liberar-por-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const id = limparID(req.body.id_visto);
    const i = db.sessoes.findIndex(s => limparID(s.id_visto) === id);
    if (i !== -1) {
        db.sessoes[i].status = "liberado";
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else res.status(404).json({ error: "Não encontrado" });
});

// Listar Leads do Chatbot no Admin
app.get('/api/admin/contatos', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(CONTATOS_PATH)));
});

// Outras rotas (Excluir/Aprovar) permanecem conforme padrão...
app.listen(3000, () => console.log("🚀 Servidor Profissional Ativo na Porta 3000"));
