#!/bin/bash
# Script para alterar a senha do Painel Admin

DB_FILE="data/db.json"

echo "--- ALTERAR SENHA ENCANADOR PRO ---"
read -p "Digite a nova senha desejada: " NOVASENHA

if [ -z "$NOVASENHA" ]; then
    echo "Erro: A senha não pode ser vazia!"
    exit 1
fi

# Usa o sed para substituir o valor da senha no JSON
# Procura por "senha_admin": "qualquercoisa" e troca pela nova
sed -i "s/\"senha_admin\": \".*\"/\"senha_admin\": \"$NOVASENHA\"/" $DB_FILE

echo "✅ Senha alterada com sucesso para: $NOVASENHA"
echo "Reinicie o servidor para garantir a atualização."
