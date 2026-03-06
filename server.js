const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// --- CONFIGURAÇÕES E MIDDLEWARES ---
app.use(cors()); // Permite comunicação entre front e back
app.use(express.json()); // Permite ler dados JSON enviados pelo formulário

// Configuração do caminho do banco de dados (JSON)
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Inicialização: Cria a pasta e o arquivo caso não existam
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ pedidos: [] }, null, 2));
}

// --- ROTAS DO SISTEMA ---

/**
 * ROTA 1: Salvar novo pedido (Vindo do Site)
 * POST http://localhost:3000/orcamento
 */
app.post('/orcamento', (req, res) => {
    const { nome, servico, mensagem } = req.body;

    if (!nome || !servico) {
        return res.status(400).json({ message: "Nome e serviço são obrigatórios." });
    }

    const novoPedido = {
        id: Date.now(), // Gera ID único por timestamp
        data: new Date().toLocaleString('pt-BR'),
        nome,
        servico,
        mensagem
    };

    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "Erro ao ler banco." });

        const banco = JSON.parse(data);
        banco.pedidos.push(novoPedido);

        fs.writeFile(DB_PATH, JSON.stringify(banco, null, 2), (err) => {
            if (err) return res.status(500).json({ message: "Erro ao salvar pedido." });
            
            console.log(`✅ Novo pedido recebido de: ${nome}`);
            res.status(200).json({ message: "Pedido enviado com sucesso!" });
        });
    });
});

/**
 * ROTA 2: Listar todos os pedidos (Vindo do Painel Admin)
 * GET http://localhost:3000/admin/pedidos
 */
app.get('/admin/pedidos', (req, res) => {
    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "Erro ao carregar lista." });
        
        const banco = JSON.parse(data);
        res.status(200).json(banco.pedidos);
    });
});

/**
 * ROTA 3: Excluir um pedido (Vindo do Painel Admin)
 * DELETE http://localhost:3000/admin/pedidos/:id
 */
app.delete('/admin/pedidos/:id', (req, res) => {
    const idParaRemover = parseInt(req.params.id);

    fs.readFile(DB_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ message: "Erro ao acessar banco." });

        let banco = JSON.parse(data);
        const inicial = banco.pedidos.length;

        // Filtra removendo o ID enviado
        banco.pedidos = banco.pedidos.filter(p => p.id !== idParaRemover);

        if (banco.pedidos.length === inicial) {
            return res.status(404).json({ message: "Pedido não encontrado." });
        }

        fs.writeFile(DB_PATH, JSON.stringify(banco, null, 2), (err) => {
            if (err) return res.status(500).json({ message: "Erro ao deletar." });
            
            console.log(`🗑️ Pedido ID ${idParaRemover} foi removido.`);
            res.status(200).json({ message: "Pedido excluído com sucesso!" });
        });
    });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    🛠️  SISTEMA ENCANADOR PRO ATIVO
    🔗 Site: http://localhost:3000
    📊 Admin: Acesse via admin.html
    📂 Banco: ${DB_PATH}
    -------------------------------------------
    `);
});
