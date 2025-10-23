'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Settings,
  Activity,
  ListTodo,
} from 'lucide-react';

interface Stats {
  totalProspects: number;
  awaitingApproval: number;
  approved: number;
  rejected: number;
  failed: number;
  inProgress: number;
  todayEnrichments: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [manualLimit, setManualLimit] = useState('5');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/prospects/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: parseInt(manualLimit) }),
      });

      const result = await res.json();

      if (result.success) {
        alert(
          `Successfully discovered ${result.discovered} new prospects!\n` +
          `Created: ${result.created}\n` +
          `Duplicates skipped: ${result.duplicates}`
        );
        fetchStats();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error triggering discovery:', error);
      alert('Failed to trigger discovery');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 space-y-8">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Automated lead enrichment overview</p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading stats...</p>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProspects}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.awaitingApproval}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.approved}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Enrichments</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayEnrichments}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.inProgress}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.rejected}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.failed}</div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Manual Discovery Trigger</CardTitle>
            <CardDescription>
              Manually discover new prospects from Apollo.io
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xs space-y-2">
                <Label htmlFor="manualLimit">Number of Prospects</Label>
                <Input
                  id="manualLimit"
                  type="number"
                  value={manualLimit}
                  onChange={(e) => setManualLimit(e.target.value)}
                  min="1"
                  max="50"
                />
              </div>
              <Button onClick={handleManualTrigger} disabled={triggering}>
                <Play className="mr-2 h-4 w-4" />
                {triggering ? 'Running...' : 'Discover Prospects'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This will search Apollo.io for new prospects and add them to the queue for enrichment.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Link href="/queue">
              <Button variant="outline">
                <ListTodo className="mr-2 h-4 w-4" />
                View Queue
              </Button>
            </Link>
            <Link href="/activity">
              <Button variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                View Activity
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configure Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
