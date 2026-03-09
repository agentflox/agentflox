"use client";
import Shell from "@/components/layout/Shell";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/entities/shared/components/PageHeader";

export default function UsagePage() {
  const summary = trpc.usage.summary.useQuery();
  const history = trpc.usage.history.useQuery({ page: 1, pageSize: 20 });
  const quota = summary.data;

  return (
    <Shell>
      <div className="space-y-8">
        <PageHeader
          title="Usage"
          description="View your current limits and historical consumption."
        />

        <Card className="p-6">
          <h3 className="text-xl font-medium">Current period</h3>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-muted-foreground">Projects</div>
              <div className="text-lg font-medium">{quota?.maxProjects ?? 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Teams</div>
              <div className="text-lg font-medium">{quota?.maxTeams ?? 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Storage</div>
              <div className="text-lg font-medium">{quota?.maxSupabaseStorage ?? 0} GB</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-medium">Usage history</h3>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data?.items?.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>{new Date(u.date).toLocaleDateString()}</TableCell>
                    <TableCell>{u.remainingProjects ?? '-'}</TableCell>
                    <TableCell>{u.remainingTeams ?? '-'}</TableCell>
                    <TableCell>{u.remainingCredits ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </Shell>
  );
}


