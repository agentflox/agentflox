"use client";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { PageHeader } from "@/entities/shared/components/PageHeader";
import { SearchSection } from "@/entities/shared/components/SearchSection";
import { useListingList, ListingCard } from "@/entities/listing";
import { Store, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ListingsPage() {
    const router = useRouter();
    const { listings, isLoading, query, setQuery, viewMode, setViewMode } = useListingList();

    const handleCreateListing = () => {
        // Handle routing or showing a modal for creating a new listing
        console.log("Create listing");
    };

    return (
        <Shell>
            <div className="space-y-6">
                <PageHeader
                    title="My Listings"
                    description="Manage your published items on the marketplace."
                />

                <SearchSection
                    searchValue={query}
                    searchPlaceholder="Search listings..."
                    resultsCount={listings?.length ?? 0}
                    onSearchChange={setQuery}
                    onSearchSubmit={() => {}}
                    onCreateNew={handleCreateListing}
                    createButtonText="New listing"
                    showFilters={false}
                    showSort={false}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

                {isLoading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-[200px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50" />
                        ))}
                    </div>
                ) : listings && listings.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {listings.map((item) => (
                            <ListingCard
                                key={item.id}
                                listing={item}
                                onClick={() => router.push(`/listings/${item.id}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 shadow-sm">
                            <Store className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">No listings found</h3>
                        <p className="mt-1 text-sm text-zinc-500 max-w-sm">
                            {query ? "Try adjusting your search criteria." : "You haven't published anything to the marketplace yet. Get started by creating your first listing."}
                        </p>
                        <Button 
                            onClick={handleCreateListing} 
                            variant="outline" 
                            className="mt-6 border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 font-medium"
                        >
                            <Plus className="mr-2 w-4 h-4" />
                            Create Listing
                        </Button>
                    </div>
                )}
            </div>
        </Shell>
    );
}

