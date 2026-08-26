import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataTableSkeletonProps {
  columnCount?: number;
  columns?: number;
  rowCount?: number;
  rows?: number;
  showBorder?: boolean;
}

export function DataTableSkeleton({
  columnCount,
  columns,
  rowCount,
  rows,
  showBorder = false,
}: DataTableSkeletonProps) {
  const finalColumnCount = columnCount ?? columns ?? 6;
  const finalRowCount = rowCount ?? rows ?? 10;
  return (
    <div className={cn(
        "bg-white transition-all duration-500 overflow-hidden",
        showBorder && "rounded-xl border border-zinc-200 shadow-sm"
    )}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-zinc-50">
            {Array.from({ length: finalColumnCount }).map((_, i) => (
              <TableHead key={i} className="py-4">
                <Skeleton className={cn(
                    "h-4 rounded-md bg-zinc-100/80 animate-pulse",
                    i === 0 ? "w-4" : i === 1 ? "w-24" : "w-16"
                )} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: finalRowCount }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent border-b border-zinc-50/50">
              {Array.from({ length: finalColumnCount }).map((_, j) => (
                <TableCell key={j} className="py-4">
                    <div className="flex items-center gap-3">
                        {/* Variety logic based on common table patterns */}
                        {j === 0 ? (
                            // Selection / Icon Column
                            <Skeleton className="h-4 w-4 rounded bg-zinc-100/60" />
                        ) : j === 1 ? (
                            // Primary Text Column (Name)
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32 rounded-md bg-zinc-100/80" />
                                <Skeleton className="h-2 w-20 rounded-md bg-zinc-50" />
                            </div>
                        ) : j === 2 ? (
                            // Type / Tag Column
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-6 rounded-md bg-zinc-100/60" />
                                <Skeleton className="h-3 w-16 rounded-md bg-zinc-100/40" />
                            </div>
                        ) : j === 3 ? (
                            // User / Avatar Column
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-7 w-7 rounded-full bg-zinc-100/60" />
                                <Skeleton className="h-3 w-20 rounded-md bg-zinc-100/40" />
                            </div>
                        ) : (
                            // Metadata Column (Date, Status, etc)
                            <Skeleton className={cn(
                                "h-3 rounded-md bg-zinc-100/50",
                                j % 2 === 0 ? "w-24" : "w-16"
                            )} />
                        )}
                    </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
