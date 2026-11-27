import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { vi, describe, it, expect, beforeEach } from "vitest";
import api from "../src/app/api/client";
import { ClaimList } from "../src/app/portal/ClaimList";
import { ClaimDetail } from "../src/app/portal/ClaimDetail";
import { ClaimForm } from "../src/app/portal/ClaimForm";
import { LocaleProvider } from "../src/app/portal/locale";
import { useAuth } from "../src/app/state/AuthContext";
import {
  fileAccept,
  formatAmount,
  normalizeAmount,
  rupiah,
  validateFile,
} from "../src/app/portal/shared";
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
  useAuth: vi.fn(),
}));
const clientUser = {
  user: { id: 1, role: "client", name: "Patient" },
  isLoading: false,
} as unknown as ReturnType<typeof useAuth>;
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
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue(clientUser);
});
function mockDetail(status = "Needs Info", history: unknown[] = []) {
  vi.mocked(api.get).mockImplementation(async (url) => ({
    data: String(url).includes("/history?")
      ? { data: history, meta: { last_page: 1 } }
      : String(url).endsWith("/document-requests")
        ? []
        : url === "/catalog"
          ? { providers: [], categories: [], features: {} }
          : { ...claim, status },
  }));
}
describe("analyst decision guard", () => {
  it("requires an explicit decision instead of preselecting Approved", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 2, role: "analyst", name: "Analyst" },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>);
    mockDetail("Pending");
    mount(<ClaimDetail />, "/claims/CLM-2026-001");
    const select = await screen.findByRole("combobox", { name: /Status/ });
    expect(select).toHaveValue("");
    expect(
      within(select).getByRole("option", { name: "Pilih keputusan" }),
    ).toBeDisabled();
  });
});

describe("claim history and statuses", () => {
  it.each([
    "Pending",
    "Approved",
    "Rejected",
    "Needs Info",
    "Partially Approved",
  ])("renders %s in the current status badge", async (status) => {
    mockDetail(status);
    const { container } = mount(<ClaimDetail />, "/claims/CLM-2026-001");
    await screen.findByRole("heading", { name: "CLM-2026-001" });
    expect(container.querySelector(".page-header .badge")).toHaveTextContent(
      status,
    );
  });
  it("renders an explicit empty history state", async () => {
    mockDetail();
    mount(<ClaimDetail />, "/claims/CLM-2026-001");
    expect(
      await screen.findByText("Belum ada histori klaim."),
    ).toBeInTheDocument();
  });
  it("renders actor, transition, note and amount", async () => {
    mockDetail("Partially Approved", [
      {
        id: 1,
        event: "status_changed",
        from_status: "Pending",
        to_status: "Partially Approved",
        notes: "Receipt reviewed",
        approved_amount: "200.25",
        actor: { name: "Reviewer" },
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    mount(<ClaimDetail />, "/claims/CLM-2026-001");
    await screen.findByText("status changed");
    const timeline = within(
      screen
        .getByRole("heading", { name: "Histori klaim" })
        .closest("section")!,
    );
    expect(
      timeline.getByText("Pending → Partially Approved"),
    ).toBeInTheDocument();
    expect(timeline.getByText("Receipt reviewed")).toBeInTheDocument();
    expect(timeline.getByText(/Reviewer/)).toBeInTheDocument();
    expect(timeline.getByText(/200,25/)).toBeInTheDocument();
  });
  it("retries a failed history request independently", async () => {
    mockDetail();
    const original = vi.mocked(api.get).getMockImplementation()!;
    vi.mocked(api.get).mockImplementation((...args) =>
      String(args[0]).includes("/history?")
        ? Promise.reject(new Error("History offline"))
        : original(...args),
    );
    mount(<ClaimDetail />, "/claims/CLM-2026-001");
    await screen.findByText("History offline", { exact: false });
    mockDetail();
    await userEvent.click(
      screen.getByRole("button", { name: "Coba lagi / Retry" }),
    );
    expect(
      await screen.findByText("Belum ada histori klaim."),
    ).toBeInTheDocument();
  });
});
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
  await userEvent.type(screen.getByLabelText("Rumah sakit"), "Hospital");
  await userEvent.type(screen.getByLabelText("Penyakit"), "Flu");
  await userEvent.type(screen.getByLabelText("Jenis layanan"), "Outpatient");
  await userEvent.type(screen.getByLabelText("Nominal klaim (IDR)"), "500");
  await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
  if (files.length)
    await userEvent.upload(
      screen.getByLabelText("Pilih dokumen pendukung"),
      files,
    );
}
describe("claim form recovery", () => {
  it("moves focus to the new step heading on next and back", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { providers: [], categories: [] },
    });
    mount(<ClaimForm />, "/claims/new");
    await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(
      screen.getByRole("heading", { name: "Langkah 2 dari 4: Layanan" }),
    ).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText("Rumah sakit")).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Kembali" }));
    expect(
      screen.getByRole("heading", { name: "Langkah 1 dari 4: Pasien" }),
    ).toHaveFocus();
    expect(screen.getByText("1. Pasien")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
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
    await userEvent.click(
      screen.getByRole("button", { name: "Halaman berikutnya" }),
    );
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
  expect(() => validateFile(new File(["PK"], "report.docx"))).not.toThrow();
  expect(() => validateFile(new File(["doc"], "report.doc"))).not.toThrow();
  expect(fileAccept.split(",")).toEqual([
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".doc",
    ".docx",
  ]);
  expect(rupiah("1234.50")).toContain("1.234,50");
  expect(rupiah("1000")).toContain("1.000");
  expect(rupiah("1000")).not.toContain(",00");
  expect(normalizeAmount("1.500.000")).toBe("1500000");
  expect(normalizeAmount("100.50")).toBe("100.50");
  expect(normalizeAmount("1.234,50")).toBe("1234.50");
  expect(formatAmount("1500000")).toBe("1.500.000");
  expect(formatAmount("100.50")).toBe("100,50");
});

describe("idempotent claim submission", () => {
  it("sends a stable submission key with the owned draft and does not delete it again", async () => {
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data:
        String(url) === "/drafts"
          ? [
              {
                id: 9,
                data: {
                  client_name: "Patient",
                  provider_name: "Hospital",
                  disease_name: "Flu",
                  type: "Outpatient",
                  amount: "500.00",
                  step: 4,
                },
                updated_at: "2026-01-01T00:00:00Z",
              },
            ]
          : {
              providers: [],
              categories: [],
              features: {},
              max_amount: 99999999.99,
            },
    }));
    vi.mocked(api.request).mockResolvedValue({ data: claim });
    mount(<ClaimForm />, "/claims/new?draft=9");
    expect(
      await screen.findByRole("heading", {
        name: "Langkah 4 dari 4: Tinjau",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hospital")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Kirim pengajuan" }),
    );
    await waitFor(() =>
      expect(api.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/claims",
          method: "post",
          data: expect.objectContaining({
            submission_key: expect.any(String),
            draft_id: 9,
          }),
        }),
      ),
    );
    const sent = vi.mocked(api.request).mock.calls[0][0] as {
      data: { submission_key?: string };
    };
    expect(sent.data.submission_key).toBeTruthy();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

