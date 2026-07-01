"use client";

import { useState } from "react";
import { DollarSign, ArrowUpRight, Clock, Award } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EarningsView() {
  const { data, isLoading } = trpc.marketplace.myEarnings.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[150px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <Skeleton className="h-10 w-[140px]" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-1.5" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totalCredits = 0, history = [] } = data || {};

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent">
            My Earnings
          </h1>
          <p className="text-slate-600 text-sm">
            Manage your earnings
          </p>
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
