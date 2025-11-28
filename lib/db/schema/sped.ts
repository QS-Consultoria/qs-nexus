import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  date,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'

// ================================================================
// SPED Schema - Normalização de dados contábeis/fiscais
// ================================================================

// Enum para tipo de arquivo SPED
export const spedFileTypeEnum = pgEnum('sped_file_type', [
  'ecd', // Escrituração Contábil Digital
  'ecf', // Escrituração Contábil Fiscal
  'efd_icms_ipi', // EFD ICMS/IPI
  'efd_contribuicoes', // EFD Contribuições
  'efd_reinf', // EFD-Reinf
])

// Enum para status de processamento
export const spedProcessingStatusEnum = pgEnum('sped_processing_status', [
  'pending',
  'processing',
  'completed',
  'failed',
])

// Enum para natureza da conta
export const accountNatureEnum = pgEnum('account_nature', [
  'ativo', // 1
  'passivo', // 2
  'patrimonio_liquido', // 3
  'receita', // 4
  'despesa', // 5
  'resultado', // 6
])

// Enum para tipo de conta (Sintética/Analítica)
export const accountTypeEnum = pgEnum('account_type', [
  'S', // Sintética (agrupadora)
  'A', // Analítica (movimentável)
])

// Enum para indicador de débito/crédito
export const debitCreditEnum = pgEnum('debit_credit', ['D', 'C'])

// ================================================================
// Tabela: sped_files - Arquivos SPED processados
// ================================================================
export const spedFiles = pgTable(
  'sped_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant
    organizationId: uuid('organization_id'),
    uploadedBy: uuid('uploaded_by'),

    // Identificação do arquivo
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(),
    fileHash: text('file_hash').notNull(),
    fileType: spedFileTypeEnum('file_type').notNull(),

    // Dados do registro 0000 (abertura)
    cnpj: text('cnpj').notNull(),
    companyName: text('company_name').notNull(),
    stateCode: text('state_code'), // UF
    cityCode: text('city_code'), // Código IBGE
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),

    // Metadados de processamento
    status: spedProcessingStatusEnum('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    totalRecords: integer('total_records'),
    processedRecords: integer('processed_records'),

    // Timestamps
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('sped_files_org_idx').on(table.organizationId),
    uploadedByIdx: index('sped_files_uploaded_by_idx').on(table.uploadedBy),
    cnpjIdx: index('sped_files_cnpj_idx').on(table.cnpj),
    periodIdx: index('sped_files_period_idx').on(table.periodStart, table.periodEnd),
    statusIdx: index('sped_files_status_idx').on(table.status),
  })
)

// ================================================================
// Tabela: chart_of_accounts - Plano de Contas (Registros C050)
// ================================================================
export const chartOfAccounts = pgTable(
  'chart_of_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant
    organizationId: uuid('organization_id'),

    // Referência ao arquivo SPED
    spedFileId: uuid('sped_file_id')
      .notNull()
      .references(() => spedFiles.id, { onDelete: 'cascade' }),

    // Dados da conta (C050)
    accountCode: text('account_code').notNull(), // Código da conta
    accountName: text('account_name').notNull(), // Nome da conta
    accountType: accountTypeEnum('account_type').notNull(), // S=Sintética, A=Analítica
    accountLevel: integer('account_level').notNull(), // Nível hierárquico (1-9)
    parentAccountCode: text('parent_account_code'), // Código da conta pai
    accountNature: accountNatureEnum('account_nature'), // Natureza derivada do código

    // Referência ao plano referencial (C051)
    referentialCode: text('referential_code'), // Código do plano referencial

    // Centros de custo (C052)
    costCenterCode: text('cost_center_code'),

    // Data de inclusão/alteração
    startDate: date('start_date'),

    // Metadados
    metadata: jsonb('metadata'), // Dados extras do SPED

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('coa_org_idx').on(table.organizationId),
    spedFileIdx: index('coa_sped_file_idx').on(table.spedFileId),
    accountCodeIdx: index('coa_account_code_idx').on(table.accountCode),
    parentIdx: index('coa_parent_idx').on(table.parentAccountCode),
    levelIdx: index('coa_level_idx').on(table.accountLevel),
    natureIdx: index('coa_nature_idx').on(table.accountNature),
  })
)

// ================================================================
// Tabela: account_balances - Saldos por Período (Registros I150/I155)
// ================================================================
export const accountBalances = pgTable(
  'account_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant
    organizationId: uuid('organization_id'),

    // Referências
    spedFileId: uuid('sped_file_id')
      .notNull()
      .references(() => spedFiles.id, { onDelete: 'cascade' }),
    chartOfAccountId: uuid('chart_of_account_id').references(() => chartOfAccounts.id, {
      onDelete: 'set null',
    }),

    // Identificação
    accountCode: text('account_code').notNull(),
    periodDate: date('period_date').notNull(), // Data do período (mês/ano)

    // Saldos (I155)
    initialBalance: decimal('initial_balance', { precision: 18, scale: 2 }).notNull().default('0'),
    debitTotal: decimal('debit_total', { precision: 18, scale: 2 }).notNull().default('0'),
    creditTotal: decimal('credit_total', { precision: 18, scale: 2 }).notNull().default('0'),
    finalBalance: decimal('final_balance', { precision: 18, scale: 2 }).notNull().default('0'),

    // Indicadores
    initialBalanceIndicator: debitCreditEnum('initial_balance_indicator'), // D ou C
    finalBalanceIndicator: debitCreditEnum('final_balance_indicator'), // D ou C

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('ab_org_idx').on(table.organizationId),
    spedFileIdx: index('ab_sped_file_idx').on(table.spedFileId),
    accountCodeIdx: index('ab_account_code_idx').on(table.accountCode),
    periodIdx: index('ab_period_idx').on(table.periodDate),
    accountPeriodIdx: index('ab_account_period_idx').on(table.accountCode, table.periodDate),
  })
)

