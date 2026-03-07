const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO GEMINI AI ---
const genAI = new GoogleGenerativeAI("AIzaSyA87E5vtKYlw2Ow765EIF8463FH_LjZdZc");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- CONFIGURAÇÃO DE DIRETÓRIOS ---
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
//           ROTA DE INTELIGÊNCIA (GEMINI)
// ==========================================

app.post('/api/chat-gemini', async (req, res) => {
    const { mensagem } = req.body;

    try {
        const prompt = `Você é o "Mestre Encanador", assistente inteligente da Encanador Pro em Itabuna-BA.
        REGRAS DE OURO:
        1. Localidade: Você atende Itabuna (Centro, Conceição, Fátima, Santo Antônio, Mangabinha, etc).
        2. Gatilhos: Chegada em 30 a 60 min. Garantia de 90 dias. Aceita PIX e Cartão.
        3. Comportamento: Seja prestativo, dê dicas rápidas (ex: fechar registro se houver vazamento), mas SEMPRE tente conseguir o WhatsApp do cliente para o técnico ligar.
        4. Serviços: Vazamentos, Reparos Hidráulicos e Desentupimentos.
        5. Se o cliente mandar um número de telefone, agradeça e diga que o técnico já foi avisado.
        
        Pergunta do cliente: ${mensagem}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ resposta: response.text() });
    } catch (error) {
        console.error("Erro Gemini:", error);
        res.json({ resposta: "Estou com um probleminha na conexão, mas pode deixar seu WhatsApp aqui que o mestre te liga agora!" });
    }
});

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
    contatos.push({ telefone: req.body.telefone, data: new Date().toLocaleString('pt-BR'), origem: "Chatbot Gemini" });
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
    } else res.status(404).send();
});

// Gestão de Colaboradores
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

// Limpezas de Dados
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

app.listen(3000, () => console.log("🚀 Servidor Inteligente com Gemini Ativo na Porta 3000"));
