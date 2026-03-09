"use client";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProposalCard({
  item,
  onInterest,
  onShare,
  onOpen,
}: {
  item: any;
  onInterest?: (id: string) => void;
  onShare?: (id: string) => void;
  onOpen?: (id: string) => void;
}) {
  return (
    <Card 
      className="cursor-pointer transition hover:shadow-md"
      onClick={() => onOpen?.(item.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="leading-tight text-base sm:text-lg">
              {item.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.shortSummary}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-muted-foreground">
              {item.category}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.createdAt || item.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(item.keywords || []).slice(0, 4).map((t: string) => (
            <span key={t} className="rounded-md border px-2 py-0.5">{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={(e) => {
              e.stopPropagation(); 
              onInterest?.(item.id);
            }}
          >
            I'm Interested
          </Button>
          <Button 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              onShare?.(item.id);
            }}
          >
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