// ================================================================
// Tabela: journal_entries - Lançamentos Contábeis (Registros I200)
// ================================================================
export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant
    organizationId: uuid('organization_id'),

    // Referência ao arquivo SPED
    spedFileId: uuid('sped_file_id')
      .notNull()
      .references(() => spedFiles.id, { onDelete: 'cascade' }),

    // Identificação do lançamento (I200)
    entryNumber: text('entry_number').notNull(), // Número do lançamento
    entryDate: date('entry_date').notNull(), // Data do lançamento
    entryAmount: decimal('entry_amount', { precision: 18, scale: 2 }).notNull(), // Valor total
    entryType: text('entry_type'), // Tipo do lançamento (N=Normal, E=Encerramento, etc.)

    // Histórico
    description: text('description'), // Histórico do lançamento

    // Controle
    documentNumber: text('document_number'), // Número do documento

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('je_org_idx').on(table.organizationId),
    spedFileIdx: index('je_sped_file_idx').on(table.spedFileId),
    entryDateIdx: index('je_entry_date_idx').on(table.entryDate),
    entryNumberIdx: index('je_entry_number_idx').on(table.entryNumber),
  })
)

// ================================================================
// Tabela: journal_items - Partidas do Lançamento (Registros I250)
// ================================================================
export const journalItems = pgTable(
  'journal_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant
    organizationId: uuid('organization_id'),

    // Referências
    journalEntryId: uuid('journal_entry_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'cascade' }),
    chartOfAccountId: uuid('chart_of_account_id').references(() => chartOfAccounts.id, {
      onDelete: 'set null',
    }),

    // Dados da partida (I250)
    accountCode: text('account_code').notNull(), // Código da conta
    amount: decimal('amount', { precision: 18, scale: 2 }).notNull(), // Valor da partida
    debitCredit: debitCreditEnum('debit_credit').notNull(), // D=Débito, C=Crédito

    // Histórico específico da partida
    itemDescription: text('item_description'),

    // Contrapartida (quando houver)
    contraAccountCode: text('contra_account_code'),

    // Centro de custo
    costCenterCode: text('cost_center_code'),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('ji_org_idx').on(table.organizationId),
    journalEntryIdx: index('ji_journal_entry_idx').on(table.journalEntryId),
    accountCodeIdx: index('ji_account_code_idx').on(table.accountCode),
    debitCreditIdx: index('ji_debit_credit_idx').on(table.debitCredit),
  })
)

// ================================================================
// Tabela: csv_imports - Importações de CSV
// ================================================================
export const csvImports = pgTable(
  'csv_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant
    organizationId: uuid('organization_id'),
    uploadedBy: uuid('uploaded_by'),

    // Identificação do arquivo
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(),
    fileHash: text('file_hash').notNull(),

    // Configuração de importação
    delimiter: text('delimiter').notNull().default(','),
    encoding: text('encoding').notNull().default('utf-8'),
    hasHeader: boolean('has_header').notNull().default(true),
    columnMapping: jsonb('column_mapping'), // Mapeamento de colunas

    // Schema usado
    schemaConfigId: uuid('schema_config_id'),

    // Metadados
    totalRows: integer('total_rows'),
    importedRows: integer('imported_rows'),
    status: spedProcessingStatusEnum('status').notNull().default('pending'),
    errorMessage: text('error_message'),

    // Timestamps
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('csv_imports_org_idx').on(table.organizationId),
    uploadedByIdx: index('csv_imports_uploaded_by_idx').on(table.uploadedBy),
    statusIdx: index('csv_imports_status_idx').on(table.status),
  })
)

// ================================================================
// Tabela: csv_data - Dados genéricos de CSV
// ================================================================
export const csvData = pgTable(
  'csv_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Multi-tenant
    organizationId: uuid('organization_id'),

    // Referência à importação
    csvImportId: uuid('csv_import_id')
      .notNull()
      .references(() => csvImports.id, { onDelete: 'cascade' }),

    // Dados normalizados (JSONB para flexibilidade)
    rowNumber: integer('row_number').notNull(),
    data: jsonb('data').notNull(), // Dados da linha mapeados

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    orgIdx: index('csv_data_org_idx').on(table.organizationId),
    csvImportIdx: index('csv_data_import_idx').on(table.csvImportId),
    rowNumberIdx: index('csv_data_row_idx').on(table.rowNumber),
  })
)

// ================================================================
// Types exportados
// ================================================================
export type SpedFile = typeof spedFiles.$inferSelect
export type NewSpedFile = typeof spedFiles.$inferInsert

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert

export type AccountBalance = typeof accountBalances.$inferSelect
export type NewAccountBalance = typeof accountBalances.$inferInsert

export type JournalEntry = typeof journalEntries.$inferSelect
export type NewJournalEntry = typeof journalEntries.$inferInsert

export type JournalItem = typeof journalItems.$inferSelect
export type NewJournalItem = typeof journalItems.$inferInsert

export type CsvImport = typeof csvImports.$inferSelect
export type NewCsvImport = typeof csvImports.$inferInsert

export type CsvData = typeof csvData.$inferSelect
export type NewCsvData = typeof csvData.$inferInsert

