import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { transferableAbortController } from "node:util";
// React Router uses Node's Request; its signal must come from the same realm.
vi.stubGlobal(
  "AbortController",
  class {
    constructor() {
      return transferableAbortController();
    }
  },
);
// Use isolated browser storage even when the host Node runtime exposes its own
// experimental Storage globals. No test should touch host-persistent storage.
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(String(key));
    },
    setItem: (key, value) => {
      values.set(String(key), String(value));
    },
  };
}
vi.stubGlobal("localStorage", memoryStorage());
vi.stubGlobal("sessionStorage", memoryStorage());
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
