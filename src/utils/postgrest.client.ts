import { config } from "../config/index.js";
import { BaseHttpClient } from "./base-http.client.js";

export class PostgRESTClient extends BaseHttpClient {
  constructor() {
    super(`${config.supabase.url}/rest/v1`);
  }

  async insert<T>(table: string, data: T | T[]): Promise<T[]> {
    const endpoint = `/${table}`;
    const headers = {
      Prefer: "return=representation",
    };

    const response = await this.makeRequest(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    return response.json();
  }

  async select<T>(
    table: string,
    options: {
      select?: string;
      filters?: Record<string, string>;
      limit?: number;
      offset?: number;
      orderBy?: string;
    } = {}
  ): Promise<T[]> {
    const { select, filters, limit, offset, orderBy } = options;

    let endpoint = `/${table}`;
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

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.makeRequest(endpoint, {
      method: "GET",
    });

    return response.json();
  }
}

export const postgrest = new PostgRESTClient();