describe("client identity, disease and chat UX", () => {
  it("shows a read-only client ID, local service date and the new claim labels", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        providers: [],
        categories: [],
        features: {},
        max_amount: 99999999.99,
      },
    });
    mount(<ClaimForm />, "/claims/new");
    await waitFor(() =>
      expect(screen.queryByText("Memuat / Loading…")).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText("ID Client")).toHaveValue("CL-000001");
    expect(screen.getByLabelText("ID Client")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Nama pasien")).toHaveValue("Patient");
    await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    expect(screen.getByLabelText("Tanggal layanan")).toHaveValue(
      new Date().toLocaleDateString("en-CA"),
    );
    expect(screen.getByLabelText("Rumah sakit")).toBeInTheDocument();
    expect(screen.getByLabelText("Penyakit")).toBeInTheDocument();
    expect(screen.getByLabelText("Jenis layanan")).toBeInTheDocument();
    expect(screen.queryByLabelText(/BPJS/)).not.toBeInTheDocument();
  });

  it("groups thousands while typing an amount", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        providers: [],
        categories: [],
        features: {},
        max_amount: 99999999.99,
      },
    });
    mount(<ClaimForm />, "/claims/new");
    await userEvent.click(screen.getByRole("button", { name: "Lanjut" }));
    const amount = screen.getByLabelText("Nominal klaim (IDR)");
    await userEvent.type(amount, "1500000");
    expect(amount).toHaveValue("1.500.000");
    await userEvent.clear(amount);
    await userEvent.type(amount, "100.50");
    expect(amount).toHaveValue("100,50");
  });

  it("renders hospital, disease, description and modern chat bubbles", async () => {
    const detailed = {
      ...claim,
      client_id: "CL-000001",
      disease_name: "Flu",
      description: "Demam tiga hari",
    };
    vi.mocked(api.get).mockImplementation(async (url) => ({
      data: String(url).includes("/messages?")
        ? {
            data: [
              {
                id: 2,
                user_id: 2,
                body: "Please upload the receipt",
                created_at: "2026-01-02T00:00:00Z",
                user: { id: 2, name: "Analyst", role: "analyst" },
                documents: [],
              },
              {
                id: 1,
                user_id: 1,
                body: "Here is my claim",
                created_at: "2026-01-01T00:00:00Z",
                user: { id: 1, name: "Patient", role: "client" },
                documents: [],
              },
            ],
            current_page: 1,
            last_page: 1,
            total: 2,
          }
        : String(url).includes("/history?")
          ? { data: [], meta: { last_page: 1 } }
          : String(url).endsWith("/document-requests")
            ? []
            : url === "/catalog"
              ? {
                  providers: [],
                  categories: [],
                  features: { messages: true, payments: false },
                }
              : detailed,
    }));
    mount(<ClaimDetail />, "/claims/CLM-2026-001");
    expect(
      await screen.findByRole("heading", { name: "Chat" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rumah sakit")).toBeInTheDocument();
    expect(screen.getByText("Penyakit")).toBeInTheDocument();
    expect(screen.getByText("Flu")).toBeInTheDocument();
    expect(screen.getByText("Deskripsi")).toBeInTheDocument();
    expect(screen.getByText("Demam tiga hari")).toBeInTheDocument();
    expect(screen.queryByText("BPJS")).not.toBeInTheDocument();
    const log = screen.getByRole("log", { name: "Pesan chat" });
    expect(within(log).getByText("Here is my claim")).toBeInTheDocument();
    expect(
      within(log).getByText("Please upload the receipt"),
    ).toBeInTheDocument();
    expect(within(log).getByText("Analis")).toBeInTheDocument();
    expect(log.querySelectorAll(".chat-message.mine")).toHaveLength(1);
    expect(log.querySelectorAll(".chat-message.theirs")).toHaveLength(1);
  });
});
