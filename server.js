const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Faz o servidor entregar os arquivos HTML que estão na mesma pasta
app.use(express.static(__dirname));

const ADMIN_USER = "admin"; 
const ADMIN_PASS = "1234";  

// Caminho dos dados na raiz
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ pedidos: [] }, null, 2));

app.post('/orcamento', (req, res) => {
    const { nome, endereco, servico, mensagem } = req.body;
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        const banco = JSON.parse(data);
        banco.pedidos.push({ id: Date.now(), data: new Date().toLocaleString('pt-BR'), nome, endereco, servico, mensagem });
        fs.writeFile(DB_PATH, JSON.stringify(banco, null, 2), () => res.status(200).json({ message: "OK" }));
    });
});

app.get('/admin/pedidos', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        fs.readFile(DB_PATH, 'utf8', (err, data) => {
            res.status(200).json(JSON.parse(data).pedidos);
        });
    } else {
        res.status(401).json({ message: "Negado" });
    }
});

app.listen(3000, () => console.log('🚀 Servidor na porta 3000'));
