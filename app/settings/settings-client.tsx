'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dailyLimit, setDailyLimit] = useState('10');
  const [cronSchedule, setCronSchedule] = useState('0 9 * * *');

  // Apollo search criteria fields
  const [personTitles, setPersonTitles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState('verified');

  // Temp input states
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();

      if (data.daily_enrichment_limit) {
        setDailyLimit(data.daily_enrichment_limit.limit?.toString() || '10');
      }

      if (data.enrichment_schedule) {
        setCronSchedule(data.enrichment_schedule.cron || '0 9 * * *');
      }

      if (data.apollo_search_criteria || data.prospect_discovery) {
        const criteria = data.apollo_search_criteria || data.prospect_discovery?.searchCriteria;
        if (criteria) {
          setPersonTitles(criteria.personTitles || []);
          setLocations(criteria.personLocations || criteria.organizationLocations || []);
          setKeywords(criteria.q_organization_keyword_tags || []);
          setCompanySizes(criteria.organizationNumEmployeesRanges || []);
          setEmailStatus(criteria.contactEmailStatus?.[0] || 'verified');
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save daily limit
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'daily_enrichment_limit',
          value: { limit: parseInt(dailyLimit) },
          description: 'Daily limit for prospect enrichment',
        }),
      });

      // Save cron schedule
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'enrichment_schedule',
          value: { cron: cronSchedule },
          description: 'Cron schedule for enrichment job',
        }),
      });

      // Save Apollo criteria as prospect_discovery setting
      const searchCriteria: any = {};
      if (personTitles.length > 0) searchCriteria.personTitles = personTitles;
      if (locations.length > 0) searchCriteria.personLocations = locations;
      if (keywords.length > 0) searchCriteria.q_organization_keyword_tags = keywords;
      if (companySizes.length > 0) searchCriteria.organizationNumEmployeesRanges = companySizes;
      searchCriteria.contactEmailStatus = [emailStatus];

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'prospect_discovery',
          value: {
            enabled: true,
            schedule: '0 9 * * *',
            dailyLimit: parseInt(dailyLimit),
            searchCriteria,
          },
          description: 'Prospect discovery configuration',
        }),
      });

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, clearInput: () => void) => {
    if (value.trim()) {
      setter(prev => [...prev, value.trim()]);
      clearInput();
    }
  };

  const removeItem = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCompanySize = (size: string) => {
    setCompanySizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure prospect discovery and enrichment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrichment Schedule</CardTitle>
          <CardDescription>Configure when and how many prospects to enrich</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily Discovery Limit</Label>
            <Input
              id="dailyLimit"
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder="10"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of prospects to discover per day
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cronSchedule">Cron Schedule</Label>
            <Input
              id="cronSchedule"
              value={cronSchedule}
              onChange={(e) => setCronSchedule(e.target.value)}
              placeholder="0 9 * * *"
            />
            <p className="text-sm text-muted-foreground">
              Cron expression for when to run discovery job (default: 9 AM daily)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apollo.io Search Criteria</CardTitle>
          <CardDescription>
            Configure who to search for in Apollo.io
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job Titles */}
          <div className="space-y-2">
            <Label>Job Titles</Label>
            <div className="flex gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem(newTitle, setPersonTitles, () => setNewTitle(''))}
                placeholder="e.g. Marketing Director"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addItem(newTitle, setPersonTitles, () => setNewTitle(''))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {personTitles.map((title, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {title}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeItem(i, setPersonTitles)}
                  />
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Job titles to search for (e.g., CMO, Marketing Director, VP Marketing)
            </p>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label>Locations</Label>
            <div className="flex gap-2">
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem(newLocation, setLocations, () => setNewLocation(''))}
                placeholder="e.g. United Kingdom"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addItem(newLocation, setLocations, () => setNewLocation(''))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {locations.map((location, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {location}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeItem(i, setLocations)}
                  />
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Geographic locations to search (e.g., United Kingdom, United States, London)
            </p>
          </div>

          {/* Company Size */}
          <div className="space-y-2">
            <Label>Company Size (Employees)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'].map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={companySizes.includes(size) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCompanySize(size)}
                >
                  {size}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Select company sizes to target
            </p>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Industry Keywords</Label>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addItem(newKeyword, setKeywords, () => setNewKeyword(''))}
                placeholder="e.g. ecommerce"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addItem(newKeyword, setKeywords, () => setNewKeyword(''))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((keyword, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {keyword}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeItem(i, setKeywords)}
                  />
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Industry keywords (e.g., ecommerce, retail, SaaS, B2B)
            </p>
          </div>

          {/* Email Status */}
          <div className="space-y-2">
            <Label>Email Verification Status</Label>
            <div className="flex gap-2">
              {['verified', 'guessed', 'unavailable', 'any'].map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={emailStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEmailStatus(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Verified emails are recommended for better deliverability
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
