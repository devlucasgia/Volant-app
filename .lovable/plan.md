# Onboarding Volant — Plano completo

## Visão geral
Onboarding multi-etapas, animado, mobile-first, reutilizando o design system atual (cores, gradientes, cards arredondados, tipografia). Inspirado em Nubank/Duolingo/iFood. Aparece **uma única vez** após o primeiro login (ou quando o usuário pedir refazer em Ajustes).

## Estrutura (5 etapas)

### 1. Boas-vindas (full-screen)
- Logo Volant animada (fade + scale)
- Headline: **"Mais controle, mais lucro."**
- Subtítulo: "Vamos te mostrar como o Volant trabalha por você."
- Botão "Começar" (gradient primary) + "Pular" discreto
- Background com gradiente sutil + partículas/orbs animados

### 2. Carrossel de funções (4 slides com swipe + dots)
Cada slide com **mockup visual fictício animado** dentro de um "frame" estilo celular:

- **Slide A — Registro rápido**: FAB pulsante abrindo radial → drawer de Ganho preenchendo R$ 80,00 / Uber. Mostra a velocidade.
- **Slide B — Jornada inteligente** (cenário fictício animado):
  1. Botão "Iniciar jornada" → modal de **meta** aparecendo (R$ 250)
  2. Cronômetro rodando (00:00 → 03:42)
  3. "Encerrar jornada" → drawer de **ganho abre automaticamente com horas preenchidas**
  - Legenda: "Iniciou com meta, encerrou com ganho já no formulário."
- **Slide C — Histórico & Relatórios**: cards animados aparecendo (Bruto/Gastos/Líquido) + mini gráfico desenhando linha. "Veja onde seu dinheiro vai."
- **Slide D — Customização** (cenário real-like): mostra screenshot estilizado de Ajustes com toggles de **widgets da Tela de Início** e **widgets de Relatórios** ligando/desligando, e **reordenação de cards**. Legenda: "Monte sua tela do seu jeito — escolha o que aparece e em que ordem, tanto na Tela de Início quanto nos Relatórios."

### 3. Tela final celebratória
- Confetti sutil (canvas-confetti) com cores do app
- "Tudo pronto, [nome]!"
- Subtítulo: "Mais controle, mais lucro — agora é com você."
- CTA: "Entrar no Volant"

## Comportamento
- Aparece após login se `profiles.onboarded = false` (ou nova coluna)
- Pulável a qualquer momento (marca como concluído)
- Em Ajustes → seção "Sobre" → botão **"Refazer tour"** que reabre
- Progresso por dots no topo, gestos de swipe (embla), animações com Framer Motion
- Respeita safe areas, dark/light mode, `prefers-reduced-motion`

## Detalhes técnicos
- **Novo componente**: `src/components/onboarding/OnboardingFlow.tsx` (orquestrador)
- **Sub-componentes**: `WelcomeStep`, `FeatureCarousel`, `slides/` (RegistroSlide, JornadaSlide, RelatoriosSlide, CustomizacaoSlide), `FinalStep`
- **Animações**: Framer Motion (já não instalado — adicionar) + `canvas-confetti`
- **Persistência**: nova coluna `profiles.onboarded boolean default false` (migration)
- **Hook**: `useOnboarding()` para ler/marcar concluído
- **Montagem**: dentro de `AppLayout`, sobreposto, render condicional
- **Reset**: botão em `Settings.tsx` chama `updateProfile({ onboarded: false })` e dispara abertura
- **Reuso**: `VolantLogo`, paleta de tokens, `gradient-success`, `Drawer`, `Button` existentes
- **Mockups dos slides** são puramente visuais (divs estilizadas como o app real) — não usam dados reais nem disparam ações
- Sem alterar nenhuma lógica existente (Timer, Drawer, Settings funcionalidades)

## Migration (Supabase)
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
```

## Ordem de execução
1. Migration (`onboarded` em profiles)
2. Instalar `framer-motion` e `canvas-confetti`
3. Criar componentes do onboarding
4. Integrar em `AppLayout` + gancho em `Settings`
5. QA visual no viewport mobile

## O que NÃO muda
- Lógica de Timer, Drawer, Settings, Reports, History
- Banco existente (apenas nova coluna)
- Design system (tokens, cores, componentes)
- Rotas
