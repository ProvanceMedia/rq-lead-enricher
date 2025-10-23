import axios, { type AxiosInstance } from 'axios';

const APOLLO_API_BASE = 'https://api.apollo.io/v1';

export interface ApolloSearchCriteria {
  personTitles?: string[];
  personLocations?: string[]; // Where the person lives (cities, states, countries)
  organizationNumEmployeesRanges?: string[];
  organizationLocations?: string[]; // Where the company is headquartered
  organizationIndustryTagIds?: string[];
  q_organization_keyword_tags?: string[];
  contactEmailStatus?: string[];
  page?: number;
  perPage?: number;
}

export interface ApolloOrganizationSearchCriteria {
  organizationLocations?: string[];
  organizationNumEmployeesRanges?: string[];
  organizationIndustryTagIds?: string[];
  q_organization_keyword_tags?: string[];
  page?: number;
  perPage?: number;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  primary_domain?: string;
  linkedin_url?: string;
  industry?: string;
  phone?: string;
  num_employees?: number;
  revenue?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title: string;
  linkedin_url?: string;
  organization: {
    id: string;
    name: string;
    website_url?: string;
    primary_domain?: string;
    linkedin_url?: string;
    industry?: string;
  };
}

export class ApolloService {
  private apiKey: string;
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.APOLLO_API_KEY || '';
    if (!this.apiKey) {
      throw new Error(
        'Apollo API key is required. Please set APOLLO_API_KEY environment variable in DigitalOcean App Platform: Settings > App-Level Environment Variables'
      );
    }

