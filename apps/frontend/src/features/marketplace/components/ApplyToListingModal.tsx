"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MarketplaceListing } from "../types/marketplace.types";
import { ApplyToListingForm } from "./ApplyToListingForm";

interface ApplyToListingModalProps {
  listing: MarketplaceListing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyToListingModal({ listing, open, onOpenChange }: ApplyToListingModalProps) {
  const handleClose = (open: boolean) => {
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6">
          {/* Mount form only when open — avoids unused application query observers */}
          {open && <ApplyToListingForm listing={listing} onCancel={() => handleClose(false)} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
