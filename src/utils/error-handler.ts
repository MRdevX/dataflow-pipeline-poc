export function handleError(error: unknown, context: string): Error {
	const message = error instanceof Error ? error.message : "Unknown error";
	return new Error(`${context}: ${message}`);
}
