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

// ROTA: Cliente envia foto
app.post('/api/upload', upload.single('foto'), (req, res) => {
    res.json({ message: "Foto em moderação!" });
});

// ROTA: Listar fotos oficiais
app.get('/api/fotos', (req, res) => {
    const pasta = path.join(__dirname, 'galeria');
    fs.readdir(pasta, (err, files) => {
        const imagens = (files || []).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        res.json(imagens);
    });
});

// ROTA: Admin decide (Aprovar/Reprovar)
app.post('/api/admin/decidir', (req, res) => {
    const { user, pass, foto, acao } = req.body;
    if (user !== ADMIN_USER || pass !== ADMIN_PASS) return res.status(401).send("Negado");
    const camTemp = path.join(__dirname, 'temp_galeria', foto);
    if (acao === 'aprovar') {
        fs.renameSync(camTemp, path.join(__dirname, 'galeria', `aprovada_${Date.now()}.jpg`));
    } else { if (fs.existsSync(camTemp)) fs.unlinkSync(camTemp); }
    res.json({ message: "OK" });
});

// ROTA: Admin ver pendentes
app.get('/api/admin/pendentes', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        fs.readdir(path.join(__dirname, 'temp_galeria'), (err, files) => res.json(files || []));
    } else { res.status(401).send("Negado"); }
});

// ROTA: Pedidos
app.post('/orcamento', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    data.pedidos.push({ id: Date.now(), data: new Date().toLocaleString('pt-BR'), ...req.body });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    res.json({ message: "OK" });
});

app.get('/admin/pedidos', (req, res) => {
    const { user, pass } = req.query;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.json(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')).pedidos);
    } else { res.status(401).send("Negado"); }
});

app.listen(3000, () => console.log('🚀 Servidor Online na 3000'));
