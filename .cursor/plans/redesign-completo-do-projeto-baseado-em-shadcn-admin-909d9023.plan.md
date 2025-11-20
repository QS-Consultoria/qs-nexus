<!-- 909d9023-70e9-47a9-9d30-c80acf4b24da 8d7e0955-8733-4e2a-971e-07d126439c7c -->
# Redesign Completo do Projeto Baseado em shadcn-admin

## Objetivo

Redesenhar completamente o design do projeto seguindo o padrão moderno e elegante do shadcn-admin, melhorando a experiência visual e de usabilidade em todas as páginas e componentes.

## Escopo do Redesign

### 1. Páginas de Autenticação

- **Login** (`app/(auth)/login/page.tsx`): Redesenhar com layout mais limpo, melhor espaçamento, tipografia moderna e visual mais profissional
- **Register** (`app/(auth)/register/page.tsx`): Aplicar mesmo padrão do login, com formulário bem estruturado e visual consistente

### 2. Componentes de Layout

- **Sidebar** (`components/layout/sidebar.tsx`): Redesenhar com melhor hierarquia visual, espaçamento adequado, estados de hover/active mais elegantes, e design mais moderno
- **Navbar** (`components/layout/navbar.tsx`): Melhorar visual, espaçamento, e integração com o design system

### 3. Dashboard

- **Dashboard Page** (`app/(dashboard)/dashboard/page.tsx`): Redesenhar layout com melhor grid, espaçamento e organização visual
- **Stats Cards** (`components/dashboard/stats-cards.tsx`): Modernizar cards com design mais elegante, melhor uso de cores e tipografia

### 4. Páginas de Conteúdo

- **Files Page** (`app/(dashboard)/files/page.tsx`): Melhorar layout, filtros e organização visual
- **File Details Page** (`app/(dashboard)/files/[id]/page.tsx`): Redesenhar com melhor estrutura de informações e visual
- **Upload Page** (`app/(dashboard)/upload/page.tsx`): Modernizar interface de upload
- **Chat Page** (`app/(dashboard)/chat/page.tsx`): Ajustar layout se necessário

### 5. Componentes

- **File List** (`components/files/file-list.tsx`): Melhorar tabela e cards mobile com design mais limpo
- **File Upload** (`components/upload/file-upload.tsx`): Modernizar área de drag & drop
- **Charts** (`components/dashboard/status-chart.tsx`, `area-chart.tsx`): Ajustar visual se necessário

### 6. Design System

- **globals.css**: Ajustar variáveis CSS e estilos base se necessário
- **tailwind.config.js**: Verificar e ajustar configurações de tema

## Padrões de Design do shadcn-admin

### Características Principais

1. **Espaçamento**: Uso generoso de espaçamento (padding, margins) para respiração visual
2. **Tipografia**: Hierarquia clara com tamanhos e pesos bem definidos
3. **Cores**: Uso consistente do design system shadcn com variáveis CSS
4. **Bordas**: Bordas sutis e arredondamentos consistentes
5. **Sombras**: Sombras suaves para profundidade (shadow-sm, shadow-md)
6. **Estados**: Hover e active states bem definidos e suaves
7. **Responsividade**: Design mobile-first com breakpoints bem definidos

### Elementos Específicos

- Cards com bordas sutis e sombras leves
- Sidebar com melhor separação visual e navegação clara
- Formulários com labels bem posicionados e inputs espaçados
- Tabelas limpas com hover states elegantes
- Botões com estados visuais claros
- Badges com cores consistentes

## Arquivos a Modificar

### Páginas

- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/files/page.tsx`
- `app/(dashboard)/files/[id]/page.tsx`
- `app/(dashboard)/upload/page.tsx`
- `app/(dashboard)/chat/page.tsx`
- `app/(dashboard)/layout.tsx`

### Componentes

- `components/layout/sidebar.tsx`
- `components/layout/navbar.tsx`
- `components/dashboard/stats-cards.tsx`
- `components/files/file-list.tsx`
- `components/upload/file-upload.tsx`
- `components/dashboard/status-chart.tsx` (se necessário)
- `components/dashboard/area-chart.tsx` (se necessário)
- `components/dashboard/recent-files.tsx` (se necessário)

### Estilos

- `app/globals.css` (ajustes se necessário)
- `tailwind.config.js` (verificação)

## Estratégia de Implementação

1. **Verificar e atualizar componentes shadcn existentes** - Garantir que botões, inputs e outros componentes tenham tamanhos corretos (não grandes) e estejam estilizados adequadamente
2. **Instalar/atualizar componente Sidebar oficial do shadcn** - Usar o componente Sidebar do shadcn ao invés do customizado
3. **Redesenhar páginas de autenticação (login/register)** - Usar componentes shadcn corretamente com tamanhos apropriados, seguindo padrão shadcn-admin
4. **Redesenhar sidebar usando componente oficial shadcn** - Substituir sidebar customizada pelo componente oficial
5. **Modernizar navbar** - Integrar com sidebar oficial e melhorar visual
6. **Atualizar dashboard e stats cards** - Melhorar layout e espaçamento
7. **Modernizar páginas de conteúdo** - Files, upload, chat com design consistente
8. **Ajustar componentes auxiliares** - Garantir consistência visual
9. **Revisar e polir design system** - Ajustar variáveis CSS se necessário

## Uso do MCP shadcn

- Usar MCP shadcn para verificar componentes disponíveis
- Instalar/atualizar componentes necessários via MCP quando apropriado
- Seguir exemplos e padrões dos componentes shadcn oficiais
- Garantir que todos os componentes usem tamanhos padrão (sm, default, lg) apropriadamente

## Notas Importantes

- Manter toda funcionalidade existente
- Preservar acessibilidade
- Manter responsividade
- Usar componentes shadcn existentes
- Seguir padrões de código TypeScript/React existentes
- Manter compatibilidade com Next.js App Router

### To-dos

- [ ] Redesenhar página de login com layout moderno, melhor espaçamento e tipografia seguindo padrão shadcn-admin
- [ ] Redesenhar página de registro com mesmo padrão visual do login e formulário bem estruturado
- [ ] Redesenhar sidebar com melhor hierarquia visual, espaçamento adequado e estados hover/active elegantes
- [ ] Modernizar navbar com melhor visual, espaçamento e integração com design system
- [ ] Redesenhar layout do dashboard com melhor grid, espaçamento e organização visual
- [ ] Modernizar stats cards com design mais elegante, melhor uso de cores e tipografia
- [ ] Melhorar layout da página de arquivos, filtros e organização visual
- [ ] Redesenhar página de detalhes do arquivo com melhor estrutura de informações
- [ ] Modernizar interface de upload e componente file-upload
- [ ] Melhorar tabela e cards mobile do file-list com design mais limpo
- [ ] Revisar e ajustar variáveis CSS e configurações do design system se necessário