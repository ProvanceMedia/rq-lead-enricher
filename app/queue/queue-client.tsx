'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, ExternalLink, RefreshCw, Loader2, Send, Sparkles, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface EnrichmentWithProspect {
  enrichment: any;
  prospect: any;
}

interface Prospect {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  companyName: string | null;
  title: string | null;
  createdAt: string;
  enrichmentStatus: string;
  hubspotContactId: string | null;
}

interface ProspectLogs {
  prospect: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    companyName: string | null;
    enrichmentStatus: string;
    createdAt: string;
    updatedAt: string;
  };
  rawData: any;
  apolloEnrichedData: any;
  activity: Array<{
    id: string;
    enrichmentId: string | null;
    action: string;
    details: any;
    performedBy: string | null;
    createdAt: string;
  }>;
}

type TabType = 'discovered' | 'in_hubspot' | 'awaiting' | 'approved';

export function QueueClient() {
  const [activeTab, setActiveTab] = useState<TabType>('discovered');
  const [enrichments, setEnrichments] = useState<EnrichmentWithProspect[]>([]);
  const [discoveredProspects, setDiscoveredProspects] = useState<Prospect[]>([]);
  const [hubspotProspects, setHubspotProspects] = useState<Prospect[]>([]);
  const [approvedProspects, setApprovedProspects] = useState<Prospect[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<Set<string>>(new Set());
  const [logViewer, setLogViewer] = useState<{
    prospectId: string | null;
    loading: boolean;
    error?: string | null;
    data?: ProspectLogs | null;
  }>({
    prospectId: null,
    loading: false,
  });

  const fetchDiscoveredProspects = async () => {
    try {
      const res = await fetch('/api/prospects/pending?status=discovered');
      const data = await res.json();
      if (data.success) {
        setDiscoveredProspects(data.prospects);
      }
    } catch (error) {
      console.error('Error fetching discovered prospects:', error);
    }
  };

  const fetchHubSpotProspects = async () => {
    try {
      const res = await fetch('/api/prospects/pending?status=in_hubspot');
      const data = await res.json();
      if (data.success) {
        setHubspotProspects(data.prospects);
      }
    } catch (error) {
      console.error('Error fetching HubSpot prospects:', error);
    }
  };

  const fetchApprovedProspects = async () => {
    try {
      const res = await fetch('/api/prospects/pending?status=enriched');
      const data = await res.json();
      if (data.success) {
        setApprovedProspects(data.prospects);
      }
    } catch (error) {
      console.error('Error fetching approved prospects:', error);
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
      if (activeTab === 'discovered') {
        await fetchDiscoveredProspects();
      } else if (activeTab === 'in_hubspot') {
        await fetchHubSpotProspects();
      } else if (activeTab === 'awaiting') {
        await fetchEnrichments();
      } else if (activeTab === 'approved') {
        await fetchApprovedProspects();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const openLogs = useCallback(async (prospectId: string) => {
    setLogViewer({ prospectId, loading: true });
    try {
      const res = await fetch(`/api/prospects/${prospectId}/logs`);
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load logs');
      }

      const { success, ...rest } = payload;

      setLogViewer({
        prospectId,
        loading: false,
        data: rest as ProspectLogs,
        error: undefined,
      });
    } catch (error: any) {
      const message = error.message || 'Failed to load logs';
      setLogViewer({
        prospectId,
        loading: false,
        error: message,
      });
      toast.error('Unable to load logs', { description: message });
    }
  }, []);

  const closeLogs = useCallback(() => {
    setLogViewer({
      prospectId: null,
      loading: false,
      data: undefined,
      error: undefined,
    });
  }, []);

  const copyJson = useCallback(async (value: any, label: string) => {
    try {
      const json = JSON.stringify(value, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(json);
        toast.success(`${label} copied to clipboard`);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (error: any) {
      toast.error(`Failed to copy ${label.toLowerCase()}`, {
        description: error?.message || 'Clipboard not available',
      });
    }
  }, []);

  const handleSendToHubSpot = async () => {
    if (selectedProspects.size === 0) {
      toast.warning('No prospects selected', {
        description: 'Please select at least one prospect to send to HubSpot',
      });
      return;
    }

    setProcessing('bulk');
    try {
      const res = await fetch('/api/prospects/send-to-hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: Array.from(selectedProspects) }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Sent to HubSpot!', {
          description: data.message + ' Check the "In HubSpot" tab to see the contacts.',
        });
        setSelectedProspects(new Set());

        // Switch to In HubSpot tab to show the moved prospects
        setActiveTab('in_hubspot');
        await fetchHubSpotProspects();
      } else {
        toast.error('Failed to send to HubSpot', {
          description: data.error || data.message,
        });
      }
    } catch (error) {
      console.error('Error sending to HubSpot:', error);
      toast.error('Failed to send to HubSpot', {
        description: 'An unexpected error occurred. Please try again.',
      });
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
        toast.success('Enrichment started successfully');
        await fetchHubSpotProspects();
      } else {
        const error = await res.json();
        toast.error('Failed to start enrichment', {
          description: error.error,
        });
      }
    } catch (error) {
      console.error('Error enriching prospect:', error);
      toast.error('Failed to enrich prospect', {
        description: 'An unexpected error occurred. Please try again.',
      });
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
      toast.warning('No prospects selected', {
        description: 'Please select at least one prospect to enrich',
      });
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
        toast.success('Bulk enrichment completed!', {
          description: `Succeeded: ${data.succeeded}, Failed: ${data.failed}`,
        });
        setSelectedProspects(new Set());
        await fetchHubSpotProspects();
      } else {
        const error = await res.json();
        toast.error('Bulk enrichment failed', {
          description: error.error,
        });
      }
    } catch (error) {
      console.error('Error bulk enriching:', error);
      toast.error('Failed to bulk enrich prospects', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleApprove = async (enrichmentId: string) => {
    setProcessing(enrichmentId);
    try {
      const res = await fetch(`/api/enrichments/${enrichmentId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        toast.success('Enrichment approved successfully');
        await fetchEnrichments();
      } else {
        const error = await res.json();
        toast.error('Failed to approve', {
          description: error.error,
        });
      }
    } catch (error) {
      console.error('Error approving enrichment:', error);
      toast.error('Failed to approve enrichment', {
        description: 'An unexpected error occurred. Please try again.',
      });
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
        toast.success('Enrichment rejected');
        await fetchEnrichments();
      } else {
        const error = await res.json();
        toast.error('Failed to reject', {
          description: error.error,
        });
      }
    } catch (error) {
      console.error('Error rejecting enrichment:', error);
      toast.error('Failed to reject enrichment', {
        description: 'An unexpected error occurred. Please try again.',
      });
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

  const selectAll = (prospects: Prospect[]) => {
    if (selectedProspects.size === prospects.length) {
      setSelectedProspects(new Set());
    } else {
      setSelectedProspects(new Set(prospects.map(p => p.id)));
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
          onClick={() => setActiveTab('discovered')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'discovered'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Discovered ({discoveredProspects.length})
        </button>
        <button
          onClick={() => setActiveTab('in_hubspot')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'in_hubspot'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          In HubSpot ({hubspotProspects.length})
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
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'approved'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Approved ({approvedProspects.length})
        </button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      ) : activeTab === 'discovered' ? (
        /* Discovered Tab */
        <>
          {selectedProspects.size > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleSendToHubSpot} disabled={processing === 'bulk'}>
                {processing === 'bulk' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send to HubSpot ({selectedProspects.size})</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedProspects(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}

          {discoveredProspects.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">No discovered prospects</p>
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
                        checked={selectedProspects.size === discoveredProspects.length && discoveredProspects.length > 0}
                        onChange={() => selectAll(discoveredProspects)}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Discovered</TableHead>
                    <TableHead className="text-right">Logs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discoveredProspects.map((prospect) => (
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
                          variant="ghost"
                          size="sm"
                          onClick={() => openLogs(prospect.id)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      ) : activeTab === 'in_hubspot' ? (
        /* In HubSpot Tab */
        <>
          {selectedProspects.size > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleEnrichBulk} disabled={processing === 'bulk'}>
                {processing === 'bulk' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enriching...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Enrich Selected ({selectedProspects.size})</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedProspects(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}

          {hubspotProspects.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <p className="text-center text-muted-foreground">No prospects in HubSpot ready for enrichment</p>
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
                        checked={selectedProspects.size === hubspotProspects.length && hubspotProspects.length > 0}
                        onChange={() => selectAll(hubspotProspects)}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>HubSpot ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hubspotProspects.map((prospect) => (
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
                      <TableCell>
                        <div className="text-sm">
                          {prospect.phone && <div>{prospect.phone}</div>}
                          {prospect.mobilePhone && <div className="text-muted-foreground">{prospect.mobilePhone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>{prospect.companyName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {prospect.hubspotContactId}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openLogs(prospect.id)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Logs
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEnrichSingle(prospect.id)}
                            disabled={enriching.has(prospect.id)}
                          >
                            {enriching.has(prospect.id) ? (
                              <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Enriching...</>
                            ) : (
                              <><Sparkles className="mr-2 h-3 w-3" /> Enrich</>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      ) : activeTab === 'awaiting' ? (
        /* Awaiting Approval Tab */
        enrichments.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">No enrichments awaiting approval</p>
            </CardContent>
          </Card>
        ) : (
        <div className="space-y-4">
          {enrichments.map(({ enrichment, prospect }) => (
            <Card key={enrichment.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {prospect.firstName} {prospect.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {prospect.email} • {prospect.companyName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openLogs(prospect.id)}
                      disabled={processing !== null}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Logs
                    </Button>
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

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Address</h4>
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
                    <h4 className="font-semibold mb-2">Company Type</h4>
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
                  <h4 className="font-semibold mb-2">P.S. Line</h4>
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
        )
      ) : (
        /* Approved Tab */
        approvedProspects.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">No approved prospects</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>HubSpot ID</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Logs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedProspects.map((prospect) => (
                  <TableRow key={prospect.id}>
                    <TableCell>
                      {prospect.firstName} {prospect.lastName}
                    </TableCell>
                    <TableCell>{prospect.email}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {prospect.phone && <div>{prospect.phone}</div>}
                        {prospect.mobilePhone && <div className="text-muted-foreground">{prospect.mobilePhone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{prospect.companyName}</TableCell>
                    <TableCell>{prospect.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {prospect.hubspotContactId}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(prospect.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLogs(prospect.id)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}

      {logViewer.prospectId && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Prospect Logs</h3>
                {logViewer.data && (
                  <p className="text-sm text-muted-foreground">
                    {logViewer.data.prospect.firstName} {logViewer.data.prospect.lastName} •{' '}
                    {logViewer.data.prospect.email} • Status: {logViewer.data.prospect.enrichmentStatus}
                  </p>
                )}
                {logViewer.error && (
                  <p className="text-sm text-destructive">{logViewer.error}</p>
                )}
              </div>
              <div className="flex gap-2">
                {logViewer.data?.rawData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyJson(logViewer.data?.rawData, 'Discovery payload')}
                  >
                    Copy Discovery JSON
                  </Button>
                )}
                {logViewer.data?.apolloEnrichedData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyJson(logViewer.data?.apolloEnrichedData, 'Apollo enrichment payload')}
                  >
                    Copy Enrichment JSON
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={closeLogs}>
                  Close
                </Button>
              </div>
            </div>

            {logViewer.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading logs...
              </div>
            ) : logViewer.error ? null : (
              <>
                <div className="space-y-2">
                  <h4 className="font-semibold">Discovery Payload</h4>
                  <pre className="max-h-80 overflow-auto rounded bg-muted p-4 text-xs">
                    {JSON.stringify(logViewer.data?.rawData ?? {}, null, 2)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Apollo Enrichment Payload</h4>
                  <pre className="max-h-80 overflow-auto rounded bg-muted p-4 text-xs">
                    {JSON.stringify(logViewer.data?.apolloEnrichedData ?? {}, null, 2)}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Activity Timeline</h4>
                  {logViewer.data?.activity?.length ? (
                    <ul className="space-y-2 text-sm">
                      {logViewer.data.activity.map(entry => (
                        <li key={entry.id} className="rounded border p-3">
                          <div className="flex justify-between">
                            <span className="font-medium">{entry.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(entry.createdAt)}
                            </span>
                          </div>
                          {entry.performedBy && (
                            <div className="text-xs text-muted-foreground">
                              By {entry.performedBy}
                            </div>
                          )}
                          {entry.details && (
                            <pre className="mt-2 max-h-48 overflow-auto rounded bg-background p-2 text-xs">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
