const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO DE DIRETÓRIOS E BANCO
const UPLOADS = path.join(__dirname, 'uploads');
const TEMP = path.join(__dirname, 'temp_galeria');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Garante que as pastas existam
[UPLOADS, TEMP, DATA_DIR].forEach(f => { if (!fs.existsSync(f)) fs.mkdirSync(f); });

// Inicializa o banco db.json se estiver vazio ou não existir
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ sessoes: [], colaboradores: [] }, null, 2));
}

// Configuração de Upload de Imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Servir arquivos estáticos (fotos)
app.use('/fotos', express.static(UPLOADS));
app.use('/temp', express.static(TEMP));

// ==========================================
//           ROTAS DO CLIENTE
// ==========================================

// 1. Registrar pedido e gerar ID (PIX)
app.post('/api/registrar-id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH));
        const novaSessao = {
            id_visto: String(req.body.id_visto).trim(),
            servico: req.body.servico,
            status: "pendente",
            data: new Date().toISOString()
        };
        db.sessoes.push(novaSessao);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro ao salvar pedido" }); }
});

// 2. Cliente verifica se o mestre já liberou o acesso
app.get('/api/status/:id', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const s = db.sessoes.find(x => String(x.id_visto) === String(req.params.id));
    res.json({ status: s ? s.status : 'pendente' });
});

// 3. Enviar foto para a galeria (vai para pasta temp)
app.post('/api/upload-galeria', upload.single('foto'), (req, res) => {
    res.json({ success: true });
});

// 4. Listar fotos que já foram aprovadas
app.get('/api/galeria', (req, res) => {
    res.json(fs.readdirSync(UPLOADS));
});

// 5. Cadastro de novo colaborador (Trabalhe Conosco)
app.post('/api/colaborador', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.colaboradores.push({ id: Date.now(), ...req.body, aprovado: false });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// 6. Listar colaboradores aprovados (Para os Cards da Home)
app.get('/api/aprovados', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores.filter(c => c.aprovado === true));
});

// ==========================================
//           ROTAS DO PAINEL ADMIN
// ==========================================

// 7. LIBERAR CÓDIGO (PIX) - Ajustado para db.json
app.post('/api/admin/liberar-por-id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH));
        const idProcurado = String(req.body.id_visto).trim();
        const i = db.sessoes.findIndex(s => String(s.id_visto) === idProcurado);

        if (i !== -1) { 
            db.sessoes[i].status = "liberado"; 
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); 
            res.json({ success: true }); 
        } else {
            res.status(404).json({ error: "ID não encontrado" });
        }
    } catch (e) { res.status(500).send("Erro no servidor"); }
});

// 8. Listar fotos pendentes (pasta temp)
app.get('/api/admin/pendentes', (req, res) => {
    res.json(fs.readdirSync(TEMP));
});

// 9. APROVAR ou EXCLUIR Foto
app.post('/api/admin/decidir-foto', (req, res) => {
    const { foto, acao } = req.body;
    const caminhoTemp = path.join(TEMP, foto);
    const caminhoFinal = path.join(UPLOADS, foto);

    if (acao === 'aprovar') {
        if (fs.existsSync(caminhoTemp)) fs.renameSync(caminhoTemp, caminhoFinal);
    } else {
        if (fs.existsSync(caminhoTemp)) fs.unlinkSync(caminhoTemp);
    }
    res.json({ success: true });
});

// 10. Listar todos os colaboradores para o Admin
app.get('/api/admin/colaboradores', (req, res) => {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    res.json(db.colaboradores);
});

// 11. APROVAR ou EXCLUIR Colaborador
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

// 12. Rota do Histórico (Pedidos filtrados)
app.get('/api/admin/historico', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(DB_PATH));
        const historico = db.sessoes.sort((a, b) => new Date(b.data) - new Date(a.data));
        res.json(historico);
    } catch (e) { res.json([]); }
});

// INICIAR SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
    =========================================
    🚀 SERVIDOR ATIVO - ENCANADOR PRO
    📂 BANCO DE DADOS: data/db.json
    🌐 PORTA: ${PORT}
    =========================================
    `);
});
