

# Onboarding da Secretária Digital para Pet Shop 🐾

## Visão Geral
Aplicação de onboarding em 5 etapas para configurar uma secretária digital (IA) para pet shops via WhatsApp. Interface moderna, amigável e com temática pet.

## Design & Estilo
- Paleta de cores quente e acolhedora (tons de roxo/lilás com acentos em laranja)
- Ícones temáticos de pets (patinhas, ossinhos)
- Barra de progresso no topo com as 5 etapas numeradas e nomeadas
- Layout centralizado, responsivo e limpo

## Etapas do Onboarding

### Etapa 1 — Conectar WhatsApp
- Campo de telefone com máscara brasileira (XX) XXXXX-XXXX
- Botão "Verificar número"
- Simulação de verificação com feedback visual (loading + confirmação)

### Etapa 2 — Dados do Pet Shop
- Campos: Nome Fantasia, Endereço, Bairro, Cidade, UF (select com estados)
- Validação de campos obrigatórios com mensagens de erro

### Etapa 3 — Horário de Funcionamento
- Lista dos 7 dias da semana
- Toggle para marcar dia como aberto/fechado
- Seletores de horário de abertura e fechamento para cada dia ativo
- Opção "Copiar para todos os dias" para facilitar o preenchimento

### Etapa 4 — Cadastro de Serviços
- Formulário para adicionar serviço: nome, preço (R$) e duração (minutos)
- Lista dos serviços adicionados com opção de remover
- Mínimo de 1 serviço para avançar
- Serviços sugeridos pré-definidos (Banho, Tosa, Consulta Veterinária) para adicionar com um clique

### Etapa 5 — Personalização da IA
- Seleção do tom de voz com 3 cards visuais: Formal, Amigável, Divertido (com preview de exemplo de mensagem)
- Campo para definir o nome da secretária digital
- Preview de como a secretária vai se apresentar no WhatsApp

## Finalização
- Botão "ATIVAR SECRETÁRIA" destacado
- Tela de sucesso com animação de celebração (confetti)
- Resumo das configurações realizadas
- Mensagem de boas-vindas personalizada com o nome escolhido

## Navegação
- Botões "Voltar" e "Próximo" em cada etapa
- Barra de progresso clicável para navegar entre etapas já completadas
- Dados preservados ao navegar entre etapas (estado local)

## Observações
- Todos os dados ficam apenas no frontend (sem backend/banco de dados)
- Validação client-side com feedback visual em todos os formulários
- Totalmente responsivo para desktop e mobile

