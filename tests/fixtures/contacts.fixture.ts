import { faker } from "@faker-js/faker";

export const createMockContact = (overrides = {}) => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  ...overrides,
});

export const createMockContacts = (count = 3) => Array.from({ length: count }, () => createMockContact());

export const sampleContacts = [
  { name: "John Doe", email: "john@example.com" },
  { name: "Jane Doe", email: "jane@example.com" },
  { name: "Bob Smith", email: "bob@example.com" },
];

export const invalidContacts = [
  { name: "", email: "" },
  { name: "Valid Name", email: "invalid-email" },
  { name: "", email: "valid@email.com" },
];

export const partialContacts = [
  { name: "John Doe" },
  { email: "jane@example.com" },
  { name: "Bob Smith", email: "bob@example.com" },
];
