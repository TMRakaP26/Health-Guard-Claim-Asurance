import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import type { CSSProperties } from "react";
import { AuthProvider } from "./state/AuthContext";
import { LocaleProvider } from "./portal/locale";
import { router } from "./routes";
export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          richColors
          closeButton
          style={{ "--success-text": "#166534" } as CSSProperties}
        />
      </AuthProvider>
    </LocaleProvider>
  );
}
