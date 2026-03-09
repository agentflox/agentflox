"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { PieChart, Download, Plus, FileText, Send, Building2, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Shareholder {
  id: string;
  name: string;
  description: string;
  shares: number;
  percentage: number;
  type: 'FOUNDER' | 'INVESTOR' | 'POOL';
}

const MOCK_CAP_TABLE: Shareholder[] = [
  { id: '1', name: 'Founders', description: 'Common Stock', shares: 8000000, percentage: 80, type: 'FOUNDER' },
  { id: '2', name: 'Seed Investors', description: 'Preferred Stock', shares: 1000000, percentage: 10, type: 'INVESTOR' },
  { id: '3', name: 'Option Pool', description: 'Reserved for Employees', shares: 1000000, percentage: 10, type: 'POOL' },
];

interface GovernanceViewProps {
  projectId: string;
}

export function GovernanceView({ projectId }: GovernanceViewProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [capTable, setCapTable] = useState<Shareholder[]>(MOCK_CAP_TABLE);
  const [loading, setLoading] = useState(true);

  // Fetch Cap Table
  useEffect(() => {
    if (!projectId) return;
    const fetchCapTable = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
        const res = await fetch(`${apiUrl}/v1/governance/projects/${projectId}/captable`, {
          headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
        });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCapTable(data.map((d: any) => ({
            id: d.id,
            name: d.holderName,
            description: d.class + ' Stock',
            shares: d.shares,
            percentage: Number(d.percentage),
            type: d.type
          })));
        } else {
          // Keep mock data if empty (for seamless demo experience if BE fails or empty)
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchCapTable();
  }, [projectId, session]);

  const generateSafe = async () => {
    setGenerating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
      const res = await fetch(`${apiUrl}/v1/governance/projects/${projectId}/safe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${session?.accessToken || ''}`
        },
        body: JSON.stringify({ type: 'VALUATION_CAP', cap: 5000000 })
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      toast({
        title: "SAFE Note Generated",
        description: data.message || "Document created.",
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate SAFE", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const sendUpdate = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
      const res = await fetch(`${apiUrl}/v1/governance/projects/${projectId}/updates/draft`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      toast({
        title: data.status === 'DRAFT' ? "Update Drafted" : "Update Sent",
        description: "Agent has analyzed project data and prepared the report.",
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to draft update", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Venture Governance</h2>
          <p className="text-muted-foreground">
            Manage equity, fundraising, and investor relations.
          </p>
        </div>
      </div>

      <Tabs defaultValue="captable" className="w-full">
        <TabsList>
          <TabsTrigger value="captable">Cap Table</TabsTrigger>
          <TabsTrigger value="fundraising">Fundraising</TabsTrigger>
          <TabsTrigger value="updates">Investor Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="captable" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Authorized Shares</CardTitle>
                <div className="text-2xl font-bold">10,000,000</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Issued Outstanding</CardTitle>
                <div className="text-2xl font-bold">9,000,000</div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Fully Diluted</CardTitle>
                <div className="text-2xl font-bold">10,000,000</div>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Cap Table</CardTitle>
                  <CardDescription>Current ownership structure.</CardDescription>
                </div>
                <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holder</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Ownership</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {capTable.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{item.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.shares.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fundraising" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Y Combinator SAFE</CardTitle>
              <CardDescription>Generate standard investment documents automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-zinc-50 hover:bg-zinc-100 transition cursor-pointer" onClick={generateSafe}>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold">Valuation Cap, No Discount</h3>
                  <p className="text-sm text-muted-foreground">Standard post-money safe.</p>
                </div>
                <div className="p-4 border rounded-lg bg-zinc-50 hover:bg-zinc-100 transition cursor-pointer">
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold">Discount, No Valuation Cap</h3>
                  <p className="text-sm text-muted-foreground">Standard discount safe.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled={generating} onClick={generateSafe}>
                {generating ? "Generating..." : "Generate Custom SAFE"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Investor Updates</CardTitle>
              <CardDescription>Keep stakeholders informed with AI-generated reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border border-l-4 border-l-green-500 rounded p-4 bg-green-50/50">
                  <h4 className="font-bold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    October 2025 Update
                    <Badge className="ml-2 bg-green-600">Sent</Badge>
                  </h4>
                  <p className="text-sm mt-1 text-green-900">Highlights: Reached 10k MRR, Launched Mobile App.</p>
                </div>

                <div className="border border-dashed rounded p-8 text-center space-y-4">
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Draft New Update</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Our agents will analyze your project activity and key metrics to draft a comprehensive update.
                    </p>
                  </div>
                  <Button onClick={sendUpdate}>
                    <Send className="mr-2 h-4 w-4" /> Draft & Send Update
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
