"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProposalView({ proposal }: { proposal: any }) {
  if (!proposal) return <p className="text-sm text-muted-foreground">No data</p>;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{proposal.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-muted-foreground">{proposal.shortSummary}</p>
            <div className="mt-4 whitespace-pre-wrap">{proposal.detailedDesc}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Type</div>
              <div>{proposal.category || proposal.type}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div>{proposal.status}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Industry</div>
              <div>{Array.isArray(proposal.industry) ? proposal.industry.join(", ") : proposal.industry}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Keywords</div>
              <div>{Array.isArray(proposal.keywords) ? proposal.keywords.join(", ") : ''}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


