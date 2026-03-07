const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DE PASTAS
const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'banco.json');

// Criar pastas se não existirem
[UPLOADS, TEMP, DATA_DIR].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });

// Inicializar banco JSON se não existir
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
}

// Configuração do Multer (Upload de fotos)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Servir arquivos estáticos
app.use('/fotos', express.static(UPLOADS));
app.use('/temp', express.static(TEMP));

// ==========================================
//           ROTAS DO CLIENTE
// ==========================================

// Registrar novo pedido (Gera o ID do PIX)
app.post('/api/registrar-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const novaSessao = {
        id_visto: req.body.id_visto,
        servico: req.body.servico,
        status: "pendente",
        data: new Date()
    };
    db.sessoes.push(novaSessao);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// Verificar se o PIX foi liberado
app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => x.id_visto === req.params.id);
    res.json({ status: s ? s.status : 'pendente' });
});

// Enviar foto para a galeria (vai para temp)
app.post('/api/upload-galeria', upload.single('foto'), (req, res) => {
    res.json({ success: true });
});

// Listar fotos aprovadas na galeria
app.get('/api/galeria', (req, res) => {
    res.json(fs.readdirSync(UPLOADS));
});

// Cadastro de Trabalhe Conosco
app.post('/api/colaborador', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.colaboradores.push({ 
        id: Date.now(), 
        ...req.body, 
        aprovado: false 
    });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// Listar colaboradores APROVADOS (Para os Cards no Index)
app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const aprovados = db.colaboradores.filter(c => c.aprovado === true);
    res.json(aprovados);
});

// ==========================================
//           ROTAS DO ADMIN
// ==========================================

// Liberar Cliente (PIX) por ID
app.post('/api/admin/liberar-por-id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const i = db.sessoes.findIndex(s => s.id_visto === req.body.id_visto);
    if (i !== -1) { 
        db.sessoes[i].status = "liberado"; 
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); 
        res.json({ success: true }); 
    } else res.status(404).json({ error: "ID não encontrado" });
});

// Listar fotos pendentes de aprovação
app.get('/api/admin/pendentes', (req, res) => {
    res.json(fs.readdirSync(TEMP));
});

// Decidir sobre foto (Aprovar ou Deletar)
app.post('/api/admin/decidir-foto', (req, res) => {
    const { foto, acao } = req.body;
    const caminhoTemp = path.join(TEMP, foto);
    const caminhoFinal = path.join(UPLOADS, foto);

    if (acao === 'aprovar') {
        fs.renameSync(caminhoTemp, caminhoFinal);
    } else {
        if (fs.existsSync(caminhoTemp)) fs.unlinkSync(caminhoTemp);
    }
    res.json({ success: true });
});

// Listar TODOS os colaboradores (Para o Painel Admin)
app.get('/api/admin/colaboradores', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores);
});

// Decidir sobre Colaborador (Aprovar ou Deletar)
app.post('/api/admin/decidir-colaborador', (req, res) => {
    const { id, acao } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const idx = db.colaboradores.findIndex(c => c.id == id);

    if (idx !== -1) {
        if (acao === 'aprovar') {
            db.colaboradores[idx].aprovado = true;
        } else {
            db.colaboradores.splice(idx, 1);
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } else res.status(404).send();
});

// ROTA DE HISTÓRICO (Lê todas as sessões/pedidos)
app.get('/api/admin/historico', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH));
        // Envia as sessões ordenadas da mais recente para a mais antiga
        const historico = db.sessoes.sort((a, b) => new Date(b.data) - new Date(a.data));
        res.json(historico);
    } catch (e) {
        res.status(500).json([]);
    }
});

// INICIAR SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
    =========================================
       SERVIDOR ENCANADOR PRO ATIVO
       Porta: ${PORT}
       Histórico: Habilitado
       Cards: Habilitado
    =========================================
    `);
});
