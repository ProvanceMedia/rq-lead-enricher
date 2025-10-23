'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dailyLimit, setDailyLimit] = useState('10');
  const [cronSchedule, setCronSchedule] = useState('0 9 * * *');
  const [apolloCriteria, setApolloCriteria] = useState('');

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

      if (data.apollo_search_criteria) {
        setApolloCriteria(JSON.stringify(data.apollo_search_criteria, null, 2));
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

      // Save Apollo criteria
      if (apolloCriteria.trim()) {
        try {
          const criteria = JSON.parse(apolloCriteria);
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'apollo_search_criteria',
              value: criteria,
              description: 'Apollo.io search criteria',
            }),
          });
        } catch (error) {
          toast.error('Invalid JSON', {
            description: 'Apollo search criteria must be valid JSON format',
          });
          setSaving(false);
          return;
        }
      }

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
        <p className="text-muted-foreground">Configure enrichment automation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrichment Schedule</CardTitle>
          <CardDescription>Configure when and how many prospects to enrich</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily Enrichment Limit</Label>
            <Input
              id="dailyLimit"
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder="10"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of prospects to enrich per day
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
              Cron expression for when to run enrichment job (default: 9 AM daily)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apollo.io Search Criteria</CardTitle>
          <CardDescription>
            Configure search criteria for pulling prospects from Apollo.io
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apolloCriteria">Search Criteria (JSON)</Label>
            <Textarea
              id="apolloCriteria"
              value={apolloCriteria}
              onChange={(e) => setApolloCriteria(e.target.value)}
              placeholder={`{
  "personTitles": ["Marketing Director", "CMO"],
  "contactEmailStatus": ["verified"]
}`}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              JSON object with Apollo.io search parameters. See Apollo API docs for available
              fields.
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
