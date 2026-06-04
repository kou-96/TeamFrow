import { LanguageSwitcher } from "./language-switcher";

export function FloatingLanguageSwitcher() {
  return (
    <div
      className="fixed z-50"
      style={{
        // header h-14 (56px) の中央にスイッチャー (高さ ~28px) を縦中央配置
        top: "calc(env(safe-area-inset-top) + 14px)",
        right: "max(env(safe-area-inset-right), 1rem)",
      }}
    >
      <LanguageSwitcher />
    </div>
  );
}
