import { config } from "../config/index.js";
import { BaseHttpClient } from "./base-http.client.js";

export class StorageClient extends BaseHttpClient {
	constructor() {
		super(`${config.supabase.url}/storage/v1`);
	}

	async uploadFile(
		bucket: string,
		fileName: string,
		data: string,
		contentType: string = "application/json",
	): Promise<void> {
		const endpoint = `/object/${bucket}/${fileName}`;

		await this.makeRequest(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": contentType,
			},
			body: data,
		});
	}

	async downloadFile(bucket: string, fileName: string): Promise<string> {
		const endpoint = `/object/${bucket}/${fileName}`;

		const response = await this.makeRequest(endpoint, {
			method: "GET",
		});

		return response.text();
	}

	async deleteFile(bucket: string, fileName: string): Promise<void> {
		const endpoint = `/object/${bucket}/${fileName}`;

		await this.makeRequest(endpoint, {
			method: "DELETE",
		});
	}
}

export const storage = new StorageClient();
