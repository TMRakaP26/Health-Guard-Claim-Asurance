import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { vi, describe, it, expect, beforeEach } from "vitest";
import api from "../src/app/api/client";
import { ClaimList } from "../src/app/portal/ClaimList";
import { ClaimDetail } from "../src/app/portal/ClaimDetail";
import { ClaimForm } from "../src/app/portal/ClaimForm";
import { LocaleProvider } from "../src/app/portal/locale";
import { validateFile, rupiah } from "../src/app/portal/shared";
vi.mock("../src/app/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}));
vi.mock("../src/app/state/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, role: "client", name: "Patient" },
    isLoading: false,
  }),
}));
const claim = {
  id: 1,
  claim_id: "CLM-2026-001",
  user_id: 1,
  client_name: "Patient",
  provider_name: "Hospital",
  type: "Outpatient",
  amount: "500.00",
  approved_amount: null,
  status: "Needs Info",
  notes: "Please attach receipt",
  date_submitted: "2026-01-01T00:00:00Z",
  sla_due_at: "2026-01-04T00:00:00Z",
  documents: [],
  assigned_to: 2,
};
function mount(element: React.ReactNode, path = "/claims") {
  const router = createMemoryRouter(
    [
      { path: "/claims", element },
      { path: "/claims/:id", element },
      { path: "/claims/new", element },
      { path: "/claims/:id/edit", element },
    ],
    { initialEntries: [path] },
  );
  return render(
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>,
  );
}
beforeEach(() => vi.resetAllMocks());
async function prepareClaim(files: File[] = []) {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      providers: [],
      categories: [],
      features: {},
      max_amount: 99999999.99,
    },
  });
  vi.mocked(api.request).mockResolvedValue({ data: claim });
  mount(<ClaimForm />, "/claims/new");
  await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  await userEvent.type(screen.getByLabelText("Provider"), "Hospital");
  await userEvent.type(screen.getByLabelText("Kategori klaim"), "Outpatient");
  await userEvent.type(screen.getByLabelText("Nominal klaim (IDR)"), "500");
  await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  if (files.length)
    await userEvent.upload(
      screen.getByLabelText("Pilih dokumen pendukung"),
      files,
    );
}
describe("claim form recovery", () => {
  it("summarizes invalid fields, focuses the first and does not submit", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { providers: [], categories: [] },
    });
    mount(<ClaimForm />, "/claims/new");
    await userEvent.clear(screen.getByLabelText("Nama pasien"));
    await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Nama pasien");
    expect(screen.getByLabelText(/^Nama pasien/)).toHaveFocus();
    expect(screen.getByLabelText(/^Nama pasien/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.request).not.toHaveBeenCalled();
  });
  it("removes selected files and shows filenames in confirmation", async () => {
    await prepareClaim([
      new File(["%PDF-1.4"], "keep.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.4"], "remove.pdf", { type: "application/pdf" }),
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "Hapus remove.pdf" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(
      screen.getByRole("list", { name: "Dokumen dipilih" }),
    ).toHaveTextContent("keep.pdf");
    expect(screen.queryByText(/remove.pdf/)).not.toBeInTheDocument();
  });
  it("retries only the failed file without recreating the claim or uploading confirmed files", async () => {
    await prepareClaim([
      new File(["%PDF-1.4"], "first.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.4"], "second.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.4"], "third.pdf", { type: "application/pdf" }),
    ]);
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(new Error("Upload offline"))
      .mockResolvedValue({ data: {} });
    await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Kirim pengajuan" }),
    );
    await screen.findByRole("button", { name: "Coba ulang second.pdf" });
    await userEvent.click(
      screen.getByRole("button", { name: "Coba ulang second.pdf" }),
    );
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(3));
    expect(api.request).toHaveBeenCalledTimes(1);
    const sent = vi
      .mocked(api.post)
      .mock.calls.map((call) => (call[1] as FormData).get("file") as File);
    expect(sent.map((file) => file.name)).toEqual([
      "first.pdf",
      "second.pdf",
      "second.pdf",
    ]);
    expect(
      screen.getByRole("button", { name: "Coba ulang third.pdf" }),
    ).toBeInTheDocument();
  });
});
describe("API-driven claims", () => {
  it("renders server totals and requests another page", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [claim],
        current_page: 1,
        last_page: 2,
        total: 26,
        stats: {
          total: 26,
          amount: "13000",
          approved_amount: 0,
          by_status: {},
        },
      },
    });
    mount(<ClaimList />);
    expect(await screen.findByText("26")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "→" }));
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/claims?page=2", expect.anything()),
    );
  });
  it("loads detail by URL and offers Needs Info resubmission", async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: String(url).endsWith("/history?page=1&per_page=15")
        ? { data: [], meta: { last_page: 1 } }
        : String(url).endsWith("/document-requests")
          ? []
          : url === "/catalog"
            ? {
                providers: [],
                categories: [],
                features: { messages: false, payments: false },
              }
            : claim,
    }));
    mount(<ClaimDetail />, "/claims/CLM-2026-001");
    expect(
      await screen.findByRole("heading", { name: "CLM-2026-001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Perbaiki & ajukan ulang" }),
    ).toHaveAttribute("href", "/claims/CLM-2026-001/edit");
  });
  it("exposes retry after a failed list request", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Offline"));
    mount(<ClaimList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
    await userEvent.click(
      screen.getByRole("button", { name: "Coba lagi / Retry" }),
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
  it("saves an incomplete draft without creating a claim", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        providers: [],
        categories: [],
        features: {},
        max_amount: 99999999.99,
      },
    });
    vi.mocked(api.request).mockResolvedValue({ data: { id: 7 } });
    mount(<ClaimForm />, "/claims/new");
    await userEvent.click(screen.getByRole("button", { name: "Simpan draf" }));
    await waitFor(() =>
      expect(api.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/drafts",
          method: "post",
          data: expect.objectContaining({
            data: expect.objectContaining({ client_name: "Patient", step: 1 }),
          }),
        }),
      ),
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
it("validates upload boundaries and formats decimal currency", () => {
  expect(() => validateFile(new File([], "empty.pdf"))).toThrow();
  expect(() => validateFile(new File(["x"], "malware.exe"))).toThrow();
  expect(() =>
    validateFile(new File([new Uint8Array(10485761)], "large.pdf")),
  ).toThrow();
  expect(() =>
    validateFile(new File(["%PDF-1.4"], "receipt.pdf")),
  ).not.toThrow();
  expect(rupiah("1234.50")).toContain("1.234,50");
});
