"use client";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamCard({ item, onOpen }: { item: any; onOpen?: (id: string) => void; }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="leading-tight text-base sm:text-lg">{item.name || item.title}</CardTitle>
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description || item.shortSummary}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{new Date(item.createdAt || item.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(item.skills || item.keywords || []).slice(0, 4).map((t: string) => (
            <span key={t} className="rounded-md border px-2 py-0.5">{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpen?.(item.id)}>Open</Button>
        </div>
      </CardContent>
    </Card>
  );
}


