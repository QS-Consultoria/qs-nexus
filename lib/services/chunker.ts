export interface Chunk {
  content: string;
  section?: string;
  role?: string;
  chunkIndex: number;
}

/**
 * Chunking inteligente que respeita estrutura Markdown
 */
export function chunkMarkdown(
  markdown: string,
  maxTokens: number = 800
): Chunk[] {
  const chunks: Chunk[] = [];
  
  // Divide por seções (H1, H2)
  const sectionRegex = /^(#{1,2})\s+(.+)$/gm;
  const sections: Array<{ level: number; title: string; start: number }> = [];
  
  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    sections.push({
      level: match[1].length,
      title: match[2].trim(),
      start: match.index,
    });
  }

  // Se não há seções claras, usa chunking por parágrafos
  if (sections.length === 0) {
    return chunkByParagraphs(markdown, maxTokens);
  }

  // Chunking por seções
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];
    const sectionStart = section.start;
    const sectionEnd = nextSection ? nextSection.start : markdown.length;
    
    const sectionContent = markdown.substring(sectionStart, sectionEnd);
    const role = inferRole(section.title);

    // Se a seção é pequena, adiciona como um chunk
    if (estimateTokens(sectionContent) <= maxTokens) {
      chunks.push({
        content: sectionContent,
        section: section.title,
        role,
        chunkIndex: chunks.length,
      });
    } else {
      // Se a seção é grande, divide em parágrafos
      const sectionChunks = chunkByParagraphs(sectionContent, maxTokens);
      sectionChunks.forEach((chunk, idx) => {
        chunks.push({
          ...chunk,
          section: section.title,
          role,
          chunkIndex: chunks.length,
        });
      });
    }
  }

  return chunks;
}

/**
 * Chunking por parágrafos (fallback)
 */
function chunkByParagraphs(text: string, maxTokens: number): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    const currentTokens = estimateTokens(currentChunk);

    if (currentTokens + paragraphTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
      });
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIndex,
    });
  }

  return chunks;
}

/**
 * Infere o papel/role de uma seção baseado no título
 */
function inferRole(sectionTitle: string): string {
  const title = sectionTitle.toLowerCase();
  
  if (title.includes('fato') || title.includes('histórico')) return 'fatos';
  if (title.includes('direito') || title.includes('fundament')) return 'fundamentacao';
  if (title.includes('pedido') || title.includes('requer')) return 'pedido';
  if (title.includes('introdu') || title.includes('preliminar')) return 'intro';
  if (title.includes('conclus') || title.includes('final')) return 'conclusao';
  
  return 'outro';
}

/**
 * Estima tokens (aproximação: 1 token ≈ 4 caracteres)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

