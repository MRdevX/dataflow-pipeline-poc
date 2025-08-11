export * from "./config.mock.js";
export * from "./repositories.mock.js";
export * from "./services.mock.js";
export * from "./supabase.mock.js";
export * from "./tus-client.mock.js";
export * from "./http.mock.js";

export const setupAllMocks = async () => {
  const { setupConfigMock } = await import("./config.mock.js");
  const { setupRepositoryMocks } = await import("./repositories.mock.js");
  const { setupServiceMocks } = await import("./services.mock.js");
  const { setupSupabaseMock } = await import("./supabase.mock.js");
  const { setupTusClientMock } = await import("./tus-client.mock.js");

  setupConfigMock();
  setupRepositoryMocks();
  setupServiceMocks();
  setupSupabaseMock();
  setupTusClientMock();
};
