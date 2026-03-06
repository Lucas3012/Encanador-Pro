#!/data/data/com.termux/files/usr/bin/bash

cd ~/encanadorpro

echo "🚀 Iniciando Servidor e Túnel em segundo plano..."

# 1. Inicia o Node.js em segundo plano (gera log para conferência)
nohup node backend/server.js > node.log 2>&1 &

# 2. Inicia o Cloudflare e salva o log para extrairmos o link
nohup cloudflared tunnel --url http://localhost:3000 > cloudflare.log 2>&1 &

# Aguarda o link ser gerado
sleep 8
LINK=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' cloudflare.log | head -n 1)

if [ ! -z "$LINK" ]; then
    echo "🔗 Novo Link: $LINK"
    # Atualiza os arquivos
    sed -i "s|https://.*\.trycloudflare\.com|$LINK|g" index.html
    sed -i "s|https://.*\.trycloudflare\.com|$LINK|g" admin.html
    
    # Push automático
    git add .
    git commit -m "Auto-deploy: $LINK"
    git push origin main
    echo "✅ GitHub atualizado! Terminal liberado."
else
    echo "⚠️  Link não capturado, mas o servidor está rodando."
fi

# O SCRIPT TERMINA AQUI E TE DEVOLVE O COMANDO
