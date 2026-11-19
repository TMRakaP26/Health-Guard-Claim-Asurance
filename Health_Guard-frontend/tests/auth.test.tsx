import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../src/app/api/client";
import { AuthProvider, useAuth } from "../src/app/state/AuthContext";

vi.mock("../src/app/api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
function Session() {
  const { user, isLoading, login, logout } = useAuth();
  return (
    <>
      <p>{isLoading ? "Loading" : user?.name || "Guest"}</p>
      <button
        onClick={() =>
          void login({
            email: "patient@example.test",
            password: "test-password",
          })
        }
      >
        Login
      </button>
      <button onClick={() => void logout()}>Logout</button>
    </>
  );
}
beforeEach(() => vi.resetAllMocks());
it("does not restore a user from stale local profile data without a token", async () => {
  localStorage.setItem(
    "auth_user",
    JSON.stringify({ name: "Stale admin", role: "admin" }),
  );
  render(
    <AuthProvider>
      <Session />
    </AuthProvider>,
  );
  expect(await screen.findByText("Guest")).toBeInTheDocument();
  expect(localStorage.getItem("auth_user")).toBeNull();
  expect(api.get).not.toHaveBeenCalled();
});
it("restores the session from the authenticated API", async () => {
  localStorage.setItem("auth_token", "test-only-token");
  vi.mocked(api.get).mockResolvedValue({
    data: { name: "Patient", role: "client" },
  });
  render(
    <AuthProvider>
      <Session />
    </AuthProvider>,
  );
  expect(await screen.findByText("Patient")).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/user");
});
it("does not show protected user data after session restoration fails", async () => {
  localStorage.setItem("auth_token", "expired-test-token");
  vi.mocked(api.get).mockRejectedValue(new Error("Unauthorized"));
  render(
    <AuthProvider>
      <Session />
    </AuthProvider>,
  );
  expect(await screen.findByText("Guest")).toBeInTheDocument();
});
it("logs in and logs out, clearing the token and user", async () => {
  vi.mocked(api.post)
    .mockResolvedValueOnce({
      data: {
        token: "test-only-token",
        user: {
          name: "Patient",
          email: "patient@example.test",
          role: "client",
        },
      },
    })
    .mockResolvedValueOnce({ data: {} });
  render(
    <AuthProvider>
      <Session />
    </AuthProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Login" }));
  expect(await screen.findByText("Patient")).toBeInTheDocument();
  expect(localStorage.getItem("auth_token")).toBe("test-only-token");
  expect(document.cookie).not.toContain("test-password");
  await userEvent.click(screen.getByRole("button", { name: "Logout" }));
  await waitFor(() => expect(localStorage.getItem("auth_token")).toBeNull());
  expect(screen.getByText("Guest")).toBeInTheDocument();
  expect(api.post).toHaveBeenLastCalledWith("/logout");
});
