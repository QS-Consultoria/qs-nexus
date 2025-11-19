# Worker Threads - Processamento Isolado

## Visão Geral

O sistema utiliza Worker Threads do Node.js para isolar o processamento CPU-bound de conversão DOCX → Markdown, evitando bloquear o event loop principal e permitindo processamento paralelo eficiente.

## Localização

- **Worker**: `lib/workers/docx-converter-worker.ts`
- **Uso**: `scripts/process-documents.ts`

## Por que Worker Threads?

A conversão de DOCX para Markdown usando `mammoth` é uma operação CPU-bound que pode bloquear o event loop do Node.js. Ao usar Worker Threads:

- ✅ **Não bloqueia o event loop**: O processamento ocorre em thread separada
- ✅ **Permite paralelização**: Múltiplos workers podem processar arquivos simultaneamente
- ✅ **Isolamento de erros**: Erros em um worker não afetam outros
- ✅ **Melhor performance**: Aproveita múltiplos cores da CPU

## Arquitetura

```
Main Thread (process-documents.ts)
    ↓
    ├─ Worker 1 → DOCX → Markdown
    ├─ Worker 2 → DOCX → Markdown
    ├─ Worker 3 → DOCX → Markdown
    └─ Worker N → DOCX → Markdown
```

## Implementação

### Worker Thread (docx-converter-worker.ts)

```typescript
import { parentPort } from 'node:worker_threads';
import * as mammoth from 'mammoth';
import { readFileSync } from 'node:fs';

// Escuta mensagens do thread principal
port.on('message', async (data: { filePath: string; taskId: string }) => {
  try {
    const { filePath, taskId } = data;
    
    // Lê e converte o arquivo DOCX
    const buffer = readFileSync(filePath);
    const result = await mammoth.convertToMarkdown({ buffer });
    
    const markdown = result.value.trim();
    const wordCount = markdown.split(/\s+/).filter(word => word.length > 0).length;

    // Envia resultado de volta
    port.postMessage({
      taskId,
      success: true,
      result: { markdown, wordCount },
    });
  } catch (error) {
    // Envia erro de volta
    port.postMessage({
      taskId: data.taskId,
      success: false,
      error: error.message,
    });
  }
});
```

### Uso no Script Principal

```typescript
function convertDocxWithWorker(filePath: string): Promise<{ markdown: string; wordCount: number }> {
  return new Promise((resolve, reject) => {
    const taskId = `${Date.now()}-${Math.random()}`;
    
    // Cria worker com tsx para suportar TypeScript
    const execArgv = process.execArgv.length > 0 
      ? process.execArgv 
      : ['--import', 'tsx/esm'];
    const worker = new Worker(WORKER_PATH, { execArgv });

    // Timeout de 60 segundos
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker timeout após 60s'));
    }, 60000);

    // Escuta mensagens do worker
    worker.on('message', (message) => {
      if (message.taskId !== taskId) return; // Ignora mensagens de outras tarefas
      
      clearTimeout(timeout);
      worker.terminate();

      if (message.success) {
        resolve(message.result);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    });

    // Envia tarefa para o worker
    worker.postMessage({ filePath, taskId });
  });
}
```

## Comunicação

A comunicação entre o thread principal e os workers usa mensagens:

### Main Thread → Worker

```typescript
worker.postMessage({
  filePath: '/path/to/file.docx',
  taskId: 'unique-task-id',
});
```

### Worker → Main Thread

```typescript
// Sucesso
port.postMessage({
  taskId: 'unique-task-id',
  success: true,
  result: { markdown: '...', wordCount: 1234 },
});

// Erro
port.postMessage({
  taskId: 'unique-task-id',
  success: false,
  error: 'Error message',
});
```

## Timeout e Error Handling

### Timeout

Cada worker tem um timeout de 60 segundos. Se o processamento exceder esse tempo, o worker é terminado e a tarefa é marcada como falha.

### Error Handling

- **Erros no worker**: Capturados e enviados de volta ao thread principal
- **Erros de corrupção**: Detectados e arquivos são marcados como rejeitados
- **Worker crashes**: Detectados via evento `error` e `exit`

## Integração com ConcurrencyPool

O `process-documents.ts` combina Worker Threads com `ConcurrencyPool`:

```typescript
const pool = new ConcurrencyPool<ProcessResult | null>({
  maxConcurrency: WORKER_CONCURRENCY,  // Número de workers paralelos
  // ...
});

// Cada tarefa cria um worker thread
const tasks = files.map((filePath) => ({
  id: `file-${index}-${filePath}`,
  execute: () => processDocument(filePath),  // Usa convertDocxWithWorker internamente
}));
```

## Configuração

### Variáveis de Ambiente

```env
WORKER_CONCURRENCY=6  # Número de workers paralelos (padrão: 6)
```

### Considerações

- **CPU-bound**: Workers são ideais para processamento CPU-intensivo
- **Memória**: Cada worker tem seu próprio espaço de memória
- **Limite**: Não criar mais workers do que cores disponíveis (recomendado: 4-8)

## Performance

Com Worker Threads e paralelização:

- **Antes**: Processamento sequencial, ~1 arquivo por vez
- **Depois**: Processamento paralelo, ~6 arquivos simultaneamente
- **Ganho**: ~6x mais rápido (dependendo do hardware)

## Limitações

1. **TypeScript**: Requer `tsx` para executar workers TypeScript
2. **Serialização**: Dados enviados via `postMessage` devem ser serializáveis
3. **Memória**: Cada worker consome memória adicional
4. **Overhead**: Criação de workers tem um pequeno overhead

## Debug

Para ativar logs detalhados:

```env
DEBUG=true
```

Isso exibe:
- Mensagens recebidas no worker
- Erros com stack traces
- Timeouts e terminações

## Exemplo de Uso

```typescript
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const WORKER_PATH = fileURLToPath(
  new URL('../lib/workers/docx-converter-worker.ts', import.meta.url)
);

async function convertFile(filePath: string) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, {
      execArgv: ['--import', 'tsx/esm'],
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Timeout'));
    }, 60000);

    worker.on('message', (message) => {
      clearTimeout(timeout);
      worker.terminate();
      
      if (message.success) {
        resolve(message.result);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    });

    worker.postMessage({ filePath, taskId: 'task-1' });
  });
}
```

