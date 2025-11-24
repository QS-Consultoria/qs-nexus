# Changelog - 23 de Novembro de 2025

## Implementação do Tema Amber Minima

### Modificado

#### Tema e Design System (`app/globals.css`)

**Novo Tema: Amber Minima (inspirado no 21st Magic)**

**Paleta de Cores:**
- **Primary**: Cor âmbar vibrante (#f59e0b) - hsl(38, 96%, 50%) substituindo o verde-azulado anterior
- **Background**: Branco puro minimalista (100%) para design limpo
- **Foreground**: Cinza escuro (#262626) para excelente contraste e legibilidade
- **Accent**: Âmbar muito claro (#fffbeb) - hsl(48, 100%, 97%) para destaques sutis
- **Muted**: Cinza muito claro (#f9fafb) para elementos secundários
- **Border**: Cinza neutro (#e5e7eb) para bordas discretas
- **Border radius**: Reduzido para 0.375rem (6px) para visual mais minimalista

**Modo Escuro:**
- **Background**: Preto profundo (#171717) - hsl(0, 0%, 9%)
- **Card**: Cinza escuro (#262626) - hsl(0, 0%, 15%)
- **Foreground**: Cinza claro (#e5e5e5) - hsl(0, 0%, 90%)
- **Primary**: Mantém âmbar vibrante para consistência
- **Accent**: Âmbar escuro (#92400e) com texto claro (#fde68a) para contraste
- **Sidebar**: Preto muito escuro (#0f0f0f) para diferenciação visual

**Melhorias Visuais:**
- Transições suaves adicionadas ao body (background-color e color com 0.3s ease)
- Cards com transições refinadas usando cubic-bezier
- Scrollbar personalizada com estilo moderno:
  - Largura de 8px
  - Cor de fundo usando variáveis do tema
  - Hover state com melhor feedback visual
- Sombras refinadas com valores otimizados

#### Configuração Tailwind (`tailwind.config.js`)

**Cores de Gráficos:**
- Adicionado suporte para paleta de cores de gráficos (chart-1 a chart-5)
- Cores baseadas em tons de âmbar para consistência visual
- Suporte completo para modo claro e escuro

**Novas Animações:**
- `fade-in` / `fade-out`: Animações de fade suaves
- `slide-in-from-top/bottom/left/right`: Animações de entrada em diferentes direções
- `scale-in`: Animação de escala para modais e popovers
- `shimmer`: Animação de shimmer para loading states

**Novas Sombras:**
- `soft`: Sombra suave para elevação sutil
- `medium`: Sombra média para cards e componentes
- `strong`: Sombra forte para modais e overlays

**Melhorias Gerais:**
- Todas as animações com timing functions otimizadas
- Transições mais fluidas e naturais
- Melhor suporte para estados de hover e focus

### Impacto

- **Design Minimalista**: Tema inspirado no 21st Magic com visual limpo e moderno
- **Identidade Visual**: Cor âmbar vibrante cria identidade visual única e acolhedora
- **Acessibilidade**: Excelente contraste em modo claro e escuro
- **Consistência**: Paleta harmoniosa com tons de âmbar em toda a interface
- **Modo Escuro**: Experiência visual refinada com cores bem balanceadas
- **Gráficos**: Suporte completo para paleta de cores de gráficos consistente

### Arquivos Modificados

- `app/globals.css`: Paleta de cores, transições e estilos visuais
- `tailwind.config.js`: Animações, sombras e extensões do tema

