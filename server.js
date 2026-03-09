const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// --- CONFIGURAÇÃO DE SEGURANÇA E BYPASS CLOUDFLARE ---
app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, bypass-tunnel-reminder");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.json());

// --- BANCO DE DADOS (db.json) ---
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ 
        sessoes: [],         // Para Histórico e Admin (PIX)
        colaboradores: [],   // Para Index e Trabalhe Conosco
        galeria: [],         // Para Galeria de Fotos
        candidatos: []       // Para Receber currículos do Trabalhe Conosco
    }, null, 2));
}

// --- HELPER: LER/ESCREVER DB ---
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// ==========================================
// 1. ROTAS PARA INDEX.HTML (Técnicos e Início)
// ==========================================
app.get('/api/aprovados', (req, res) => {
    const db = readDB();
    res.json(db.colaboradores.filter(c => c.aprovado) || []);
});

app.post('/api/registrar-id', (req, res) => {
    const db = readDB();
    const novaSessao = {
        id_visto: req.body.id_visto,
        servico: req.body.servico || "Geral",
        status: "pendente",
        data: new Date()
    };
    db.sessoes.push(novaSessao);
    writeDB(db);
    res.json({ success: true });
});

app.get('/api/status/:id', (req, res) => {
    const db = readDB();
    const s = db.sessoes.find(x => x.id_visto == req.params.id);
    res.json({ status: s ? s.status : 'pendente' });
});

// ==========================================
// 2. ROTAS PARA HISTORICO.HTML
// ==========================================
app.get('/api/sessoes-full', (req, res) => {
    const db = readDB();
    res.json(db.sessoes || []);
});

// ==========================================
// 3. ROTAS PARA ADMIN.HTML (Gerenciamento)
// ==========================================
app.get('/api/admin/painel', (req, res) => {
    const db = readDB();
    res.json({
        sessoes: db.sessoes,
        candidatos: db.candidatos,
        colaboradores: db.colaboradores
    });
});

app.post('/api/liberar-pix', (req, res) => {
    const db = readDB();
    const { id_visto } = req.body;
    const s = db.sessoes.find(x => x.id_visto == id_visto);
    if(s) { s.status = "liberado"; writeDB(db); res.json({success: true}); }
    else { res.status(404).json({success: false}); }
});

// ==========================================
// 4. ROTAS PARA GALERIA.HTML
// ==========================================
app.get('/api/galeria', (req, res) => {
    const db = readDB();
    res.json(db.galeria || []);
});

app.post('/api/galeria/postar', (req, res) => {
    const db = readDB();
    db.galeria.push({ url: req.body.url, legenda: req.body.legenda, data: new Date() });
    writeDB(db);
    res.json({ success: true });
});

// ==========================================
// 5. ROTAS PARA TRABALHE-CONOSCO.HTML
// ==========================================
app.post('/api/trabalhe/enviar', (req, res) => {
    const db = readDB();
    const novoCandidato = {
        nome: req.body.nome,
        telefone: req.body.telefone,
        especialidade: req.body.especialidade,
        data: new Date(),
        status: "em_analise"
    };
    db.candidatos.push(novoCandidato);
    writeDB(db);
    res.json({ success: true, message: "Currículo enviado com sucesso!" });
});

// --- INICIALIZAÇÃO ---
app.listen(3000, () => {
    console.log("-----------------------------------------");
    console.log("🚀 ECOSSISTEMA ENCANADOR PRO - FULL ONLINE");
    console.log("-----------------------------------------");
});
