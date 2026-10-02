# SensiX Pro — Remodelagem completa + acesso por Key

## Visual
- Laranja como cor principal sobre preto absoluto, detalhes em ciano; acabamento metálico sutil, vidro refinado, brilho só em pontos de ação.
- Tipografia agressiva (Orbitron + Rajdhani), animações leves e microinterações nos botões, sem poluição visual.
- HTML semântico, metadados de SEO, totalmente responsivo.

## Acesso por Key
- Tela de entrada pedindo a Key antes de liberar o painel.
- Durações: 24h, 7 dias, 1, 3, 6 e 9 meses, 1 ano e permanente. O tempo conta a partir da primeira ativação.
- Painel Admin (entrada com a Key admin): gerar keys em lote por duração, copiar, ver status (ativa, expirada, não usada) e revogar.
- O "outro site" que vende/distribui as keys pode usar um endereço de integração protegido para criar keys automaticamente.
- Mostra o tempo restante no cabeçalho; ao expirar, bloqueia de novo.

**Segurança (ajuste ao pedido):** não vou deixar a Key admin escrita no código, porque qualquer pessoa conseguiria vê-la no navegador e criar keys de graça. Ela será guardada como segredo protegido no Lovable Cloud; você define o valor em um formulário seguro e o validamos no servidor.

## Motor de sensibilidade (fórmula ponderada)
Entradas: modo (BR Rankeado, Apostado/4v4, X1), preferência de puxada (baixa/média/alta), marca/modelo, DPI, resolução, tamanho do botão de tiro, estilo de puxada (linear/curta/explosiva), input lag e atraso de toque.
- DPI, resolução e marca escalam os eixos X/Y.
- Tamanho do botão ajusta o multiplicador de Geral e Red Dot.
- Modo equilibra precisão de longa distância (BR) e velocidade de giro (X1/4v4).
- Saída: Geral, Red Dot, ACOG (2x), 4x, AWM, Câmera, botão recomendado (0–200).

## Ferramentas
- Gerador de Configuração Suprema com explicação de cada fator.
- Simulador de puxada (arraste até a cabeça, mouse e toque) e teste de reflexo, que refinam o resultado.
- Perfis salvos na conta da Key: salvar testes, comparar lado a lado, exportar "Card de Atleta" em imagem.
- Módulo Anti-Tremedeira: rotinas de treino e dicas conforme modo e estilo.
- Calculadora de DPI ideal por processador/hardware.
- Português padrão, troca para inglês.

## Detalhes técnicos
- Ativar Lovable Cloud: tabelas `access_keys` (código, duração, ativada_em, expira_em, revogada) e `saved_profiles` ligadas à key; acesso só via funções de servidor, sem leitura direta pelo navegador.
- Segredo `ADMIN_KEY` validado no servidor; sessão da key guardada como token assinado (`SESSION_SECRET` gerado).
- Endpoint `/api/public/keys` para o site externo, protegido por segredo `KEYS_API_TOKEN`.
- Cálculo em módulo TypeScript puro `src/lib/sensi-engine.ts`; página dividida em componentes.
