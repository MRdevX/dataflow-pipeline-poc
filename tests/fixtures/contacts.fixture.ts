import { faker } from "@faker-js/faker";

export const createMockContact = (overrides = {}) => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  source: faker.company.name(),
  ...overrides,
});

export const createMockContacts = (count = 3) => Array.from({ length: count }, () => createMockContact());

export const sampleContacts = [
  { name: "John Doe", email: "john@example.com", source: "Test Company" },
  { name: "Jane Doe", email: "jane@example.com", source: "Test Company" },
  { name: "Bob Smith", email: "bob@example.com", source: "Test Company" },
];

export const invalidContacts = [
  { name: "", email: "", source: "Test Company" },
  { name: "Valid Name", email: "invalid-email", source: "Test Company" },
  { name: "", email: "valid@email.com", source: "Test Company" },
];

export const partialContacts = [
  { name: "John Doe", source: "Test Company" },
  { email: "jane@example.com", source: "Test Company" },
  { name: "Bob Smith", email: "bob@example.com", source: "Test Company" },
];
