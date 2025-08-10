import { config } from "../config/index.js";
import { BaseHttpClient } from "./base-http.client.js";

export interface PostgRESTSelectOptions {
  select?: string;
  filters?: Record<string, string>;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

const POSTGREST_HEADERS = {
  PREFER_REPRESENTATION: "return=representation",
} as const;

export class PostgRESTClient extends BaseHttpClient {
  constructor() {
    super(`${config.supabase.url}/rest/v1`);
  }

  async insert<T>(table: string, data: T | T[]): Promise<T[]> {
    const endpoint = `/${table}`;
    const headers = {
      Prefer: POSTGREST_HEADERS.PREFER_REPRESENTATION,
    };

    const response = await this.makeRequest(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    return response.json();
  }

  async select<T>(table: string, options: PostgRESTSelectOptions = {}): Promise<T[]> {
    const { select, filters, limit, offset, orderBy } = options;
    const params = new URLSearchParams();

    if (select) {
      params.append("select", select);
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    if (limit) {
      params.append("limit", limit.toString());
    }

    if (offset) {
      params.append("offset", offset.toString());
    }

    if (orderBy) {
      params.append("order", orderBy);
    }

    const queryString = params.toString();
    const endpoint = `/${table}${queryString ? `?${queryString}` : ""}`;

    const response = await this.makeRequest(endpoint, {
      method: "GET",
    });

    return response.json();
  }
}

export const postgrest = new PostgRESTClient();
