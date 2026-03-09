import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";
import { ReactNode } from "react";

interface ActionCardItem {
  title: string;
  description: string;
  href: string;
  buttonText: string;
  variant?: "google" | "destructive" | "primary" | "outline" | "ghost" | undefined;
  icon?: ReactNode;
}

interface DashboardActionProps {
  actions: ActionCardItem[];
  columns?: 1 | 2 | 3 | 4;
}

export default function DashboardAction({ 
  actions, 
  columns = 3 
}: DashboardActionProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {actions.map((action, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {action.icon}
              {action.title}
            </CardTitle>
            <CardDescription>{action.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={action.href}>
              <Button className="w-full" variant={action.variant || "primary"}>
                {action.buttonText}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
