"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import clsx from "clsx";

export default function ProposalTypeCard({
  type,
  title,
  description,
  color,
  icon,
  onSelect,
  disabled,
}: {
  type: string;
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  onSelect: (type: string) => void;
  disabled: boolean;
}) {
  return (
    <Card
      className={clsx(
        "cursor-pointer transition-all hover:shadow-md",
        disabled && "cursor-not-allowed opacity-50 hover:shadow-none"
      )}
      onClick={() => {
        if (!disabled) onSelect(type);
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div
            className={clsx(
              "flex h-12 w-12 items-center justify-center rounded-full text-2xl",
              disabled ? "bg-gray-300 text-gray-500" : color
            )}
          >
            {icon}
          </div>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}
