export interface Contact {
	id?: string;
	name: string;
	email: string;
	source: string;
	imported_at?: string;
}

export interface ContactInput {
	name: string;
	email: string;
	source: string;
}
