document.getElementById('formOrcamento').addEventListener('submit', async (e) => {
    e.preventDefault();

    const dados = {
        nome: document.getElementById('nome').value,
        servico: document.getElementById('servico').value,
        mensagem: document.getElementById('mensagem').value
    };

    try {
        const response = await fetch('http://localhost:3000/orcamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await response.json();
        alert(resultado.message);
        e.target.reset(); // Limpa o formulário
    } catch (erro) {
        alert("Erro ao conectar com o servidor. Tente novamente mais tarde.");
    }
});
