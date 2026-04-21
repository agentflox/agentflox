"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { Trash2, X, Settings2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onDeleteSelected?: (rows: TData[]) => void
  onTableReady?: (table: import("@tanstack/react-table").Table<TData>) => void
  onRowSelectionChange?: (rowSelection: Record<string, boolean>) => void
  hideToolbar?: boolean
  hideHeader?: boolean
  onlyHeader?: boolean
  columnVisibility?: import("@tanstack/react-table").VisibilityState
  onColumnVisibilityChange?: React.Dispatch<React.SetStateAction<import("@tanstack/react-table").VisibilityState>>
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onDeleteSelected,
  onTableReady,
  onRowSelectionChange,
  hideToolbar = false,
  hideHeader = false,
  onlyHeader = false,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})

  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columnVisibility = externalColumnVisibility !== undefined ? externalColumnVisibility : internalColumnVisibility;
  const setColumnVisibility = onColumnVisibilityChange || setInternalColumnVisibility;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    // we use manual pagination through our own APIs usually, so just render all rows
    enableRowSelection: true,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
      onRowSelectionChange?.(next);
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  React.useEffect(() => {
    if (onTableReady) {
      onTableReady(table)
    }
  }, [table, onTableReady])

  // Bulk action banner
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const hasSelected = selectedRows.length > 0

  return (
    <div className="w-full max-w-full min-w-0 space-y-4">
      {/* Table Toolbar Area: Column Filter */}
      {!hideToolbar && (
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className={cn(
        "w-full rounded-md border bg-card relative",
        (hideHeader || onlyHeader) && "border-0 shadow-none bg-transparent",
        onlyHeader && "mb-0 pb-0"
      )}>
        <Table containerClassName="toolbar-scroll-x">
          {(!hideHeader || onlyHeader) && (
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className={cn(onlyHeader && "hover:bg-transparent border-none")}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan} className={(header.column.columnDef.meta as any)?.className}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
          )}
          {!onlyHeader && (
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn("hover:bg-muted/50 cursor-pointer", hideHeader && "border-none")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={(cell.column.columnDef.meta as any)?.className}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>

        {/* Floating Bulk Action Banner — fixed bottom center */}
        {hasSelected && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-5 py-3 shadow-2xl shadow-zinc-200/60 backdrop-blur-md ring-1 ring-zinc-100 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
            <span className="text-sm font-medium text-zinc-700">
              {selectedRows.length} {selectedRows.length === 1 ? "item" : "items"} selected
            </span>
            <div className="h-4 w-px bg-zinc-200" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.toggleAllPageRowsSelected(false)}
              className="h-8 gap-1.5 px-3 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Deselect
            </Button>
            {onDeleteSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDeleteSelected(selectedRows.map((r) => r.original))
                  table.toggleAllPageRowsSelected(false)
                }}
                className="h-8 gap-1.5 px-3 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
