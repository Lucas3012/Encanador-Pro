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
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Configuração de Upload
const upload = multer({ dest: path.join(__dirname, 'temp_galeria/') });

// ROTA: Cliente envia foto para moderação
app.post('/api/upload', upload.single('foto'), (req, res) => {
    res.json({ message: "Foto enviada para moderação!" });
});

// ROTA: Listar fotos aprovadas
app.get('/api/fotos', (req, res) => {
    const pasta = path.join(__dirname, 'galeria');
    fs.readdir(pasta, (err, files) => {
        const imagens = (files || []).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        res.json(imagens);
    });
});

// ROTA: Admin lista fotos pendentes
app.get('/api/admin/pendentes', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        fs.readdir(path.join(__dirname, 'temp_galeria'), (err, files) => res.json(files || []));
    } else { res.status(401).send("Negado"); }
});

// ROTA: Admin Aprova/Reprova
app.post('/api/admin/decidir', (req, res) => {
    const { user, pass, foto, acao } = req.body;
    if (user !== ADMIN_USER || pass !== ADMIN_PASS) return res.status(401).send("Negado");

    const caminhoTemp = path.join(__dirname, 'temp_galeria', foto);
    if (acao === 'aprovar') {
        const novoNome = `servico_${Date.now()}.jpg`;
        fs.renameSync(caminhoTemp, path.join(__dirname, 'galeria', novoNome));
    } else {
        if (fs.existsSync(caminhoTemp)) fs.unlinkSync(caminhoTemp);
    }
    res.json({ message: "OK" });
});

// ROTA: Pedidos
app.post('/orcamento', (req, res) => {
    const banco = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    banco.pedidos.push({ id: Date.now(), data: new Date().toLocaleString('pt-BR'), ...req.body });
    fs.writeFileSync(DB_PATH, JSON.stringify(banco, null, 2));
    res.json({ message: "OK" });
});

app.get('/admin/pedidos', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.json(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')).pedidos);
    } else { res.status(401).send("Negado"); }
});

app.listen(3000, () => console.log('🚀 Servidor Online'));
