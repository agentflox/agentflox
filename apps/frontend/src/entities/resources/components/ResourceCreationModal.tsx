"use client";

import React, { useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ResourceCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

export function ResourceCreationModal({ open, onOpenChange, onCreated }: ResourceCreationModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isForSale, setIsForSale] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [price, setPrice] = useState(0);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    isPublic: true,
  });

  const { data: categories } = trpc.resource.listCategories.useQuery();

  const createResource = trpc.resource.create.useMutation({
    onSuccess: (data) => {
      toast({ title: "Resource created", description: "Your resource has been created successfully." });
      onOpenChange(false);
      onCreated?.(data.id);
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Error creating resource",
        description: error.message || "An error occurred while creating the resource.",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createResource.isPending;

  const categoryOptions = useMemo(() => (categories || []).map((c) => ({ value: c.id, label: c.name })), [categories]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOwned) {
      toast({
        title: "Ownership required",
        description: "You must confirm that you have the right to list this resource.",
        variant: "destructive",
      });
      return;
    }
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    createResource.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      isPublic: form.isPublic,
      priceUsd: isForSale ? price : 0,
      status: "DRAFT",
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
            <DialogDescription>Share a resource with your workspace or publish it publicly.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="Enter resource title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe this resource"
                className="min-h-[100px]"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="forSale" checked={isForSale} onCheckedChange={(checked) => setIsForSale(!!checked)} />
              <Label htmlFor="forSale" className="text-sm font-medium leading-none">
                This resource is priced
              </Label>
            </div>

            {isForSale && (
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox id="isPublic" checked={form.isPublic} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isPublic: !!checked }))} />
              <Label htmlFor="isPublic" className="text-sm font-medium leading-none">
                Make this resource public
              </Label>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-start space-x-2">
                <Checkbox id="isOwned" checked={isOwned} onCheckedChange={(checked) => setIsOwned(!!checked)} className="mt-1" />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="isOwned" className="text-sm font-medium leading-none">
                    I have the right to list this resource
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    I confirm that I am the owner or have the necessary rights to list this resource.
                  </p>
                </div>
              </div>
              {!isOwned && (
                <p className="text-sm text-destructive">You must confirm your rights to publish this resource.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isOwned}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add resource
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ResourceCreationModal;

