const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/galeria', express.static(path.join(__dirname, 'galeria')));
app.use('/temp_galeria', express.static(path.join(__dirname, 'temp_galeria')));

const ADMIN_USER = "admin"; 
const ADMIN_PASS = "1234";  
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ pedidos: [] }));

const upload = multer({ dest: path.join(__dirname, 'temp_galeria/') });

// --- ROTAS PIX & STATUS ---

app.post('/api/verificar-pix', (req, res) => {
    const { codigo, servico } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const novoId = Date.now().toString();
    
    db.pedidos.push({
        id: novoId,
        data: new Date().toLocaleString('pt-BR'),
        nome: "Aguardando Pix...",
        servico: servico,
        codigo_pix: codigo,
        status: "pendente"
    });
    
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ id: novoId });
});

app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const pedido = db.pedidos.find(p => p.id === req.params.id);
    res.json({ status: pedido ? pedido.status : 'nao_encontrado' });
});

app.post('/api/admin/liberar', (req, res) => {
    const { user, pass, id } = req.body;
    if (user !== ADMIN_USER || pass !== ADMIN_PASS) return res.status(401).send("Negado");
    
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const idx = db.pedidos.findIndex(p => p.id === id);
    if (idx !== -1) {
        db.pedidos[idx].status = "liberado";
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ message: "Liberado" });
    } else { res.status(404).send("Erro"); }
});

// --- ROTAS GERAIS ---

app.post('/orcamento', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const idx = db.pedidos.findIndex(p => p.id === req.body.id_sessao);
    
    if (idx !== -1) {
        db.pedidos[idx].nome = req.body.nome;
        db.pedidos[idx].endereco = req.body.endereco;
        db.pedidos[idx].mensagem = req.body.mensagem;
        db.pedidos[idx].status = "concluido";
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ message: "OK" });
    } else { res.status(400).send("Sessão inválida"); }
});

app.get('/admin/pedidos', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.json(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')).pedidos);
    } else { res.status(401).send("Negado"); }
});

app.listen(3000, () => console.log('🚀 Servidor Rodando na Porta 3000'));
