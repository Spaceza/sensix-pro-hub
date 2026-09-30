# SensiX Pro — painel eSports interativo

## Objetivo
Construir a experiência completa na página inicial, em português por padrão, com troca imediata para inglês e um painel responsivo inspirado em HUDs competitivos.

## Experiência
- Cabeçalho compacto com marca, estado do sistema, troca de idioma e som sintetizado.
- Visão inicial com leitura rápida de desempenho e atalhos para cada ferramenta.
- Gerador de sensibilidade 0–200 com aparelho, resolução/DPI, resultados animados, copiar e regenerar.
- Gerador do botão de tiro com tamanho da mão, estilo de arraste e guia visual da zona ideal.
- Calibração de toque em três alvos com latência calculada e estado de otimização.
- Estabilizador com três ajustes e padrão de recuo atualizado em tempo real.
- Ajustes de velocidade do ponteiro, atraso de toque e conversão de DPI com recomendações por sistema.
- Biblioteca de dicas em abas, resumo da configuração para download e notificações de sucesso.

## Direção visual
- Fundo quase preto, painéis translúcidos, laranja incandescente como ação principal, ciano para telemetria e roxo apenas como apoio.
- Tipografia tecnológica e condensada, grades HUD discretas, linhas de varredura, brilhos controlados e microinterações táteis.
- Controles grandes no celular, layout denso e eficiente em telas maiores, sem cartões aninhados.

## Implementação técnica
- React com o roteamento atual, Tailwind CSS v4 e tokens semânticos em `src/styles.css`.
- Interações locais e rápidas, sem cadastro ou armazenamento remoto.
- Sons gerados com Web Audio API e feedback de vibração quando disponível.
- Download como imagem SVG limpa e autocontida com os valores atuais.
- Metadados próprios da página, acessibilidade básica e suporte a movimento reduzido.

## Validação
- Conferir geração, cópia, calibração, sliders, idioma, som e download.
- Validar visualmente em celular e desktop e corrigir sobreposições ou cortes.
- Confirmar que a página abre sem erros.
