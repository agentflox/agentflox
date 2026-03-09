"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/useToast';
import { Loader2, Briefcase, CheckCircle2, Search, PenTool, Scale, ShieldCheck, Presentation } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Service {
    id: string;
    title: string;
    description: string;
    provider: string;
    price: number;
    currency: string;
    turnaroundTime: string;
    category: string;
    icon: string;
}

interface MarketplaceViewProps {
    projectId: string;
}

export function MarketplaceView({ projectId }: MarketplaceViewProps) {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
                const res = await fetch(`${apiUrl}/v1/marketplace/services`, {
                    headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
                });
                const data = await res.json();
                if (Array.isArray(data)) setServices(data);
            } catch (error) {
                console.error('Failed to fetch services', error);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, [session]);

    const handlePurchase = async (service: Service) => {
        if (!projectId) return;
        setPurchasing(service.id);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
            const res = await fetch(`${apiUrl}/v1/marketplace/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${session?.accessToken || ''}`
                },
                body: JSON.stringify({
                    projectId,
                    serviceId: service.id
                })
            });

            if (!res.ok) throw new Error('Purchase failed');

            const data = await res.json();

            toast({
                title: "Order Placed Successfully",
                description: `Your order for "${service.title}" has been created as a task.`,
            });

        } catch (error) {
            console.error(error);
            toast({
                title: "Purchase Failed",
                description: "Could not process your order. Please try again.",
                variant: "destructive"
            });
        } finally {
            setPurchasing(null);
        }
    };

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'PenTool': return <PenTool className="h-6 w-6 text-purple-500" />;
            case 'Scale': return <Scale className="h-6 w-6 text-blue-500" />;
            case 'ShieldCheck': return <ShieldCheck className="h-6 w-6 text-green-500" />;
            case 'Search': return <Search className="h-6 w-6 text-orange-500" />;
            case 'Presentation': return <Presentation className="h-6 w-6 text-pink-500" />;
            default: return <Briefcase className="h-6 w-6 text-zinc-500" />;
        }
    };

    const filteredServices = services.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full gap-6 p-6 max-w-7xl mx-auto w-full">
            <div className="space-y-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Liquid Workforce Marketplace</h2>
                    <p className="text-muted-foreground">
                        Instantly deploy external human and AI talent to accelerate your venture.
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for services (e.g. Legal, Design, Research)..."
                        className="pl-9 max-w-md bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                    {filteredServices.map(service => (
                        <Card key={service.id} className="flex flex-col hover:shadow-lg transition-all border-dashed hover:border-solid hover:border-primary/50">
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-zinc-50 rounded-lg border">
                                        {getIcon(service.icon)}
                                    </div>
                                    <Badge variant="outline" className="font-mono">
                                        {service.category}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg">{service.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="space-y-2 text-sm text-zinc-600">
                                    <div className="flex justify-between">
                                        <span>Provider:</span>
                                        <span className="font-medium text-zinc-900">{service.provider}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Turnaround:</span>
                                        <span className="font-medium text-zinc-900">{service.turnaroundTime}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between border-t pt-4 bg-zinc-50/50">
                                <div className="text-xl font-bold">
                                    {service.currency === 'USD' ? '$' : ''}{service.price}
                                </div>
                                <Button
                                    onClick={() => handlePurchase(service)}
                                    disabled={!!purchasing}
                                    variant={purchasing === service.id ? "ghost" : "default"}
                                >
                                    {purchasing === service.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Order Now"
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
