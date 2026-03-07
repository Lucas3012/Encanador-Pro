const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- CONFIGURAÇÃO DE SEGURANÇA (CORS PARA GITHUB) ---
app.use(cors());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, bypass-tunnel-reminder");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(express.json());

// --- CONFIGURAÇÃO GEMINI AI ---
const genAI = new GoogleGenerativeAI("AIzaSyA87E5vtKYlw2Ow765EIF8463FH_LjZdZc");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- BANCO DE DADOS EM ARQUIVO ---
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const LEADS_PATH = path.join(DATA_DIR, 'contatos.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
if (!fs.existsSync(LEADS_PATH)) fs.writeFileSync(LEADS_PATH, JSON.stringify([], null, 2));

// --- ROTA DA INTELIGÊNCIA ARTIFICIAL ---
app.post('/api/chat-gemini', async (req, res) => {
    try {
        const { mensagem } = req.body;
        const prompt = `Você é o "Mestre Encanador", assistente da Encanador Pro em Itabuna-BA.
        - Regras: Atendimento em Itabuna (Centro, Fátima, etc). Chegada em 30-60 min. Garantia de 90 dias.
        - Estilo: Seja muito prestativo e educado. Se for vazamento, recomende fechar o registro geral.
        - Objetivo: Sempre tente pegar o WhatsApp do cliente para o técnico ligar.
        Pergunta do cliente: ${mensagem}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ resposta: response.text() });
    } catch (error) {
        console.error("Erro Gemini:", error);
        res.status(500).json({ resposta: "Estou com muita demanda agora! Deixe seu WhatsApp que o mestre te chama." });
    }
});

// --- ROTAS DE DADOS ---
app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores.filter(c => c.aprovado));
});

app.post('/api/contato-chatbot', (req, res) => {
    const leads = JSON.parse(fs.readFileSync(LEADS_PATH));
    leads.push({ telefone: req.body.telefone, data: new Date().toLocaleString('pt-BR') });
    fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
    res.json({ success: true });
});

app.post('/api/registrar-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.sessoes.push({ id_visto: req.body.id_visto, servico: req.body.servico, status: "pendente" });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => x.id_visto == req.params.id);
    res.json({ status: s ? s.status : 'pendente' });
});

app.listen(3000, () => console.log("🚀 Servidor Mestre Online na Porta 3000"));
