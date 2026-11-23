import { AxiosError, type AxiosAdapter } from "axios";
import { expect, it } from "vitest";
import api from "../src/app/api/client";

it("sends the token and clears session state after a real interceptor receives 401", async () => {
  localStorage.setItem("auth_token", "test-token");
  localStorage.setItem("auth_user", "stale-profile");
  const adapter: AxiosAdapter = async (config) => {
    expect(config.headers.Authorization).toBe("Bearer test-token");
    throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
    });
  };
  await expect(api.get("/user", { adapter })).rejects.toThrow("Unauthorized");
  expect(localStorage.getItem("auth_token")).toBeNull();
  expect(localStorage.getItem("auth_user")).toBeNull();
});
it("clears the token when a password change requires reauthentication", async () => {
  localStorage.setItem("auth_token", "test-token");
  await api.put(
    "/user",
    {},
    {
      adapter: async (config) => ({
        data: { reauthenticate: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }),
    },
  );
  expect(localStorage.getItem("auth_token")).toBeNull();
});
it("preserves the session on a forbidden record", async () => {
  localStorage.setItem("auth_token", "test-token");
  await expect(
    api.get("/claims/private", {
      adapter: async (config) => {
        throw new AxiosError(
          "Forbidden",
          "ERR_BAD_REQUEST",
          config,
          undefined,
          {
            data: {},
            status: 403,
            statusText: "Forbidden",
            headers: {},
            config,
          },
        );
      },
    }),
  ).rejects.toThrow("Forbidden");
  expect(localStorage.getItem("auth_token")).toBe("test-token");
});
