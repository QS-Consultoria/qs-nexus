'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, ArrowUpDown } from 'lucide-react'

export interface FilterState {
  search: string
  status: string
  documentType: string
  dateFrom: string
  dateTo: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface DocumentFiltersProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  documentTypes?: Array<{ value: string; label: string }>
  showTypeFilter?: boolean
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'processing', label: 'Processando' },
  { value: 'completed', label: 'Concluído' },
  { value: 'failed', label: 'Com Erro' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Data de Upload' },
  { value: 'fileName', label: 'Nome do Arquivo' },
  { value: 'fileSize', label: 'Tamanho' },
  { value: 'status', label: 'Status' },
]

export function DocumentFilters({
  filters,
  onFilterChange,
  documentTypes,
  showTypeFilter = false,
}: DocumentFiltersProps) {
  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.documentType !== 'all' || filters.dateFrom || filters.dateTo

  const handleReset = () => {
    onFilterChange({
      search: '',
      status: 'all',
      documentType: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  }

  const toggleSortOrder = () => {
    onFilterChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    })
  }

  return (
    <div className="space-y-4">
      {/* Linha 1: Search e Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Search */}
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nome do arquivo, descrição..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange({ ...filters, status: value })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Linha 2: Tipo, Datas, Ordenação */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tipo de Documento */}
        {showTypeFilter && documentTypes && (
          <div className="space-y-2">
            <Label htmlFor="documentType">Tipo</Label>
            <Select
              value={filters.documentType}
              onValueChange={(value) => onFilterChange({ ...filters, documentType: value })}
            >
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Data De */}
        <div className="space-y-2">
          <Label htmlFor="dateFrom">Data De</Label>
          <Input
            id="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
          />
        </div>

        {/* Data Até */}
        <div className="space-y-2">
          <Label htmlFor="dateTo">Data Até</Label>
          <Input
            id="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
          />
        </div>

        {/* Ordenação */}
        <div className="space-y-2">
          <Label htmlFor="sortBy">Ordenar Por</Label>
          <div className="flex gap-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => onFilterChange({ ...filters, sortBy: value })}
            >
              <SelectTrigger id="sortBy" className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              title={filters.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  )
}

