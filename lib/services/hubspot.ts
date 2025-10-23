import { Client } from '@hubspot/api-client';

export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    company?: string;
    [key: string]: any;
  };
}

export interface HubSpotContactUpdate {
  address?: string; // Company name for address field
  street_address_line_2?: string;
  street_address_line_3?: string;
  city?: string;
  zip?: string;
  country?: string;
  company_type?: string;
  lifecyclestage?: string;
  outbound_cauldron_stage?: string;
  custom_p_s__line?: string;
}

export class HubSpotService {
  private client: Client;

  constructor(accessToken?: string) {
    const token = accessToken || process.env.HUBSPOT_ACCESS_TOKEN || '';
    if (!token) {
      throw new Error(
        'HubSpot access token is required. Please set HUBSPOT_ACCESS_TOKEN environment variable in DigitalOcean App Platform: Settings > App-Level Environment Variables'
      );
    }
    this.client = new Client({ accessToken: token });
  }

  async createContact(
    email: string,
    firstName?: string,
    lastName?: string,
    companyName?: string
  ): Promise<string> {
    try {
      const properties: any = { email };
      if (firstName) properties.firstname = firstName;
      if (lastName) properties.lastname = lastName;
      if (companyName) properties.company = companyName;

      const response = await this.client.crm.contacts.basicApi.create({
        properties,
        associations: [],
      });

      return response.id;
    } catch (error: any) {
      // If contact already exists, search for it
      if (error.body?.category === 'CONFLICT') {
        const existingContact = await this.searchContactByEmail(email);
        if (existingContact) {
          return existingContact.id;
        }
      }
      console.error('HubSpot create contact error:', error.message);
      throw new Error(`Failed to create HubSpot contact: ${error.message}`);
    }
  }

  async searchContactByEmail(email: string): Promise<HubSpotContact | null> {
    try {
      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ' as any,
                value: email,
              },
            ],
          },
        ],
        properties: ['firstname', 'lastname', 'email', 'company'],
        limit: 1,
        after: 0,
        sorts: [],
      } as any);

      if (response.results.length > 0) {
        return response.results[0] as HubSpotContact;
      }
      return null;
    } catch (error: any) {
      console.error('HubSpot search error:', error.message);
      return null;
    }
  }

  async updateContact(
    contactId: string,
    updates: HubSpotContactUpdate
  ): Promise<void> {
    try {
      await this.client.crm.contacts.basicApi.update(contactId, {
        properties: updates as any,
      });
    } catch (error: any) {
      console.error('HubSpot update contact error:', error.message);
      throw new Error(`Failed to update HubSpot contact: ${error.message}`);
    }
  }

  async getContact(contactId: string): Promise<HubSpotContact | null> {
    try {
      const response = await this.client.crm.contacts.basicApi.getById(
        contactId,
        [
          'firstname',
          'lastname',
          'email',
          'company',
          'address',
          'street_address_line_2',
          'street_address_line_3',
          'city',
          'zip',
          'country',
          'company_type',
          'lifecyclestage',
          'outbound_cauldron_stage',
          'custom_p_s__line',
        ]
      );

      return response as HubSpotContact;
    } catch (error: any) {
      console.error('HubSpot get contact error:', error.message);
      return null;
    }
  }
}
