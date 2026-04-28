import { Sticker } from "@/components/ui/Sticker";
import { Tag } from "@/components/ui/Tag";

export default function VerifyPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <Sticker tape className="w-full max-w-md p-10 text-center">
        <Tag style={{ background: "var(--lemon)" }}>★ check your inbox</Tag>
        <h1 className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-3xl">
          めーる おくった！
        </h1>
        <p className="text-ink-soft mt-3 text-sm leading-7">
          いま送った リンクを ふんで ね。
          <br />
          ブラウザを そのまま 開いて おいて だいじょうぶ。
        </p>
        <p className="text-ink-soft mt-6 font-[family-name:var(--font-pixel)] text-xs tracking-wider uppercase">
          まだ こない とき → meiwaku（迷惑メール）も みて み て
        </p>
      </Sticker>
    </main>
  );
}
