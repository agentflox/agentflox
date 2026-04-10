"use client";

import React, { useState } from "react";
import { Plus, Loader2, X, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUpload, type MediaFile } from "@/components/ui/media-upload";
import { MultiFileUpload } from "@/components/ui/files-upload";
import { Switch } from "@/components/ui/switch";

const TOOL_CATEGORIES = [
  { value: "design", label: "Design" },
  { value: "development", label: "Development" },
  { value: "marketing", label: "Marketing" },
  { value: "productivity", label: "Productivity" },
  { value: "analytics", label: "Analytics" },
  { value: "collaboration", label: "Collaboration" },
  { value: "other", label: "Other" },
];

type ToolCreationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
};

export function ToolCreationModal({ open, onOpenChange, onCreated }: ToolCreationModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    productUrl: "",
    externalUrl: "",
    thumbnailUrl: "",
    fileUrl: "",
    isPublic: true,
  });
  const [featureImage, setFeatureImage] = useState<MediaFile[]>([]);
  const [priceInput, setPriceInput] = useState("0.00");

  const handleClearForm = () => {
    setForm({
      name: "",
      description: "",
      category: "",
      productUrl: "",
      externalUrl: "",
      thumbnailUrl: "",
      fileUrl: "",
      isPublic: true,
    });
    setFeatureImage([]);
    setPriceInput("0.00");
    createTool.reset();
  };

  const createTool = trpc.compositeTool.create.useMutation({
    onSuccess: async (data) => {
      toast({
        title: "Tool created",
        description: "Your tool has been created successfully.",
      });
      onOpenChange(false);
      onCreated?.(data.id);
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Error creating tool",
        description: error.message || "An error occurred while creating the tool.",
        variant: "destructive",
      });
    },
  });

  const isSubmitting = createTool.isPending;

  const handleFeatureImageChange = (media: MediaFile[]) => {
    setFeatureImage(media);
    const first = media[0];
    setForm((prev) => ({ ...prev, thumbnailUrl: first?.url || "" }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }
    setPriceInput(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Tool name is required", variant: "destructive" });
      return;
    }
    if (!form.category.trim()) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    const functionSchema = {
      name: trimmedName,
      description: trimmedDescription || undefined,
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
      returns: {
        type: "object",
        properties: {},
      },
    };

    createTool.mutate({
      name: trimmedName,
      description: trimmedDescription || undefined,
      category: form.category,
      functionSchema,
      steps: [],
      isPublic: form.isPublic,
    } as any);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleClearForm();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4 border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Add New Tool
            </DialogTitle>
            <DialogDescription>
              Share a tool with the community or list it in the marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2">Basic Details</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Tool Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="Enter tool name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    inputMode="decimal"
                    type="text"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Set to 0.00 for a free tool.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this tool does and how it can help others"
                  className="min-h-[120px]"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">This description will be displayed on the tool's page.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productUrl">Tool URL <span className="text-red-500">*</span></Label>
                <Input
                  id="productUrl"
                  placeholder="https://example.com/tool"
                  value={form.productUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, productUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Link to the tool's website or download page.</p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2">Media & Access</h3>

              <div className="space-y-2">
                <Label>Feature Image</Label>
                <div className="relative w-full h-40 bg-muted rounded-md border border-dashed flex items-center justify-center overflow-hidden">
                  {form.thumbnailUrl ? (
                    <>
                      <img src={form.thumbnailUrl} alt="Feature image preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button type="button" variant="destructive" size="sm" onClick={() => { handleFeatureImageChange([]); }}>
                          <X className="h-4 w-4 mr-2" /> Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <MediaUpload
                      bucket="attachments"
                      pathPrefix={`tools/thumbnails`}
                      maxFiles={1}
                      onChange={handleFeatureImageChange}
                      initialMedia={featureImage}
                      hideList
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Shown as the cover image for this tool. Max size 2MB.</p>
              </div>

              <div className="space-y-2">
                <Label>Tool File</Label>
                <MultiFileUpload
                  bucket="attachments"
                  pathPrefix={`tools`}
                  maxFiles={1}
                  onFilesChange={(uploaded) => {
                    const first = uploaded[0];
                    setForm((prev) => ({ ...prev, fileUrl: first?.url || "" }));
                  }}
                />
                <p className="text-xs text-muted-foreground">Optional. The main downloadable file (e.g., ZIP, installer).</p>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic">Public Access</Label>
                  <p className="text-xs text-muted-foreground">Allow all users to view and access this tool.</p>
                </div>
                <Switch
                  id="isPublic"
                  checked={form.isPublic}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isPublic: checked }))}
                />
              </div>
            </div>
          </div>

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
                  Add Tool
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ToolCreationModal;
