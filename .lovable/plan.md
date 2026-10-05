# Free Fire Aim Lab & Hyper-Sensitivity Engine

## Objetivo
Evoluir a central atual para um laboratório de mira jogável, preservando o acesso por key, os perfis salvos e o painel administrativo já existentes.

## Experiência
- Reorganizar a página inicial em três áreas claras: laboratório de tiro, motor matemático e análise/recomendação.
- Criar uma arena de treino 2D de alta performance com UMP, alvos com hitboxes independentes, retícula branca/vermelha, magnetismo de torso e puxada para a cabeça via mouse ou toque.
- Sintetizar rajadas com Web Audio e renderizar rastros, impactos, danos de corpo/capa e telemetria de velocidade, desvio, permanência na cabeça e estabilidade.
- Fazer o resultado do treino retroalimentar a sensibilidade e o botão recomendado, incluindo faixa completa de 10% a 100%.
- Adicionar FPS e velocidade do ponteiro ao cálculo, além de recomendação de DPI e resolução segura conforme hardware.

## Direção visual reativa
- Baixa: ciano/azul, movimentos lentos e precisos.
- Média: ciano/amarelo, ritmo equilibrado.
- Alta: vermelho/âmbar, respostas rápidas e agressivas.
- Aplicar a mudança de tema ao painel inteiro, com revelação por rolagem, brilho orientado pelo cursor e tilt discreto, respeitando redução de movimento.

## Estrutura técnica
- Manter TanStack Start, React e Tailwind v4 do projeto; a experiência continuará na rota única `/`, mas dividida em módulos focados para facilitar manutenção.
- Usar Canvas 2D para a arena, evitando dependências e peso de uma cena 3D completa quando a mecânica pedida é baseada em retícula e hitboxes de tela.
- Atualizar o motor TypeScript puro para validar e cruzar DPI, resolução, FPS, ponteiro, estilo, modo, latência e métricas do treino.
- Manter HTML semântico, controles acessíveis, tokens globais e metadados próprios da página.

## Validação
- Conferir disparo, arraste, aim assist, hitboxes, áudio, dano, métricas e aplicação automática em mouse e toque.
- Validar troca completa entre os três temas e recomendações bidirecionais.
- Testar desktop e celular, checar cortes/sobreposições e confirmar abertura sem erros.
