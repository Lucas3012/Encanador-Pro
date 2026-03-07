const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db_vigiado.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [] }));

// Registrar ID de 4 dígitos gerado no site
app.post('/api/registrar-id', (req, res) => {
    const { id_visto, servico } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    db.sessoes = db.sessoes.filter(s => s.id_visto !== id_visto);
    db.sessoes.push({
        id_visto: id_visto,
        servico: servico,
        status: "pendente",
        data: new Date().toLocaleString()
    });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// Cliente verifica se o Admin já liberou
app.get('/api/status/:id_visto', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const sessao = db.sessoes.find(s => s.id_visto === req.params.id_visto);
    res.json({ status: sessao ? sessao.status : 'nao_encontrado' });
});

// Admin libera o formulário digitando os 4 dígitos
app.post('/api/admin/liberar-por-id', (req, res) => {
    const { id_visto } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const index = db.sessoes.findIndex(s => s.id_visto === id_visto);
    if (index !== -1) {
        db.sessoes[index].status = "liberado";
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ message: "Sessão liberada!" });
    } else {
        res.status(404).json({ message: "Código não encontrado." });
    }
});

app.listen(3000, () => console.log("🚀 Servidor rodando na porta 3000"));
