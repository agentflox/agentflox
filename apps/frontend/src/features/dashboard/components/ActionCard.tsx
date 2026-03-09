import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Button from "@/components/ui/button";

interface ActionCardProps {
  title: string;
  description: string;
  href: string;
  buttonText: string;
  variant?: "primary" | "outline";
}

export default function ActionCard({ 
  title, 
  description, 
  href, 
  buttonText, 
  variant = "primary" 
}: ActionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button className="w-full" variant={variant}>
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