    this.client = axios.create({
      baseURL: APOLLO_API_BASE,
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });
  }

  async searchPeople(criteria: ApolloSearchCriteria): Promise<ApolloContact[]> {
    try {
      const requestBody = {
        page: criteria.page || 1,
        per_page: criteria.perPage || 25,
        person_titles: criteria.personTitles,
        person_locations: criteria.personLocations,
        organization_num_employees_ranges: criteria.organizationNumEmployeesRanges,
        organization_locations: criteria.organizationLocations,
        organization_industry_tag_ids: criteria.organizationIndustryTagIds,
        contact_email_status: criteria.contactEmailStatus || ['verified'],
      };

      console.log('Apollo search request:', JSON.stringify(requestBody, null, 2));

      const response = await this.client.post(
        '/mixed_people/search',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );

      console.log(`Apollo returned ${response.data.people?.length || 0} people`);
      if (response.data.people?.length > 0) {
        console.log('Sample location from first result:', response.data.people[0].organization?.country);
      }

      return response.data.people || [];
    } catch (error: any) {
      console.error('Apollo API error:', error.response?.data || error.message);
      throw new Error(`Failed to search Apollo: ${error.message}`);
    }
  }

  async getPerson(id: string): Promise<ApolloContact | null> {
    try {
      const response = await this.client.get(
        '/people/match',
        {
          params: {
            id,
          },
        }
      );

      return response.data.person || null;
    } catch (error: any) {
      console.error('Apollo API error:', error.response?.data || error.message);
      return null;
    }
  }

  async searchOrganizations(criteria: ApolloOrganizationSearchCriteria): Promise<ApolloOrganization[]> {
    try {
      const response = await this.client.post(
        '/mixed_companies/search',
        {
          page: criteria.page || 1,
          per_page: criteria.perPage || 25,
          organization_locations: criteria.organizationLocations,
          organization_num_employees_ranges: criteria.organizationNumEmployeesRanges,
          organization_industry_tag_ids: criteria.organizationIndustryTagIds,
          q_organization_keyword_tags: criteria.q_organization_keyword_tags,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );

      return response.data.organizations || [];
    } catch (error: any) {
      console.error('Apollo API error:', error.response?.data || error.message);
      throw new Error(`Failed to search organizations: ${error.message}`);
    }
  }

  async enrichOrganization(domain: string): Promise<ApolloOrganization | null> {
    try {
      const response = await this.client.get(
        '/organizations/enrich',
        {
          params: {
            domain,
          },
        }
      );

      return response.data.organization || null;
    } catch (error: any) {
      console.error('Apollo API error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Bulk enrich people with phone numbers and emails
   * Apollo will process asynchronously and send results to webhook
   *
   * @param people - Array of people to enrich
   * @param webhookUrl - URL where Apollo will send enriched data
   * @returns Bulk enrichment ID for tracking
   */
  async bulkEnrichPeople(
    people: Array<{
      first_name?: string;
      last_name?: string;
      email?: string;
      organization_name?: string;
      domain?: string;
      id?: string;
    }>,
    webhookUrl: string,
    options?: {
      revealEmail?: boolean;
      revealPhoneNumber?: boolean;
      revealPersonalEmails?: boolean;
    }
  ): Promise<{ id: string; status: string; matches?: any[] } | null> {
    try {
      const params: Record<string, any> = {};

      if (options?.revealEmail) {
        params.reveal_email = true;
      }

      if (options?.revealPhoneNumber) {
        params.reveal_phone_number = true;
      }

      if (webhookUrl) {
        params.webhook_url = webhookUrl;
      }

      const requestBody = {
        details: people,
      };

      console.log(
        'Apollo bulk enrichment REQUEST:',
        JSON.stringify({ params, body: requestBody }, null, 2)
      );

      const response = await this.client.post('/people/bulk_match', requestBody, {
        params,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      console.log('Apollo bulk enrichment RESPONSE:', JSON.stringify(response.data, null, 2));

      // Apollo may return results immediately for small batches
      // Response format can be:
      // { "matches": [...] } - synchronous response
      // or
      // { "id": "bulk_enrichment_id", "status": "processing" } - async with webhook

      if (response.data.matches) {
        // Synchronous response - return matches directly
        return {
          id: 'sync-' + Date.now(),
          status: 'completed',
          matches: response.data.matches,
        };
      } else if (response.data.id) {
        // Async response - webhook will be called
        return {
          id: response.data.id,
          status: response.data.status || 'processing',
        };
      } else {
        console.warn('Unexpected Apollo response format:', response.data);
        return {
          id: 'unknown-' + Date.now(),
          status: 'unknown',
        };
      }
    } catch (error: any) {
      console.error('Apollo bulk enrichment error:', error.response?.data || error.message);
      throw new Error(`Failed to start bulk enrichment: ${error.message}`);
    }
  }

  /**
   * Enrich a single person with phone numbers and emails
   * This is synchronous and returns immediately
   *
   * @param person - Person to enrich
   * @returns Enriched person data
   */
  async enrichPerson(person: {
    id?: string;
    person_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    organization_name?: string;
    domain?: string;
    webhook_url?: string;
    reveal_email?: boolean;
    reveal_phone_number?: boolean;
  }): Promise<any | null> {
    try {
      const {
        webhook_url,
        person_id,
        id,
        reveal_email,
        reveal_phone_number,
        ...body
      } = person;

      const params: Record<string, any> = {};

      if (reveal_email) {
        params.reveal_email = true;
      }

      if (reveal_phone_number) {
        params.reveal_phone_number = true;
      }

      if (webhook_url) {
        params.webhook_url = webhook_url;
      }

      const effectiveId = person_id || id;
      if (effectiveId) {
        params.id = effectiveId;
      }

      console.log(
        'Apollo single enrichment REQUEST:',
        JSON.stringify({ params, body }, null, 2)
      );

      const response = await this.client.post('/people/match', body, {
        params,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      console.log('Apollo single enrichment RESPONSE:', JSON.stringify(response.data, null, 2));

      return response.data || null;
    } catch (error: any) {
      console.error('Apollo person enrichment error:', error.response?.data || error.message);
      return null;
    }
  }
}
