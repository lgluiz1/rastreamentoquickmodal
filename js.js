document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('meuModal');
    const abrirModalBtn = document.getElementById('abrirModal');
    const fecharModalBtn = document.getElementById('fecharModal');
    const buscarBtn = document.getElementById('buscar');
    const loading = document.getElementById('loading');
    const resultado = document.getElementById('resultado');
    const inputCodigo = document.getElementById('codigoRastreio');
    const captchaWrapper = document.getElementById('captchaContainerWrapper');

    const empresa = "quickdelivery";
    const token = "jziCXNF8xTasaEGJGxysrTFXtDRUmdobh9HCGHiwmEzaENWLiaddLA";

    let turnstileWidgetId = null;

    // Abrir modal
    abrirModalBtn.onclick = () => {
        modal.style.display = 'flex';
        inputCodigo.value = '';
        resultado.innerHTML = '';
        // Remove CAPTCHA do modal caso tenha
        captchaWrapper.innerHTML = '';
    };

    // Fechar modal
    fecharModalBtn.onclick = () => {
        modal.style.display = 'none';
        captchaWrapper.innerHTML = '';
    };

    // Clique no botão Buscar
    buscarBtn.addEventListener('click', iniciarBuscaComCaptcha);

    // Pressionar Enter
    inputCodigo.addEventListener('keyup', e => e.key === "Enter" && iniciarBuscaComCaptcha());

    // Função principal: cria CAPTCHA dinamicamente, valida e busca
    async function iniciarBuscaComCaptcha() {
        // Remove qualquer CAPTCHA anterior
        captchaWrapper.innerHTML = '';

        // Cria CAPTCHA dinamicamente
        const captchaDiv = document.createElement('div');
        // Coloca div escrita Verificando se nao e um robô
        
        captchaDiv.className = 'cf-turnstile';
        captchaDiv.setAttribute('data-sitekey', '0x4AAAAAAB5Sy5Ne4kS8hvVw');
        captchaDiv.setAttribute('data-theme', 'light');
        captchaWrapper.appendChild(captchaDiv);


        // Renderiza o widget e aguarda validação
        turnstileWidgetId = turnstile.render(captchaDiv, {
            callback: async (token) => {
                // ⚡ CAPTCHA validado, podemos chamar API
                await buscarInformacoes();
                // Remove CAPTCHA após validação
                captchaWrapper.innerHTML = '';
            },
            'expired-callback': () => {
                alert('O CAPTCHA expirou. Por favor, valide novamente.');
                captchaWrapper.innerHTML = '';
            }
        });
    }

    // Função de busca
    async function buscarInformacoes() {
        const codigo = inputCodigo.value.trim();
        if (!codigo) {
            alert('Por favor, insira o número ou chave da NF-e ou CT-e.');
            return;
        }

        resultado.innerHTML = '';
        loading.style.display = 'block';
        buscarBtn.textContent = 'Nova Busca';

        try {
            let data = null;
            let tipo = '';

            if (/^\d{44}$/.test(codigo)) {
                data = await buscarPorTipo('invoice_key', codigo);
                tipo = `NF-e ${codigo}`;
                if (!data?.data?.length) {
                    data = await buscarPorTipo('cte_key', codigo);
                    tipo = `CT-e ${codigo}`;
                }
            } else if (/^\d+$/.test(codigo)) {
                data = await buscarPorTipo('invoice_number', codigo);
                tipo = `NF-e ${codigo}`;
                if (!data?.data?.length) {
                    data = await buscarPorTipo('cte_number', codigo);
                    tipo = `CT-e ${codigo}`;
                }
            } else {
                resultado.innerHTML = '<p>Digite apenas números (NF-e ou CT-e).</p>';
                return;
            }

            if (data?.data?.length) {
                exibirResultados(data, tipo);
            } else {
                resultado.innerHTML = '<p>Nenhuma ocorrência encontrada para o código informado.</p>';
            }

        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            resultado.innerHTML = `<p style="color: red;">Erro ao buscar dados. Tente novamente mais tarde.</p>`;
        } finally {
            loading.style.display = 'none';
        }
    }

    // Função para chamar API
    async function buscarPorTipo(parametro, codigo) {
        const url = `https://${empresa}.eslcloud.com.br/api/invoice_occurrences?${parametro}=${codigo}`;
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            "Content-Type": "application/json"
        };
        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        return await response.json();
    }

    // Exibe resultados
    function exibirResultados(respostaDaApi, tipo) {
        const listaDeOcorrencias = respostaDaApi.data;
        if (!listaDeOcorrencias?.length) {
            resultado.innerHTML = '<p>Nenhuma ocorrência encontrada para o código informado.</p>';
            return;
        }

        listaDeOcorrencias.reverse();

        let html = `<h4>Rastreamento <small>${tipo}</small>:</h4>`;
        html += '<div class="timeline-container">';

        listaDeOcorrencias.forEach(ocorrencia => {
            const dataObj = new Date(ocorrencia.created_at);
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            let iconClass = 'fa-solid fa-truck';
            let itemClass = '';
            const status = (ocorrencia.occurrence.description || '').toLowerCase();

            if (status.includes('postado') || status.includes('coletado')) {
                iconClass = 'fa-solid fa-box-archive';
                itemClass = 'status-inicio';
            } else if (status.includes('entregue')) {
                iconClass = 'fa-solid fa-check-circle';
            }

            html += `
                <div class="timeline-item ${itemClass}">
                    <div class="timeline-left">
                        <span class="timeline-date">${dataFormatada}</span>
                        <span class="timeline-time">${horaFormatada}</span>
                    </div>
                    <div class="timeline-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="timeline-content">
                        <h5>${ocorrencia.occurrence.description || 'Status não informado'}</h5>
                        <p>${ocorrencia.observation || 'Seu pacote está sendo processado.'}</p>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultado.innerHTML = html;
    }
});
