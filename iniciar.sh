#!/data/data/com.termux/files/usr/bin/bash

# Entrar na pasta do projeto
cd ~/encanadorpro

# Limpar processos antigos para evitar conflitos de porta
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
echo "⏳ Gerando link público (aguarde 12s)..."

# Aguarda o link ser gerado no log (aumentado para 12s por segurança)
sleep 12

# 3. Extrair o link do Cloudflare
LINK=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' cloudflare.log | head -n 1)

if [ ! -z "$LINK" ]; then
    echo "🔗 NOVO LINK ENCONTRADO: $LINK"

    echo "💉 Injetando link nos arquivos HTML..."
    
    # Substitui API_BASE ou API_URL em todos os arquivos .html
    # O uso das aspas simples externas evita erros com caracteres especiais
    sed -i "s|\(const API_BASE *= *\)\".*\"|\1\"$LINK\"|g" *.html
    sed -i "s|\(const API_URL *= *\)\".*\"|\1\"$LINK\"|g" *.html
    
    # Backup: Garante a troca de qualquer link cloudflare antigo
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

# O script termina aqui. NÃO adicione nada abaixo desta linha.
