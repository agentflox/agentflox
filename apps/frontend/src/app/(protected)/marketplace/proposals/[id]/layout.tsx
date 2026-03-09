"use client";
import Shell from '@/components/layout/Shell';
import BackButton from '@/components/navigation/BackButton';

interface ProposalLayoutProps {
  children: React.ReactNode;
}

export default function ProposalLayout({ children }: ProposalLayoutProps) {
  return (
    <Shell>
      <div className="flex justify-between">
        <BackButton 
          fallbackPath="/marketplace/proposals"
        >
          Back to Proposals
        </BackButton>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </Shell>
  );
}