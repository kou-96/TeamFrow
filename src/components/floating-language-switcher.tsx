import { LanguageSwitcher } from "./language-switcher";

export function FloatingLanguageSwitcher() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <LanguageSwitcher />
    </div>
  );
}
