const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/temp_galeria', express.static('temp_galeria'));

// Configuração de Pastas
const folders = ['uploads', 'temp_galeria', 'data'];
folders.forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });

const DB_PEDIDOS = './data/pedidos.json';
const DB_COLABS = './data/colaboradores.json';
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

// Configuração Multer (Upload de Fotos)
const storage = multer.diskStorage({
    destination: 'temp_galeria/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- ROTAS CLIENTE ---

// Salvar Pedido/Pix
app.post('/api/pedido', (req, res) => {
    let pedidos = fs.existsSync(DB_PEDIDOS) ? JSON.parse(fs.readFileSync(DB_PEDIDOS)) : [];
    const novo = { id: Date.now().toString(), data: new Date().toLocaleString(), status: 'pendente', ...req.body };
    pedidos.push(novo);
    fs.writeFileSync(DB_PEDIDOS, JSON.stringify(pedidos, null, 2));
    res.json({ success: true, id: novo.id });
});

// Enviar Foto para Galeria (Pendente)
app.post('/api/upload-galeria', upload.single('foto'), (req, res) => {
    res.json({ success: true, file: req.file.filename });
});

// Trabalhe Conosco
app.post('/api/colaborador', (req, res) => {
    let colabs = fs.existsSync(DB_COLABS) ? JSON.parse(fs.readFileSync(DB_COLABS)) : [];
    colabs.push({ id: Date.now(), data: new Date().toLocaleDateString(), ...req.body });
    fs.writeFileSync(DB_COLABS, JSON.stringify(colabs, null, 2));
    res.json({ success: true });
});

// Listar Fotos Aprovadas
app.get('/api/galeria', (req, res) => {
    const files = fs.readdirSync('uploads');
    res.json(files);
});

// --- ROTAS ADMIN (Protegidas) ---

const checkAdmin = (req) => (req.query.user === ADMIN_USER || req.body.user === ADMIN_USER) && (req.query.pass === ADMIN_PASS || req.body.pass === ADMIN_PASS);

app.get('/admin/pedidos', (req, res) => {
    if (!checkAdmin(req)) return res.status(401).send("Erro");
    const pedidos = fs.existsSync(DB_PEDIDOS) ? JSON.parse(fs.readFileSync(DB_PEDIDOS)) : [];
    res.json(pedidos);
});

app.get('/api/admin/pendentes', (req, res) => {
    if (!checkAdmin(req)) return res.status(401).send("Erro");
    res.json(fs.readdirSync('temp_galeria'));
});

app.post('/api/admin/decidir', (req, res) => {
    if (!checkAdmin(req)) return res.status(401).send("Erro");
    const { foto, acao } = req.body;
    if (acao === 'aprovar') fs.renameSync(`temp_galeria/${foto}`, `uploads/${foto}`);
    else fs.unlinkSync(`temp_galeria/${foto}`);
    res.json({ success: true });
});

app.get('/api/admin/colaboradores', (req, res) => {
    if (!checkAdmin(req)) return res.status(401).send("Erro");
    const colabs = fs.existsSync(DB_COLABS) ? JSON.parse(fs.readFileSync(DB_COLABS)) : [];
    res.json(colabs);
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
