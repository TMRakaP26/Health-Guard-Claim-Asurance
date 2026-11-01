import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "./state/AuthContext";
import { LocaleProvider } from "./portal/locale";
import { router } from "./routes";
export default function App() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors closeButton />
      </AuthProvider>
    </LocaleProvider>
  );
}
