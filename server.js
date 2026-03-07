const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CONFIGURAÇÃO DE SEGURANÇA (CORS TOTAL) ---
app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, bypass-tunnel-reminder");
    next();
});
app.use(express.json());

// --- CONFIGURAÇÃO GEMINI AI ---
const genAI = new GoogleGenerativeAI("AIzaSyA87E5vtKYlw2Ow765EIF8463FH_LjZdZc");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- DIRETÓRIOS ---
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const CONTATOS_PATH = path.join(DATA_DIR, 'contatos.json');

[DATA_DIR, UPLOADS, TEMP].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
if (!fs.existsSync(CONTATOS_PATH)) fs.writeFileSync(CONTATOS_PATH, JSON.stringify([], null, 2));

const upload = multer({ dest: TEMP });

app.use('/fotos', express.static(UPLOADS));
app.use('/temp', express.static(TEMP));

// ==========================================
//           ROTA GEMINI (INTELIGÊNCIA)
// ==========================================
app.post('/api/chat-gemini', async (req, res) => {
    const { mensagem } = req.body;
    try {
        const prompt = `Você é o "Mestre Encanador", assistente da Encanador Pro em Itabuna-BA.
        - Localidade: Itabuna (Centro, Fátima, etc).
        - Gatilhos: Chegada 30-60 min. Garantia 90 dias. Aceita PIX/Cartão.
        - Objetivo: Tirar dúvidas e SEMPRE pedir o WhatsApp para o técnico ligar.
        Pergunta: ${mensagem}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ resposta: response.text() });
    } catch (error) {
        res.status(500).json({ resposta: "Erro na conexão com a IA." });
    }
});

// ==========================================
//           ROTAS DE DADOS E LEADS
// ==========================================
app.post('/api/registrar-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.sessoes.push({ id_visto: String(req.body.id_visto).replace('#',''), servico: req.body.servico, status: "pendente", data: new Date() });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => x.id_visto == req.params.id);
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
//           ROTAS ADMIN
// ==========================================
app.get('/api/admin/contatos', (req, res) => res.json(JSON.parse(fs.readFileSync(CONTATOS_PATH))));

app.post('/api/admin/liberar-por-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const i = db.sessoes.findIndex(s => s.id_visto == req.body.id_visto);
    if (i !== -1) {
        db.sessoes[i].status = "liberado";
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else res.status(404).send();
});

app.listen(3000, () => console.log("🚀 Servidor Online na Porta 3000"));
