import { ReactNode } from "react";

interface MainHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function MainHeader({ 
  title, 
  description,
  children 
}: MainHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {children}
      </div>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
