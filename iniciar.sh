#!/data/data/com.termux/files/usr/bin/bash

# Entrar na pasta do projeto
cd ~/encanadorpro

# Limpar logs antigos e processos anteriores para evitar conflitos
pkill -f node
pkill -f cloudflared
rm -f cloudflare.log node.log

echo "------------------------------------------"
echo "🚀 INICIANDO SISTEMA ENCANADOR PRO"
echo "------------------------------------------"

# 1. Iniciar o servidor Node.js
nohup node backend/server.js > node.log 2>&1 &
echo "✅ Servidor Node.js em segundo plano."

# 2. Iniciar o Túnel Cloudflare
nohup cloudflared tunnel --url http://localhost:3000 > cloudflare.log 2>&1 &
echo "⏳ Gerando link público (aguarde 10s)..."

# Aguarda o link ser gerado no log
sleep 10

# 3. Extrair o link do Cloudflare
LINK=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' cloudflare.log | head -n 1)

if [ ! -z "$LINK" ]; then
    echo "🔗 NOVO LINK ENCONTRADO: $LINK"

    # --- INJEÇÃO BLINDADA DE LINKS ---
    # Este comando localiza API_BASE ou API_URL e troca tudo entre aspas pelo novo link
    # Funciona mesmo que você tenha mudado o nome da variável
    
    echo "💉 Injetando link nos arquivos HTML..."
    
    # Procura por padrões como: const API_BASE = "..." ou const API_URL = "..."
    # E substitui pelo novo link em todos os arquivos .html
    sed -i "s|\(const API_BASE *= *\)\".*\"|\1\"$LINK\"|g" *.html
    sed -i "s|\(const API_URL *= *\)\".*\"|\1\"$LINK\"|g" *.html
    
    # Backup: Substitui qualquer link antigo da cloudflare que tenha sobrado
    sed -i "s|https://.*\.trycloudflare\.com|$LINK|g" *.html

    # 4. Sincronizar com o GitHub
    echo "📂 Enviando atualizações para o GitHub..."
    git add .
    git commit -m "Auto-update: $LINK"
    git push origin main
    
    echo "------------------------------------------"
    echo "✅ TUDO PRONTO E ONLINE!"
    echo "🔗 Site: $LINK"
    echo "🔐 Admin: $LINK/admin.html"
    echo "------------------------------------------"
else
    echo "❌ ERRO: O link não foi gerado. Verifique o arquivo cloudflare.log"
fi

# Devolve o controle para você usar o terminal
/data/data/com.termux/files/usr/bin/bash
