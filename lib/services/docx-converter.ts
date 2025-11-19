import mammoth from 'mammoth';
import { readFileSync } from 'node:fs';

export interface ConversionResult {
  markdown: string;
  wordCount: number;
}

/**
 * Converte arquivo DOCX para Markdown usando mammoth
 */
export async function convertDocxToMarkdown(filePath: string): Promise<ConversionResult> {
  try {
    const buffer = readFileSync(filePath);
    const result = await mammoth.convertToMarkdown({ buffer });
    
    const markdown = result.value;
    const wordCount = markdown.split(/\s+/).filter(word => word.length > 0).length;

    return {
      markdown: markdown.trim(),
      wordCount,
    };
  } catch (error) {
    throw new Error(`Failed to convert DOCX to Markdown: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Limpa e normaliza o Markdown gerado
 */
export function cleanMarkdown(markdown: string): string {
  // Remove múltiplas linhas em branco
  let cleaned = markdown.replace(/\n{3,}/g, '\n\n');
  
  // Remove espaços em branco no início/fim de linhas
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // Remove linhas vazias no início e fim
  cleaned = cleaned.trim();
  
  return cleaned;
}

