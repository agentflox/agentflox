import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
}

export function DataTableSkeleton({
  columnCount = 6,
  rowCount = 10,
}: DataTableSkeletonProps) {
  return (
    <div className="rounded-md border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columnCount }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-5 w-full max-w-[120px] rounded-md" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              {Array.from({ length: columnCount }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton
                    className={`h-5 w-full rounded-md ${
                      // Assign different widths based on column index for a varied look
                      j === 0 ? "max-w-[40px]" : j === 1 ? "max-w-[200px]" : "max-w-[150px]"
                    }`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
