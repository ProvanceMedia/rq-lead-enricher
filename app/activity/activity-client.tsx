'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface EnrichmentWithProspect {
  enrichment: any;
  prospect: any;
}

export function ActivityClient() {
  const [activities, setActivities] = useState<EnrichmentWithProspect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity');
      const data = await res.json();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground">Recent enrichment activity</p>
        </div>
        <Button onClick={fetchActivities} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8">
              <p className="text-center text-muted-foreground">Loading activity...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8">
              <p className="text-center text-muted-foreground">No activity found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Company Type</TableHead>
                  <TableHead>Address Found</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map(({ enrichment, prospect }) => (
                  <TableRow key={enrichment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {prospect.firstName} {prospect.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{prospect.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{prospect.companyName}</TableCell>
                    <TableCell>{getStatusBadge(enrichment.status)}</TableCell>
                    <TableCell>
                      {enrichment.companyType && (
                        <Badge variant="secondary">{enrichment.companyType}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {enrichment.addressFound ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <Badge variant="destructive">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(enrichment.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
