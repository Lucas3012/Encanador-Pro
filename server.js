const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DE DIRETÓRIOS
const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

[UPLOADS, TEMP, DATA_DIR].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
}

// Configuração Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use('/fotos', express.static(UPLOADS));
app.use('/temp', express.static(TEMP));

// --- FUNÇÃO AUXILIAR PARA LIMPAR IDs ---
// Remove o '#' e espaços extras para evitar erros de busca
const limparID = (id) => String(id).replace('#', '').trim();

// ==========================================
//           ROTAS DO CLIENTE
// ==========================================

app.post('/api/registrar-id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH));
        const novaSessao = {
            id_visto: limparID(req.body.id_visto), // Salva SEM o '#'
            servico: req.body.servico,
            status: "pendente",
            data: new Date().toISOString()
        };
        db.sessoes.push(novaSessao);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro ao salvar" }); }
});

app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => limparID(x.id_visto) === limparID(req.params.id));
    res.json({ status: s ? s.status : 'pendente' });
});

// ==========================================
//           ROTAS DO ADMIN
// ==========================================

// LIBERAR CÓDIGO (PIX) - AGORA À PROVA DE ERROS
app.post('/api/admin/liberar-por-id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH));
        const idProcurado = limparID(req.body.id_visto); // Remove '#' se o admin digitar
        
        const i = db.sessoes.findIndex(s => limparID(s.id_visto) === idProcurado);

        if (i !== -1) { 
            db.sessoes[i].status = "liberado"; 
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); 
            console.log(`✅ ID ${idProcurado} LIBERADO!`);
            res.json({ success: true }); 
        } else {
            console.log(`❌ ID ${idProcurado} não encontrado no db.json`);
            res.status(404).json({ error: "ID não encontrado" });
        }
    } catch (e) { res.status(500).send("Erro"); }
});

// APROVAR OU EXCLUIR FOTOS
app.get('/api/admin/pendentes', (req, res) => res.json(fs.readdirSync(TEMP)));
app.post('/api/admin/decidir-foto', (req, res) => {
    const { foto, acao } = req.body;
    const pTemp = path.join(TEMP, foto);
    const pFinal = path.join(UPLOADS, foto);
    if (acao === 'aprovar' && fs.existsSync(pTemp)) fs.renameSync(pTemp, pFinal);
    else if (fs.existsSync(pTemp)) fs.unlinkSync(pTemp);
    res.json({ success: true });
});

// APROVAR OU EXCLUIR COLABORADORES
app.get('/api/admin/colaboradores', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores);
});
app.post('/api/admin/decidir-colaborador', (req, res) => {
    const { id, acao } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const idx = db.colaboradores.findIndex(c => c.id == id);
    if (idx !== -1) {
        if (acao === 'aprovar') db.colaboradores[idx].aprovado = true;
        else db.colaboradores.splice(idx, 1);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else res.status(404).send();
});

// HISTÓRICO
app.get('/api/admin/historico', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.sessoes.sort((a,b) => new Date(b.data) - new Date(a.data)));
});

// Outras rotas de galeria/cadastro...
app.post('/api/upload-galeria', upload.single('foto'), (req, res) => res.json({ success: true }));
app.get('/api/galeria', (req, res) => res.json(fs.readdirSync(UPLOADS)));
app.post('/api/colaborador', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.colaboradores.push({ id: Date.now(), ...req.body, aprovado: false });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});
app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores.filter(c => c.aprovado));
});

app.listen(3000, () => console.log("🚀 Servidor Rodando (Porta 3000)"));
