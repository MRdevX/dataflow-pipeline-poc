export interface ImportRequest {
	source: string;
	data: Record<string, unknown>[];
}

export interface ImportResponse {
	jobId: string;
}
