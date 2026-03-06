const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Configurações
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/galeria', express.static(path.join(__dirname, 'galeria')));

const ADMIN_USER = "admin"; 
const ADMIN_PASS = "1234";  

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ pedidos: [] }, null, 2));

// ROTA: Receber novo orçamento
app.post('/orcamento', (req, res) => {
    const { nome, endereco, servico, mensagem } = req.body;
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        const banco = JSON.parse(data);
        banco.pedidos.push({ id: Date.now(), data: new Date().toLocaleString('pt-BR'), nome, endereco, servico, mensagem });
        fs.writeFile(DB_PATH, JSON.stringify(banco, null, 2), () => res.status(200).json({ message: "OK" }));
    });
});

// ROTA: Listar pedidos (Admin)
app.get('/admin/pedidos', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        fs.readFile(DB_PATH, 'utf8', (err, data) => res.status(200).json(JSON.parse(data).pedidos));
    } else {
        res.status(401).json({ message: "Acesso Negado" });
    }
});

// ROTA: Listar fotos da galeria
app.get('/api/fotos', (req, res) => {
    const pasta = path.join(__dirname, 'galeria');
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta);
    fs.readdir(pasta, (err, files) => {
        if (err) return res.status(500).send("Erro");
        const imagens = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        res.json(imagens);
    });
});

// ROTA: Apagar foto (Admin)
app.delete('/api/fotos/:nome', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        const caminho = path.join(__dirname, 'galeria', req.params.nome);
        if (fs.existsSync(caminho)) {
            fs.unlinkSync(caminho);
            res.json({ message: "Apagado" });
        } else { res.status(404).send("Não encontrado"); }
    } else { res.status(401).send("Negado"); }
});

app.listen(3000, () => console.log('🚀 Servidor Online na Porta 3000'));
