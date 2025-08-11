import { vi } from "vitest";

export const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      list: vi.fn(() => ({ error: null })),
      upload: vi.fn(() => ({ error: null })),
      download: vi.fn(() => ({ error: null, data: "test data" })),
      remove: vi.fn(() => ({ error: null })),
    })),
  },
};

export const createSupabaseMock = () => ({
  supabase: mockSupabase,
});

export const setupSupabaseMock = () => {
  vi.mock("../../src/utils/supabase.client.js", () => createSupabaseMock());
};
