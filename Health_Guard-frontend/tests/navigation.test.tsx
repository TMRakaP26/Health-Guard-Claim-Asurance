import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import api from "../src/app/api/client";
import { useAuth } from "../src/app/state/AuthContext";
import { Shell, Notifications } from "../src/app/portal/Shell";
import { ClaimForm } from "../src/app/portal/ClaimForm";
import { LocaleProvider } from "../src/app/portal/locale";
import type { User } from "../src/app/portal/types";
vi.mock("../src/app/api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../src/app/state/AuthContext", () => ({ useAuth: vi.fn() }));
function mount(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/", element: <p>Login page</p> },
      {
        element: <Shell />,
        children: [
          { path: "/claims", element: <p>Protected claims</p> },
          { path: "/claims/new", element: <ClaimForm /> },
          { path: "/claims/:id", element: <p>Claim destination</p> },
          { path: "/notifications", element: <Notifications /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>,
  );
  return router;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, name: "Patient", role: "client" } as User,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });
  vi.mocked(api.get).mockImplementation(async (url) => ({
    data:
      url === "/catalog"
        ? { providers: [], categories: [], features: {} }
        : url === "/notifications/unread-count"
          ? { count: 1 }
          : {
              data: [
                {
                  id: 1,
                  title: "Claim updated",
                  body: "Review",
                  claim_id: "CLM-2026-001",
                  is_read: false,
                },
              ],
              last_page: 1,
            },
  }));
  vi.mocked(api.post).mockResolvedValue({ data: {} });
});
it("redirects guests and preserves the requested claim URL", async () => {
  vi.mocked(useAuth).mockReturnValue({
    ...vi.mocked(useAuth).getMockImplementation()!(),
    user: null,
  });
  const router = mount("/claims/CLM-2026-001");
  expect(await screen.findByText("Login page")).toBeInTheDocument();
  expect(router.state.location.search).toBe("?next=%2Fclaims%2FCLM-2026-001");
});
it("renders protected content for an authenticated client", async () => {
  mount("/claims");
  expect(await screen.findByText("Protected claims")).toBeInTheDocument();
  expect(
    await screen.findByRole("link", { name: "Notifikasi 1" }),
  ).toBeInTheDocument();
});
it("denies the client submission form to analysts", async () => {
  vi.mocked(useAuth).mockReturnValue({
    ...vi.mocked(useAuth).getMockImplementation()!(),
    user: { id: 2, name: "Analyst", role: "analyst" } as User,
  });
  mount("/claims/new");
  expect(await screen.findByRole("alert")).toHaveTextContent("Hanya klien");
  expect(
    screen.queryByRole("button", { name: "Kirim pengajuan" }),
  ).not.toBeInTheDocument();
});
it("marks one notification and navigates to its claim", async () => {
  mount("/notifications");
  await userEvent.click(
    await screen.findByRole("button", { name: /Claim updated/ }),
  );
  expect(await screen.findByText("Claim destination")).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith("/notifications/1/read");
});
it("still navigates when marking a notification read fails", async () => {
  vi.mocked(api.post).mockRejectedValue(new Error("Offline"));
  mount("/notifications");
  await userEvent.click(
    await screen.findByRole("button", { name: /Claim updated/ }),
  );
  expect(await screen.findByText("Claim destination")).toBeInTheDocument();
});
it("refreshes both the list and unread badge after marking all read", async () => {
  mount("/notifications");
  await screen.findByRole("link", { name: "Notifikasi 1" });
  vi.mocked(api.get).mockImplementation(async (url) => ({
    data:
      url === "/notifications/unread-count"
        ? { count: 0 }
        : { data: [], last_page: 1 },
  }));
  await userEvent.click(
    screen.getByRole("button", { name: "Tandai semua dibaca" }),
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/notifications/read-all"),
  );
  expect(
    await screen.findByRole("link", { name: "Notifikasi 0" }),
  ).toBeInTheDocument();
});
