"use client";
import { cn } from "@/lib/utils";
import { Sparkles, LayoutList, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Protect } from "@/features/permissions/components/Protect";
import { Capability } from "@/features/permissions/capabilities";
import PostListingWizard from "../../components/PostListingWizard";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface MainHeaderProps {
  className?: string;
}

export default function MainHeader({ className }: MainHeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogin = () => {
    const mainAppLoginUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000';
    const callbackUrl = encodeURIComponent(window.location.href);
    window.location.href = `${mainAppLoginUrl}/login?callbackUrl=${callbackUrl}`;
  };

  return (
    <div className={cn("sticky top-0 z-50 w-full bg-background border-b border-border/50", className)}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 cursor-pointer" onClick={() => router.push('/marketplace')}>
            Agentflox Marketplace
            <Sparkles className="h-4 w-4 text-primary fill-primary/50" />
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => router.push('/personal?tab=my_listings')} className="hidden sm:flex text-muted-foreground hover:text-foreground">
                <LayoutList className="w-4 h-4 mr-2" />
                My Listings
              </Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/personal?tab=earnings')} className="hidden sm:flex text-muted-foreground hover:text-foreground">
                <ShoppingBag className="w-4 h-4 mr-2" />
                My Purchases
              </Button>

              <Protect permission={Capability.MARKETPLACE_LIST_ITEM}>
                <PostListingWizard />
              </Protect>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={handleLogin}>
              Log in
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
