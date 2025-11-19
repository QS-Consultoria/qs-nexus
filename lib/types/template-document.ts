import { z } from 'zod';

export const TemplateDocumentSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  docType: z.enum([
    'peticao_inicial',
    'contestacao',
    'recurso',
    'parecer',
    'contrato',
    'modelo_generico',
    'outro'
  ]),
  area: z.enum([
    'civil',
    'trabalhista',
    'tributario',
    'empresarial',
    'consumidor',
    'penal',
    'administrativo',
    'previdenciario',
    'outro'
  ]),
  jurisdiction: z.string().default('BR'),
  complexity: z.enum(['simples', 'medio', 'complexo']),
  tags: z.array(z.string()).default([]),
  summary: z.string(),
  markdown: z.string(),
  metadata: z.record(z.any()).optional(),
  qualityScore: z.number().min(0).max(100).optional(),
  isGold: z.boolean().default(false),
  isSilver: z.boolean().default(false),
});

export type TemplateDocument = z.infer<typeof TemplateDocumentSchema>;

