import { vi, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";

export const setupFaker = () => {
  faker.seed(123);
};

export const createTestContext = () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFaker();
  });
};
