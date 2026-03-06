#!/data/data/com.termux/files/usr/bin/bash

# 1. Entrar na pasta do projeto
cd ~/encanador-pro

echo "------------------------------------------"
echo "🛠️  AUTOMAÇÃO FULL: ENCANADOR PRO"
echo "------------------------------------------"

# 2. Iniciar o servidor Node.js em segundo plano
node backend/server.js > /dev/null 2>&1 &
NODE_PID=$!
echo "🚀 Servidor Node.js iniciado (PID: $NODE_PID)"

# 3. Gerar o link do Cloudflare em segundo plano
LOG_FILE="cloudflare.log"
rm -f $LOG_FILE
cloudflared tunnel --url http://localhost:3000 > $LOG_FILE 2>&1 &
CF_PID=$!
echo "🌐 Gerando túnel Cloudflare..."

# 4. Loop para extrair o link automaticamente do log
echo "⏳ Capturando link público..."
MAX_TENTATIVAS=15
TENTATIVA=1
LINK_ENCONTRADO=""

while [ $TENTATIVA -le $MAX_TENTATIVAS ]; do
    sleep 2
    LINK_ENCONTRADO=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' $LOG_FILE | head -n 1)
    
    if [ ! -z "$LINK_ENCONTRADO" ]; then
        break
    fi
    TENTATIVA=$((TENTATIVA+1))
done

# 5. Se encontrou o link, injeta nos arquivos e faz o Git Push
if [ ! -z "$LINK_ENCONTRADO" ]; then
    echo "🔗 Link extraído: $LINK_ENCONTRADO"
    
    # Substitui em todos os arquivos necessários (.js e .html)
    echo "💉 Injetando link no script.js e admin.html..."
    sed -i "s|https://.*\.trycloudflare\.com|$LINK_ENCONTRADO|g" frontend/script.js
    sed -i "s|https://.*\.trycloudflare\.com|$LINK_ENCONTRADO|g" frontend/admin.html
    
    # Envia para o GitHub
    echo "📂 Fazendo Git Push..."
    git add .
    git commit -m "Auto-update link: $LINK_ENCONTRADO"
    git push origin main
    
    echo "✅ SUCESSO: Site online e GitHub atualizado!"
else
    echo "❌ ERRO: O Cloudflare demorou demais para gerar o link."
fi

echo "------------------------------------------"
echo "Controle: Mantenha o Termux aberto."
echo "Para encerrar tudo: CTRL+C"
echo "------------------------------------------"

# Mantém o processo do túnel ativo
wait $CF_PID

# Se o script for interrompido, mata o node também
kill $NODE_PID
