#!/data/data/com.termux/files/usr/bin/bash

# 1. Solicita o novo link gerado pelo Cloudflare
echo "------------------------------------------"
echo "🔗 ATUALIZADOR DE LINKS - ENCANADOR PRO"
echo "------------------------------------------"
echo "Cole o novo link do Cloudflare (ex: https://xyz.trycloudflare.com):"
read NOVO_LINK

# Remove a barra final se o usuário colou com ela (ex: .com/ vira .com)
NOVO_LINK=$(echo $NOVO_LINK | sed 's/\/$//')

echo "⏳ Atualizando arquivos..."

# 2. Caminhos dos arquivos (Ajuste se as pastas forem diferentes)
FILE_JS="encanadorpro/script.js"
FILE_ADMIN="encanadorpro/admin.html"

# 3. Expressão Regular para encontrar links .trycloudflare.com e substituir
# O 'sed' procura o padrão antigo e troca pelo novo em todo o arquivo
sed -i "s|https://.*\.trycloudflare\.com|$NOVO_LINK|g" "$FILE_JS"
sed -i "s|https://.*\.trycloudflare\.com|$NOVO_LINK|g" "$FILE_ADMIN"

# Caso ainda existam referências a localhost, ele também limpa:
sed -i "s|http://localhost:3000|$NOVO_LINK|g" "$FILE_JS"
sed -i "s|http://localhost:3000|$NOVO_LINK|g" "$FILE_ADMIN"

echo "✅ Sucesso! Os arquivos script.js e admin.html agora apontam para: $NOVO_LINK"
echo "------------------------------------------"
