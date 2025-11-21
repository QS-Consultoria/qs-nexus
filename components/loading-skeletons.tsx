import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-3 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function FileListSkeleton() {
  return (
    <>
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <div className="border-b bg-muted/50">
            <div className="grid grid-cols-6 gap-4 p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 p-4 animate-pulse">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-full flex-1" />
                <Skeleton className="h-8 w-8 rounded shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export function FileDetailsSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-48 flex-1" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}
