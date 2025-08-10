import { config } from "../config/index.js";

export abstract class BaseHttpClient {
	protected baseUrl: string;
	protected apiKey: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
		this.apiKey = config.supabase.serviceRoleKey;
	}

	protected async makeRequest(
		endpoint: string,
		options: RequestInit = {},
	): Promise<Response> {
		const url = `${this.baseUrl}${endpoint}`;

		const defaultHeaders = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`,
			apikey: this.apiKey,
		};

		const response = await fetch(url, {
			...options,
			headers: {
				...defaultHeaders,
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`${this.constructor.name} API error: ${response.status} ${response.statusText} - ${errorText}`,
			);
		}

		return response;
	}
}
