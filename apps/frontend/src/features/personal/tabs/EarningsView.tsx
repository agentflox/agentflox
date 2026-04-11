"use client";

import { useState } from "react";
import { DollarSign, ArrowUpRight, Clock, Award } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EarningsView() {
  const { data, isLoading } = trpc.marketplace.myEarnings.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <span className="text-sm text-muted-foreground animate-pulse">Loading earnings...</span>
      </div>
    );
  }

  const { totalCredits = 0, history = [] } = data || {};

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Your Earnings</h3>
          <p className="text-sm text-muted-foreground">Manage your marketplace payouts and credit balance.</p>
        </div>
        <Button className="gap-2">
          Request Payout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for payout</p>
          </CardContent>
        </Card>
        
        <Card className="opacity-70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Credits</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Locked in active orders</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-600 text-white border-indigo-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-50">Seller Level</CardTitle>
            <Award className="h-4 w-4 text-indigo-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level 1</div>
            <p className="text-xs text-indigo-100 mt-1">15% platform fee</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent payouts and credits received from your listings.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{record.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.listing?.title} • {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-600">+{record.amountCredits.toLocaleString()}</span>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {record.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
