import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// TODO: Import após criar schema de organizations
// import { organizations } from './organizations'
// import { users } from './organizations'

/**
 * Schema de Workflows e Orquestração
 * Sistema de workflows compartilháveis com LangChain/LangGraph
 */

// Enum para status de execução
export const workflowExecutionStatusEnum = pgEnum('workflow_execution_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
])

/**
 * Templates de Workflows
 * Workflows pré-configurados que podem ser compartilhados entre tenants
 */
export const workflowTemplates = pgTable(
  'workflow_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    
    // Compartilhamento
    isShared: boolean('is_shared').notNull().default(false),
    // organizationId null = workflow global/sistema
    organizationId: uuid('organization_id'), // .references(() => organizations.id)
    
    // LangGraph Configuration
    langchainGraph: jsonb('langchain_graph').notNull().$type<{
      nodes: Array<{
        id: string
        type: string
        config: Record<string, any>
      }>
      edges: Array<{
        source: string
        target: string
        condition?: string
      }>
      entryPoint: string
    }>(),
    
    // Input/Output Schemas (JSON Schema format)
    inputSchema: jsonb('input_schema').$type<{
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }>(),
    
    outputSchema: jsonb('output_schema').$type<{
      type: 'object'
      properties: Record<string, any>
    }>(),
    
    // Metadata
    tags: text('tags').array(),
    category: text('category'), // 'fiscal_analysis', 'document_processing', 'validation', etc
    version: text('version').default('1.0.0'),
    
    // Audit
    createdBy: uuid('created_by'), // .references(() => users.id)
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('workflow_templates_org_idx').on(table.organizationId),
    sharedIdx: index('workflow_templates_shared_idx').on(table.isShared),
    categoryIdx: index('workflow_templates_category_idx').on(table.category),
  })
)

/**
 * Execuções de Workflows
 * Histórico de execuções com tracking de status
 */
export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowTemplateId: uuid('workflow_template_id')
      .notNull()
      .references(() => workflowTemplates.id),
    
    // Tenant isolation
    organizationId: uuid('organization_id'), // .references(() => organizations.id)
    userId: uuid('user_id').notNull(), // .references(() => users.id)
    
    // Execution status
    status: workflowExecutionStatusEnum('status').notNull().default('pending'),
    
    // Input/Output data
    input: jsonb('input').$type<Record<string, any>>(),
    output: jsonb('output').$type<Record<string, any>>(),
    error: text('error'),
    errorStack: text('error_stack'),
    
    // Progress tracking
    currentStep: text('current_step'),
    totalSteps: text('total_steps'),
    progress: text('progress'), // Percentage as string "45"
    
    // Timing
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    
    // Execution metadata
    metadata: jsonb('metadata').$type<{
      executionMode?: 'sync' | 'async'
      priority?: 'low' | 'normal' | 'high'
      retryCount?: number
      parentExecutionId?: string
    }>(),
  },
  (table) => ({
    templateIdx: index('workflow_executions_template_idx').on(table.workflowTemplateId),
    orgIdx: index('workflow_executions_org_idx').on(table.organizationId),
    userIdx: index('workflow_executions_user_idx').on(table.userId),
    statusIdx: index('workflow_executions_status_idx').on(table.status),
    createdIdx: index('workflow_executions_created_idx').on(table.createdAt),
  })
)

/**
 * Execution Steps
 * Logs detalhados de cada step da execução
 */
export const workflowExecutionSteps = pgTable(
  'workflow_execution_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    executionId: uuid('execution_id')
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: 'cascade' }),
    
    stepName: text('step_name').notNull(),
    stepType: text('step_type'), // 'tool_call', 'llm_call', 'condition', 'transform'
    stepIndex: text('step_index').notNull(), // Order of execution
    
    status: workflowExecutionStatusEnum('status').notNull(),
    
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    
    // Tool/LLM details
    toolName: text('tool_name'),
    llmModel: text('llm_model'),
    tokensUsed: text('tokens_used'),
    
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    duration: text('duration'), // in milliseconds
  },
  (table) => ({
    executionIdx: index('workflow_execution_steps_execution_idx').on(table.executionId),
  })
)

// Relations (commented out until organizations schema is created)
/*
export const workflowTemplatesRelations = relations(workflowTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workflowTemplates.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [workflowTemplates.createdBy],
    references: [users.id],
  }),
  executions: many(workflowExecutions),
}))

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  template: one(workflowTemplates, {
    fields: [workflowExecutions.workflowTemplateId],
    references: [workflowTemplates.id],
  }),
  organization: one(organizations, {
    fields: [workflowExecutions.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [workflowExecutions.userId],
    references: [users.id],
  }),
  steps: many(workflowExecutionSteps),
}))

export const workflowExecutionStepsRelations = relations(workflowExecutionSteps, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [workflowExecutionSteps.executionId],
    references: [workflowExecutions.id],
  }),
}))
*/

