const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// --- CONFIGURAÇÕES ---
app.use(cors());
app.use(express.json());

const ADMIN_USER = "admin"; // Seu usuário
const ADMIN_PASS = "1234";  // Sua senha

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Garante existência do banco
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ pedidos: [] }, null, 2));

// --- ROTAS ---

// 1. Receber orçamento (Público)
app.post('/orcamento', (req, res) => {
    const { nome, servico, mensagem } = req.body;
    if (!nome || !servico) return res.status(400).json({ message: "Dados incompletos." });

    const novoPedido = {
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        nome,
        servico,
        mensagem
    };

    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        const banco = JSON.parse(data);
        banco.pedidos.push(novoPedido);
        fs.writeFile(DB_PATH, JSON.stringify(banco, null, 2), () => {
            console.log(`✅ Pedido de ${nome} salvo!`);
            res.status(200).json({ message: "Sucesso!" });
        });
    });
});

// 2. Listar pedidos (Protegido)
app.get('/admin/pedidos', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        fs.readFile(DB_PATH, 'utf8', (err, data) => {
            res.status(200).json(JSON.parse(data).pedidos);
        });
    } else {
        res.status(401).json({ message: "Não autorizado" });
    }
});

// 3. Excluir pedido (Protegido)
app.delete('/admin/pedidos/:id', (req, res) => {
    const { user, pass } = req.query;
    if (user !== ADMIN_USER || pass !== ADMIN_PASS) return res.status(401).send();

    const id = parseInt(req.params.id);
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        let banco = JSON.parse(data);
        banco.pedidos = banco.pedidos.filter(p => p.id !== id);
        fs.writeFile(DB_PATH, JSON.stringify(banco, null, 2), () => {
            res.status(200).json({ message: "Excluído!" });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
