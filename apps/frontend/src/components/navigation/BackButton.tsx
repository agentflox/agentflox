"use client";
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onBeforeNavigate?: () => Promise<boolean>; // Return true to allow navigation, false to prevent
  fallbackPath?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function BackButton({ 
  onBeforeNavigate, 
  fallbackPath = '/dashboard/proposals',
  className = '',
  children 
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = async () => {
    if (onBeforeNavigate) {
      const canNavigate = await onBeforeNavigate();
      if (!canNavigate) {
        return; // Don't navigate if the check fails
      }
    }
    
    router.push(fallbackPath);
  };

  return (
    <Button
      variant="outline"
      onClick={handleBack}
      className={`flex max-w-16 h-16 items-center gap-2 ${className}`}
    >
      <ArrowLeft size={16} />
    </Button>
  );
}
