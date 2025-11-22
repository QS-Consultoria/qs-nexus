# Guia de Uso do Dashboard RAG

Este guia fornece instruções completas para usar o Dashboard RAG, desde a autenticação até o uso do chat RAG.

## Índice

1. [Autenticação](#autenticação)
2. [Dashboard Principal](#dashboard-principal)
3. [Upload de Arquivos](#upload-de-arquivos)
4. [Lista e Detalhes de Arquivos](#lista-e-detalhes-de-arquivos)
5. [Chat RAG](#chat-rag)
6. [Navegação](#navegação)
7. [Troubleshooting](#troubleshooting)

## Autenticação

### Registro de Usuário

1. Acesse `/register` no navegador
2. Preencha o formulário:
   - **Email**: Seu endereço de email (deve ser único)
   - **Senha**: Mínimo de caracteres (recomendado: 8+)
   - **Nome**: Seu nome completo
3. Clique em "Registrar"
4. Você será redirecionado para a página de login

**Nota**: O email deve ser único no sistema. Se já existir, você receberá uma mensagem de erro.

### Login

1. Acesse `/login` no navegador
2. Digite seu email e senha
3. Clique em "Entrar"
4. Você será redirecionado para o dashboard principal

**Nota**: Se você tentar acessar uma rota protegida sem estar autenticado, será redirecionado automaticamente para `/login`.

### Logout

1. Clique no botão de usuário no canto superior direito do navbar
2. Selecione "Sair" ou clique no botão de logout
3. Você será deslogado e redirecionado para a página de login

## Dashboard Principal

O dashboard principal (`/dashboard`) fornece uma visão geral completa do sistema RAG.

### Estatísticas Gerais

Os cards no topo mostram:

- **Total**: Número total de documentos no sistema
- **Pendentes**: Documentos aguardando processamento
- **Processando**: Documentos em processamento
- **Concluídos**: Documentos processados com sucesso
- **Falhados**: Documentos que falharam no processamento
- **Rejeitados**: Documentos rejeitados (não serão reprocessados)
- **Progresso**: Percentual geral de conclusão

### Gráficos

O dashboard exibe vários gráficos:

#### Gráficos Gerais

1. **Distribuição por Status**: Gráfico de pizza mostrando a distribuição de documentos por status (pending, processing, completed, failed, rejected)

2. **Distribuição por Área Jurídica**: Gráfico de barras mostrando quantos documentos existem em cada área jurídica

#### Gráficos de Modelos e Tokens

3. **Documentos por Provider**: Gráfico de barras mostrando quantos documentos foram classificados por cada provider (OpenAI, Google)

4. **Documentos por Modelo**: Gráfico de barras mostrando os top 10 modelos mais usados na classificação

5. **Distribuição de Tokens (Input vs Output)**: Gráfico de pizza mostrando a proporção de tokens de entrada vs saída

6. **Tokens por Provider**: Gráfico de barras empilhadas mostrando tokens de input e output por provider

7. **Tokens por Modelo**: Gráfico de barras empilhadas mostrando tokens de input e output por modelo (top 10)

**Nota**: Os gráficos de modelos e tokens só aparecem se houver templates com informações de modelo e tokens (templates classificados após a implementação desta feature).

### Documentos de Qualidade

- **GOLD**: Documentos marcados como de alta qualidade
- **SILVER**: Documentos marcados como de qualidade média

### Arquivos Recentes

Lista dos últimos 10 arquivos processados, mostrando:

- Nome do arquivo
- Status atual
- Número de palavras
- Data de atualização

### Atualização Automática

O dashboard atualiza automaticamente a cada 30 segundos para mostrar as estatísticas mais recentes.

## Upload de Arquivos

A página de upload (`/upload`) permite enviar arquivos DOCX, DOC ou PDF para processamento.

### Como Fazer Upload

#### Opção 1: Drag & Drop

1. Arraste arquivos `.docx`, `.doc` ou `.pdf` para a área de upload
2. Os arquivos aparecerão na lista de preview
3. Clique em "Processar Arquivos"

#### Opção 2: Seleção de Arquivos

1. Clique na área de upload ou no botão "Escolher Arquivos"
2. Selecione um ou mais arquivos `.docx`, `.doc` ou `.pdf`
3. Os arquivos aparecerão na lista de preview
4. Clique em "Processar Arquivos"

#### Opção 3: Upload de Pasta

1. Clique no botão "Escolher Pasta"
2. Selecione uma pasta contendo arquivos `.docx`, `.doc` ou `.pdf`
3. Todos os arquivos suportados da pasta serão selecionados
4. Clique em "Processar Arquivos"

### Validações

- **Formato**: Apenas arquivos `.docx`, `.doc` ou `.pdf` são aceitos
- **Tamanho**: Máximo de 50MB por arquivo
- Arquivos que não atendem aos critérios são ignorados silenciosamente

### Processamento

Após clicar em "Processar Arquivos":

1. Os arquivos são enviados para o servidor
2. Um job ID é gerado para rastreamento
3. A página exibe o componente de progresso
4. O progresso é atualizado em tempo real via Server-Sent Events (SSE)

### Acompanhamento de Progresso

O componente de progresso mostra:

- **Barra de progresso geral**: Percentual de conclusão
- **Lista de arquivos**: Status individual de cada arquivo
- **Badges coloridos**:
  - 🔵 Azul: Pendente
  - 🟡 Amarelo: Processando
  - 🟢 Verde: Concluído
  - 🔴 Vermelho: Falhado

**Nota**: Atualmente, o sistema de progresso está parcialmente implementado. A integração completa com o pipeline RAG está em desenvolvimento.

## Lista e Detalhes de Arquivos

### Lista de Arquivos (`/files`)

A página de lista mostra todos os documentos do sistema em formato de tabela.

#### Colunas da Tabela

- **Nome**: Nome do arquivo
- **Status**: Badge colorido com o status atual
- **Área**: Área jurídica (se processado)
- **Tipo**: Tipo de documento (se processado)
- **Data**: Data de última atualização

#### Filtros

Use os filtros no topo da página para:

- **Status**: Filtrar por status (pending, processing, completed, failed, rejected)
- **Área**: Filtrar por área jurídica
- **Tipo**: Filtrar por tipo de documento

#### Paginação

A lista é paginada com 20 itens por página. Use os controles de paginação para navegar.

#### Responsividade

- **Desktop**: Tabela completa
- **Mobile**: Cards responsivos com as mesmas informações

### Detalhes do Arquivo (`/files/[id]`)

Clique em qualquer arquivo da lista para ver seus detalhes completos.

#### Informações do Arquivo

- **Nome**: Nome do arquivo
- **Status**: Status atual
- **Hash SHA256**: Hash único do arquivo
- **Número de Palavras**: Contagem de palavras
- **Caminho**: Caminho do arquivo no sistema
- **Datas**: Criado em, processado em, atualizado em

#### Metadados do Template

Se o arquivo foi processado com sucesso, você verá:

- **Título**: Título extraído do documento
- **Área Jurídica**: Área classificada
- **Tipo de Documento**: Tipo classificado
- **Qualidade**: GOLD ou SILVER (se aplicável)
- **Resumo**: Resumo gerado (se disponível)

#### Preview e Edição do Markdown

A página de detalhes permite visualizar e editar o markdown do documento:

- **Modo Preview**: Visualização renderizada do markdown usando `react-markdown`
- **Modo Code**: Visualização do código markdown bruto
- **Toggle**: Botão para alternar entre preview e código
- **Edição**: Edição inline do markdown com salvamento
- **Salvamento**: Salva alterações diretamente no banco de dados

**Como usar**:
1. Clique no botão "Ver Preview" para ver o markdown renderizado
2. Clique no botão "Ver Código" para voltar ao código
3. Clique em "Editar" para editar o markdown
4. Faça suas alterações e clique em "Salvar"

#### Chunks

Se o arquivo foi chunked e teve embeddings gerados, você verá:

- Lista de todos os chunks
- Índice de cada chunk
- Seção e role (se disponíveis)
- Tamanho do chunk

#### Reprocessamento e Regeneração

A página de detalhes oferece duas opções de reprocessamento:

**1. Reprocessamento Completo**:
- Permite fazer upload de um novo arquivo para substituir o existente
- Reprocessa completamente o documento (conversão, classificação, chunking, embeddings)
- Deleta chunks antigos antes de reprocessar
- Útil para corrigir documentos mal processados ou atualizar versões

**2. Regeneração de Chunks**:
- Regenera chunks e embeddings sem reprocessar o documento completo
- Usa o markdown atual do documento
- Útil quando o markdown foi editado manualmente ou quando se quer ajustar a estratégia de chunking

## Chat RAG

A página de chat (`/chat`) permite fazer perguntas sobre os documentos processados usando busca vetorial e IA.

### Como Usar o Chat

1. **Selecione o Modelo**: Escolha o modelo de IA que deseja usar no seletor no topo do chat
2. Digite sua pergunta na caixa de texto na parte inferior
3. Pressione Enter ou clique no botão de enviar
4. A resposta será gerada em tempo real (streaming)
5. Continue a conversa fazendo mais perguntas

### Modelos Disponíveis

O chat suporta múltiplos modelos de IA:

**OpenAI**:
- **GPT-4o Mini** (padrão): Modelo rápido e econômico, ideal para uso geral
- **GPT-4o**: Modelo mais poderoso, ideal para tarefas complexas

**Google Gemini**:
- **Gemini 2.0 Flash**: Modelo rápido e eficiente
- **Gemini 2.0 Flash Lite**: Versão mais leve e econômica
- **Gemini 2.5 Flash**: Versão mais recente e melhorada
- **Gemini 2.5 Flash Lite**: Versão lite da 2.5

**Recomendações**:
- Para uso geral: GPT-4o Mini ou Gemini 2.0 Flash Lite
- Para tarefas complexas: GPT-4o ou Gemini 2.5 Flash
- Para economia: Gemini 2.0/2.5 Flash Lite

### Funcionamento

O chat funciona da seguinte forma:

1. **Busca Vetorial**: Sua pergunta é convertida em um embedding e comparada com todos os chunks no banco de dados
2. **Seleção de Contexto**: Os chunks mais similares (similaridade >= 50%) são selecionados
3. **Construção de Contexto**: Os chunks são organizados em um contexto estruturado
4. **Geração de Resposta**: A IA (modelo selecionado) gera uma resposta baseada apenas no contexto encontrado
5. **Streaming**: A resposta é enviada em tempo real para melhor UX

### Limitações

- O chat só responde com base nos documentos processados e indexados
- Se não houver informação relevante, a IA informará que não tem essa informação
- A similaridade mínima é de 50% - chunks menos similares são ignorados
- O histórico de conversa é limitado às últimas 6 mensagens (3 turnos)
- Cada modelo tem suas próprias limitações e características
- Alguns modelos podem ter rate limits diferentes

### Dicas de Uso

- **Seja específico**: Perguntas específicas retornam melhores resultados
- **Use termos jurídicos**: Termos técnicos do domínio jurídico funcionam melhor
- **Cite documentos**: A IA pode citar os documentos usados como fonte
- **Faça perguntas claras**: Evite perguntas muito genéricas ou ambíguas

### Limpar Conversa

Use o botão "Limpar" para começar uma nova conversa (o histórico será resetado).

## Navegação

### Sidebar (Desktop)

A sidebar no lado esquerdo contém:

- **Dashboard**: Voltar para o dashboard principal
- **Upload**: Página de upload de arquivos
- **Arquivos**: Lista de arquivos
- **Chat**: Chat RAG

O link ativo é destacado visualmente.

### Navbar

O navbar no topo contém:

- **Logo/Título**: Nome do sistema
- **Menu de Usuário**: Botão com informações do usuário e opção de logout
- **Menu Hamburger** (Mobile): Abre a sidebar em formato drawer

### Responsividade

- **Desktop**: Sidebar sempre visível, navbar no topo
- **Mobile**: Sidebar oculta, menu hamburger no navbar abre drawer

## Troubleshooting

### Problemas de Autenticação

**Erro: "Email já existe"**

- O email já está cadastrado no sistema
- Use outro email ou faça login se já tiver conta

**Erro: "Credenciais inválidas"**

- Verifique se o email e senha estão corretos
- Certifique-se de que está usando a conta correta

**Redirecionamento infinito**

- Limpe os cookies do navegador
- Verifique se `NEXTAUTH_SECRET` está configurado no `.env.local`

### Problemas de Upload

**Arquivo não aparece na lista**

- Verifique se o arquivo é `.docx`, `.doc` ou `.pdf`
- Verifique se o tamanho é menor que 50MB
- Arquivos inválidos são ignorados silenciosamente

**Erro ao processar**

- Verifique os logs do servidor
- Certifique-se de que o diretório `uploads/temp` existe e tem permissões de escrita

### Problemas de Chat

**Resposta: "Não tenho essa informação"**

- Não há documentos relevantes na base de conhecimento
- Tente reformular a pergunta com termos diferentes
- Verifique se há documentos processados no sistema

**Chat não responde**

- Verifique se `OPENAI_API_KEY` está configurado (para modelos OpenAI)
- Verifique se `GOOGLE_GENERATIVE_AI_API_KEY` está configurado (para modelos Gemini)
- Verifique a conexão com a internet
- Tente trocar de modelo (pode ser um problema específico do modelo)
- Veja os logs do servidor para erros

**Respostas genéricas**

- Aumente o número de chunks retornados (padrão: 10)
- Verifique se há documentos suficientes na base
- Tente perguntas mais específicas

### Problemas de Performance

**Dashboard lento**

- O cache é atualizado a cada 30 segundos
- Se houver muitos documentos, pode levar alguns segundos para carregar
- Considere aumentar o tempo de cache se necessário

**Lista de arquivos lenta**

- Use os filtros para reduzir o número de resultados
- A paginação ajuda a carregar menos dados por vez

### Problemas Gerais

**Página não carrega**

- Verifique se o servidor Next.js está rodando (`npm run dev`)
- Verifique se a porta 3000 está disponível
- Veja os logs do console do navegador para erros

**Erros 500**

- Verifique os logs do servidor
- Certifique-se de que todas as variáveis de ambiente estão configuradas
- Verifique a conexão com o banco de dados

**Estilos não aparecem**

- Certifique-se de que o Tailwind CSS está configurado corretamente
- Execute `npm run build` para verificar erros de compilação

## Próximos Passos

Após dominar o uso básico do dashboard, você pode:

1. **Explorar Documentos**: Use a lista de arquivos para explorar documentos processados
2. **Testar Chat**: Faça perguntas variadas para testar a qualidade do RAG
3. **Monitorar Processamento**: Acompanhe o progresso de uploads e processamentos
4. **Analisar Estatísticas**: Use o dashboard para entender a distribuição de documentos

## Referências

- [Arquitetura do Dashboard](./architecture/DASHBOARD.md)
- [Referência de APIs](./reference/dashboard-api.md)
- [Troubleshooting Geral](../guides/troubleshooting.md)
