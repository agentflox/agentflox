"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ArrowRight, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PublicMaterialCard({ material }: { material: any }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const { data: currentUser } = trpc.user.me.useQuery();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      if (cardRef.current) setIsCompact(cardRef.current.offsetWidth < 375);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const handleView = useCallback(() => {
    if (!material?.id) return;
    router.push(`/dashboard/materials/${material.id}`);
  }, [router, material?.id]);

  const priceLabel = material?.priceUsd && material.priceUsd > 0 ? `$${material.priceUsd.toFixed(2)}` : "Free";

  return (
    <div ref={cardRef}>
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-cyan-50/30 via-white to-cyan-50/20 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl sm:rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-3xl" style={{ padding: "2px" }}>
          <div className="h-full w-full bg-white rounded-2xl sm:rounded-3xl" />
        </div>
        <div className="relative z-10">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-md">
                  {material.owner?.name?.charAt(0).toUpperCase() || "M"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">@{material.owner?.name || "anonymous"}</p>
                  <p className="text-xs text-slate-500">{material.updatedAt ? new Date(material.updatedAt).toLocaleDateString() : ""}</p>
                </div>
              </div>
              {!isCompact && (
                <div className="flex items-center gap-2">
                  <Badge variant={material.isPublic ? "default" : "secondary"}>{material.isPublic ? "Public" : "Private"}</Badge>
                </div>
              )}
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight group-hover:text-cyan-600 transition-colors line-clamp-2">
              {material.title}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {material.category && (
                <Badge className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white border-0 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold shadow-md hover:shadow-lg transition-shadow">
                  {material.category}
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-3 sm:mb-4 font-medium line-clamp-3">
              {material.description}
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex items-center justify-between py-3 sm:py-4 border-t border-slate-200 mb-3 sm:mb-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  <span className="text-xs sm:text-sm font-semibold">0</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
                  <span className="text-xs sm:text-sm font-semibold">{priceLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleView(); }} className="p-2.5 sm:p-3 rounded-full bg-white text-slate-600 hover:bg-slate-100 hover:text-cyan-600 transition-all duration-300 shadow-md hover:shadow-lg" aria-label="View details">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

