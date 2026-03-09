"use client";

import React, { useState } from "react";
import { Plus, Loader2, X, AlertTriangle, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiFileUpload } from "@/components/ui/files-upload";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { Switch } from "@/components/ui/switch"; // Assuming a switch component for isPublic toggle

// --- Component Data ---
const CATEGORIES = [
  { value: "design", label: "Design" },
  { value: "development", label: "Development" },
  { value: "marketing", label: "Marketing" },
  { value: "productivity", label: "Productivity" },
  { value: "writing", label: "Writing" },
  { value: "other", label: "Other" },
];

// --- Component Types ---
type MaterialCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

// --- Initial Form State ---
const INITIAL_FORM = {
  title: "",
  description: "",
  category: "",
  priceUsd: "0",
  thumbnailUrl: "",
  fileUrl: "",
  externalUrl: "",
  isPublic: true,
};

export function MaterialCreationModal({ open, onOpenChange, onCreated }: MaterialCreationModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState(INITIAL_FORM);
  const [featureImage, setFeatureImage] = useState<MediaFile[]>([]);
  
  // Custom state for price input handling (ensuring it's numeric/currency)
  const [priceInput, setPriceInput] = useState("0.00");

  const handleClearForm = () => {
    setForm(INITIAL_FORM);
    setFeatureImage([]);
    setPriceInput("0.00");
    createMaterial.reset();
  };

  const createMaterial = trpc.material.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Material created",
        description: "Your material has been created successfully.",
      });
      onOpenChange(false);
      onCreated?.(data.id);
      router.refresh();
      handleClearForm(); // Clear form on successful creation
    },
    onError: (error) => {
      toast({
        title: "Error creating material",
        description: error.message || "An error occurred while creating the material.",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createMaterial.isPending;

  // Clean up and parse price for mutation
  const priceToSubmit = parseFloat(priceInput).toFixed(2); 

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!form.category.trim()) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }
    
    // Simple price validation (allow 0 for free materials)
    if (isNaN(parseFloat(priceToSubmit)) || parseFloat(priceToSubmit) < 0) {
        toast({ title: "Invalid Price", description: "Please enter a valid price (e.g., 9.99 or 0).", variant: "destructive" });
        return;
    }
    
    createMaterial.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priceUsd: parseFloat(priceToSubmit),
      thumbnailUrl: form.thumbnailUrl || undefined,
      fileUrl: form.fileUrl || undefined,
      externalUrl: form.externalUrl || undefined,
      isPublic: form.isPublic,
    });
  };

  // Handler for MediaUpload to simplify the image logic
  const handleFeatureImageChange = (media: MediaFile[]) => {
      setFeatureImage(media);
      const first = media[0];
      setForm((prev) => ({ ...prev, thumbnailUrl: first?.url || "" }));
  }
  
  // Handler for price input
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      // Remove any non-numeric and non-dot characters
      value = value.replace(/[^0-9.]/g, '');
      // Ensure only one decimal point
      const parts = value.split('.');
      if (parts.length > 2) {
          value = parts[0] + '.' + parts.slice(1).join('');
      }
      setPriceInput(value);
  }


  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) {
        handleClearForm();
      }
      onOpenChange(next);
    }}>
      {/* Increased max width for better two-column display */}
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4 border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Create New Material
            </DialogTitle>
            <DialogDescription>
              Share your material with the community or sell it in the marketplace.
            </DialogDescription>
          </DialogHeader>

          {/* Main Content: Two-Column Layout on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">

            {/* === COLUMN 1: Basic Information === */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2">Basic Details</h3>
                
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    placeholder="Enter material title (e.g., 'Modern React Hooks Ebook')"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                  <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Price (Moved here for better flow with category/monetization) */}
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          id="price"
                          placeholder="0.00"
                          value={priceInput}
                          onChange={handlePriceChange}
                          className="pl-10"
                          // Ensures the input type is set for better mobile UX
                          inputMode="decimal"
                          type="text" 
                      />
                  </div>
                  <p className="text-xs text-muted-foreground">Set to 0.00 for a free public material.</p>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your material in detail (supports markdown)"
                    className="min-h-[120px]"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">This description will be displayed on the material's page.</p>
                </div>
            </div>

            {/* === COLUMN 2: Media and Visibility === */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2">Media & Access</h3>

                {/* Feature Image */}
                <div className="space-y-2">
                  <Label>Feature Image</Label>
                  {/* UX Improvement: Integrated view/remove */}
                  <div className="relative w-full h-40 bg-muted rounded-md border border-dashed flex items-center justify-center overflow-hidden">
                    {form.thumbnailUrl ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.thumbnailUrl} alt="Feature image preview" className="h-full w-full object-cover" />
                             <button
                              type="button"
                              className="absolute flex items-center justify-center cursor-pointer top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5"
                              onClick={() => {
                                setFeatureImage([]);
                                setForm((prev) => ({ ...prev, thumbnailUrl: "" }));
                              }}
                              aria-label="Remove feature image"
                            >
                              {/* Using lucide X icon */}
                              <X className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <MediaUpload
                            bucket="attachments"
                            pathPrefix={`materials/thumbnails`}
                            maxFiles={1}
                            onChange={handleFeatureImageChange}
                            initialMedia={featureImage}
                            hideList
                        />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Shown as the cover image for this material. Max size 2MB.</p>
                </div>

                {/* Upload File */}
                <div className="space-y-2">
                  <Label>Material File</Label>
                  <MultiFileUpload
                    bucket="attachments"
                    pathPrefix={`materials`}
                    maxFiles={1}
                    onFilesChange={(uploaded) => {
                      const first = uploaded[0];
                      setForm((prev) => ({ ...prev, fileUrl: first?.url || "" }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Optional. The main downloadable file (e.g., PDF, ZIP).</p>
                </div>

                {/* External URL */}
                <div className="space-y-2">
                  <Label htmlFor="externalUrl">External URL</Label>
                  <Input
                    id="externalUrl"
                    placeholder="https://github.com/my-project"
                    value={form.externalUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, externalUrl: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Link to an external resource (e.g., GitHub, Figma, etc.).</p>
                </div>
                
                {/* Is Public Toggle */}
                <div className="flex items-center justify-between border-t pt-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="isPublic">Public Access</Label>
                        <p className="text-xs text-muted-foreground">Allow all users to view and download (if free) the material.</p>
                    </div>
                    <Switch
                        id="isPublic"
                        checked={form.isPublic}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isPublic: checked }))}
                    />
                </div>
            </div>

          </div>
          
          {/* Footer with Actions */}
          <DialogFooter className="pt-4 border-t mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                handleClearForm();
                onOpenChange(false);
              }} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Material
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default MaterialCreationModal;
