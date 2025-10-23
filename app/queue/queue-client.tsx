'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface EnrichmentWithProspect {
  enrichment: any;
  prospect: any;
}

interface Prospect {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  companyName: string | null;
  title: string | null;
  createdAt: string;
  enrichmentStatus: string;
}

type TabType = 'pending' | 'awaiting' | 'completed';

export function QueueClient() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [enrichments, setEnrichments] = useState<EnrichmentWithProspect[]>([]);
  const [pendingProspects, setPendingProspects] = useState<Prospect[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<Set<string>>(new Set());

  const fetchPendingProspects = async () => {
    try {
      const res = await fetch('/api/prospects/pending');
      const data = await res.json();
      if (data.success) {
        setPendingProspects(data.prospects);
      }
    } catch (error) {
      console.error('Error fetching pending prospects:', error);
    }
  };

  const fetchEnrichments = async () => {
    try {
      const res = await fetch('/api/enrichments/awaiting');
      const data = await res.json();
      setEnrichments(data);
    } catch (error) {
      console.error('Error fetching enrichments:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        await fetchPendingProspects();
      } else if (activeTab === 'awaiting') {
        await fetchEnrichments();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleApprove = async (enrichmentId: string) => {
    setProcessing(enrichmentId);
    try {
      const res = await fetch(`/api/enrichments/${enrichmentId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        await fetchEnrichments();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error approving enrichment:', error);
      alert('Failed to approve enrichment');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (enrichmentId: string) => {
    const reason = prompt('Reason for rejection (optional):');

    setProcessing(enrichmentId);
    try {
      const res = await fetch(`/api/enrichments/${enrichmentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'No reason provided' }),
      });

      if (res.ok) {
        await fetchEnrichments();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error rejecting enrichment:', error);
      alert('Failed to reject enrichment');
    } finally {
      setProcessing(null);
    }
  };

  const handleEnrichSingle = async (prospectId: string) => {
    setEnriching(prev => new Set(prev).add(prospectId));
    try {
      const res = await fetch('/api/prospects/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId }),
      });

      if (res.ok) {
        await fetchPendingProspects();
        alert('Enrichment started successfully!');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error enriching prospect:', error);
      alert('Failed to enrich prospect');
    } finally {
      setEnriching(prev => {
        const next = new Set(prev);
        next.delete(prospectId);
        return next;
      });
    }
  };

  const handleEnrichBulk = async () => {
    if (selectedProspects.size === 0) {
      alert('Please select prospects to enrich');
      return;
    }

    setProcessing('bulk');
    try {
      const res = await fetch('/api/prospects/enrich-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: Array.from(selectedProspects) }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Bulk enrichment completed!\nSucceeded: ${data.succeeded}\nFailed: ${data.failed}`);
        setSelectedProspects(new Set());
        await fetchPendingProspects();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error bulk enriching:', error);
      alert('Failed to bulk enrich prospects');
    } finally {
      setProcessing(null);
    }
  };

  const toggleProspectSelection = (prospectId: string) => {
    setSelectedProspects(prev => {
      const next = new Set(prev);
      if (next.has(prospectId)) {
        next.delete(prospectId);
      } else {
        next.add(prospectId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedProspects.size === pendingProspects.length) {
      setSelectedProspects(new Set());
    } else {
      setSelectedProspects(new Set(pendingProspects.map(p => p.id)));
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enrichment Queue</h1>
          <p className="text-muted-foreground">Manage prospect enrichment workflow</p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending Enrichment ({pendingProspects.length})
        </button>
        <button
          onClick={() => setActiveTab('awaiting')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'awaiting'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Awaiting Approval ({enrichments.length})
        </button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : activeTab === 'pending' ? (
        /* Pending Enrichment Tab */
        <>
          {selectedProspects.size > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleEnrichBulk} disabled={processing === 'bulk'}>
                {processing === 'bulk' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enriching...</>
                ) : (
                  `Enrich Selected (${selectedProspects.size})`
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedProspects(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}

          {pendingProspects.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">No prospects pending enrichment</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedProspects.size === pendingProspects.length && pendingProspects.length > 0}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingProspects.map((prospect) => (
                    <TableRow key={prospect.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProspects.has(prospect.id)}
                          onChange={() => toggleProspectSelection(prospect.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        {prospect.firstName} {prospect.lastName}
                      </TableCell>
                      <TableCell>{prospect.email}</TableCell>
                      <TableCell>{prospect.companyName}</TableCell>
                      <TableCell>{prospect.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(prospect.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleEnrichSingle(prospect.id)}
                          disabled={enriching.has(prospect.id)}
                        >
                          {enriching.has(prospect.id) ? (
                            <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Enriching...</>
                          ) : (
                            'Enrich'
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      ) : enrichments.length === 0 ? (
        /* Awaiting Approval Tab - Empty State */
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">No enrichments awaiting approval</p>
          </CardContent>
        </Card>
      ) : (
        /* Awaiting Approval Tab - With Data */
        <div className="space-y-4">
          {enrichments.map(({ enrichment, prospect }) => (
            <Card key={enrichment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {prospect.firstName} {prospect.lastName}
                    </CardTitle>
                    <CardDescription>
                      {prospect.email} • {prospect.companyName}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(enrichment.id)}
                      disabled={processing !== null}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(enrichment.id)}
                      disabled={processing !== null}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Address</h3>
                    {enrichment.addressFound ? (
                      <div className="space-y-1 text-sm">
                        <p>{enrichment.companyNameForAddress}</p>
                        <p>{enrichment.streetAddressLine2}</p>
                        {enrichment.streetAddressLine3 && <p>{enrichment.streetAddressLine3}</p>}
                        <p>
                          {enrichment.city}, {enrichment.zip}
                        </p>
                        <p>{enrichment.country}</p>
                        {enrichment.addressSource && (
                          <a
                            href={enrichment.addressSource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            Source <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <Badge variant="destructive">No Address Found</Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Company Type</h3>
                    <Badge variant="secondary" className="mb-2">
                      {enrichment.companyType}
                    </Badge>
                    {enrichment.classificationReasoning && (
                      <p className="text-sm text-muted-foreground">
                        {enrichment.classificationReasoning}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">P.S. Line</h3>
                  <p className="text-sm italic">{enrichment.psLine}</p>
                  {enrichment.psSource && enrichment.psSource !== 'default' && (
                    <a
                      href={enrichment.psSource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1 mt-1"
                    >
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Enriched: {formatDate(enrichment.enrichmentCompletedAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
