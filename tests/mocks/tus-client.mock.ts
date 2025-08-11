import { vi } from "vitest";

export const createTusClientMock = () => ({
  Upload: vi.fn(function MockUpload(file: any, options: any) {
    setTimeout(() => {
      if (options.onSuccess) {
        options.onSuccess();
      }
    }, 10);

    return {
      url: "https://example.com/uploaded-file",
      findPreviousUploads: vi.fn().mockResolvedValue([]),
      resumeFromPreviousUpload: vi.fn(),
      start: vi.fn(),
      onError: vi.fn(),
      onProgress: vi.fn(),
      onSuccess: vi.fn(),
    };
  }),
});

export const setupTusClientMock = () => {
  vi.mock("tus-js-client", () => createTusClientMock());
};
