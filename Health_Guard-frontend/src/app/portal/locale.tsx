import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
const Context = createContext<{
  locale: "id" | "en";
  setLocale: (v: "id" | "en") => void;
  t: (id: string, en: string) => string;
}>({ locale: "id", setLocale: () => {}, t: (id) => id });
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<"id" | "en">(() =>
    localStorage.getItem("locale") === "en" ? "en" : "id",
  );
  useEffect(() => {
    localStorage.setItem("locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <Context.Provider
      value={{ locale, setLocale, t: (id, en) => (locale === "id" ? id : en) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLocale = () => useContext(Context);
