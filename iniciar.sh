#!/data/data/com.termux/files/usr/bin/bash

# 1. Entrar na pasta do projeto (Ajustado para o seu caminho atual)
cd ~/encanadorpro

echo "------------------------------------------"
echo "🛠️  SISTEMA ENCANADOR PRO: ON"
echo "------------------------------------------"

# Configurações básicas do Git
git config --global user.email "seu-email@exemplo.com"
git config --global user.name "lucas3012"
git config --global credential.helper store

# 2. Iniciar o servidor Node.js em segundo plano
node backend/server.js > /dev/null 2>&1 &
NODE_PID=$!
echo "🚀 Servidor Node.js iniciado (PID: $NODE_PID)"

# 3. Gerar o link do Cloudflare em segundo plano
LOG_FILE="cloudflare.log"
rm -f $LOG_FILE
cloudflared tunnel --url http://localhost:3000 > $LOG_FILE 2>&1 &
CF_PID=$!
echo "🌐 Iniciando Túnel Cloudflare..."

# 4. Loop para extrair o link automaticamente do log
echo "⏳ Capturando link público..."
MAX_TENTATIVAS=20
TENTATIVA=1
LINK_ENCONTRADO=""

while [ $TENTATIVA -le $MAX_TENTATIVAS ]; do
    sleep 3
    LINK_ENCONTRADO=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' $LOG_FILE | head -n 1)
    
    if [ ! -z "$LINK_ENCONTRADO" ]; then
        break
    fi
    echo "   (Tentativa $TENTATIVA/20...)"
    TENTATIVA=$((TENTATIVA+1))
done

# 5. Processo de Atualização e Git Push
if [ ! -z "$LINK_ENCONTRADO" ]; then
    echo "🔗 Link extraído: $LINK_ENCONTRADO"
    
    # Injetar o link nos arquivos front-end
    echo "💉 Atualizando script.js e admin.html..."
    sed -i "s|https://.*\.trycloudflare\.com|$LINK_ENCONTRADO|g" frontend/script.js
    sed -i "s|https://.*\.trycloudflare\.com|$LINK_ENCONTRADO|g" frontend/admin.html
    sed -i "s|http://localhost:3000|$LINK_ENCONTRADO|g" frontend/script.js
    sed -i "s|http://localhost:3000|$LINK_ENCONTRADO|g" frontend/admin.html
    
    # Sincronização com o GitHub
    echo "📂 Sincronizando com GitHub..."
    git pull origin main --rebase
    
    git add .
    git commit -m "Auto-deploy link: $LINK_ENCONTRADO"
    
    # Envia os dados
    git push origin main || git push origin main --force
    
    echo "✅ TUDO PRONTO: Site online e GitHub atualizado!"
    echo "🔗 Link: $LINK_ENCONTRADO"
else
    echo "❌ ERRO: Não foi possível capturar o link do Cloudflare."
fi

echo "------------------------------------------"
echo "Para parar tudo: pressione CTRL + C"
echo "------------------------------------------"

wait $CF_PID
kill $NODE_PID
