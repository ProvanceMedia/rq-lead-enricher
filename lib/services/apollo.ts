import axios, { type AxiosInstance } from 'axios';

const APOLLO_API_BASE = 'https://api.apollo.io/v1';

export interface ApolloSearchCriteria {
  personTitles?: string[];
  organizationNumEmployeesRanges?: string[];
  organizationLocations?: string[];
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
      const response = await this.client.post(
        '/mixed_people/search',
        {
          page: criteria.page || 1,
          per_page: criteria.perPage || 25,
          person_titles: criteria.personTitles,
          organization_num_employees_ranges: criteria.organizationNumEmployeesRanges,
          organization_locations: criteria.organizationLocations,
          organization_industry_tag_ids: criteria.organizationIndustryTagIds,
          contact_email_status: criteria.contactEmailStatus || ['verified'],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );

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
}
