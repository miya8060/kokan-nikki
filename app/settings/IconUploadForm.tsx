"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";

import { uploadIcon } from "@/app/_actions/profile";
import { PuffButton } from "@/components/ui/PuffButton";
import {
  ICON_UPLOAD_ALLOWED_MIME,
  ICON_UPLOAD_MAX_BYTES,
} from "@/lib/schemas/user";

// F-USER-03: ファイル選択 → クライアント canvas で center-crop して 256x256
// jpeg に正規化 → Server Action `uploadIcon` を multipart で呼び出す。
//
// 1. 画像のリサイズはクライアントで完結させる (Server Actions のデフォルト
//    1MB 上限に対する保険、帯域節約)。スマホ写真の EXIF orientation までは
//    扱わない (preset 経路で回避できるため MVP では割愛)。
// 2. token 未設定 (Preview / 一部 dev) では Server 側でも 422 を返すが、UI を
//    disable してユーザーが空振りしないようにする。
// 3. mime / size は Server Action でも safeParse するが、UI の即時フィードバック
//    のために client 側でも先に検証する。
//
// Safari 互換のため OffscreenCanvas は使わず DOM <canvas> のみ。

const OUTPUT_PX = 256;
const PREVIEW_PX = 144;
const JPEG_QUALITY = 0.85;

type Props = { uploadEnabled: boolean };

export function IconUploadForm({ uploadEnabled }: Props) {
  const router = useRouter();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasPreview, setHasPreview] = useState(false);

  if (!uploadEnabled) {
    return (
      <div
        className="text-ink-soft mt-6 rounded-2xl border-2 border-dashed border-[color:var(--ink-soft)] bg-white/60 p-6 text-center text-xs"
        data-testid="icon-upload-disabled"
      >
        プレビュー かんきょう では がぞうの アップロードは できないよ。
        <br />
        ほんばんで ためしてね ♡
      </div>
    );
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    setError(null);
    setHasPreview(false);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!(ICON_UPLOAD_ALLOWED_MIME as readonly string[]).includes(file.type)) {
      setError("jpeg / png / webp の がぞうを えらんでね");
      return;
    }
    if (file.size > ICON_UPLOAD_MAX_BYTES) {
      setError("がぞうが おおきすぎるよ (1MB まで)");
      return;
    }

    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const img = await loadImage(objectUrl);
      drawCenterCrop(img, canvasRef.current);
      setHasPreview(true);
    } catch {
      setError("がぞうを よみこめなかったよ");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    const canvas = canvasRef.current;
    if (!canvas || !hasPreview) {
      setError("がぞうを えらんでね");
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("がぞうの しょりに しっぱいしたよ");
          return;
        }
        const file = new File([blob], "icon.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.set("file", file);
        startTransition(async () => {
          try {
            await uploadIcon(formData);
            setHasPreview(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            router.refresh();
          } catch {
            // Server Action から throw された UpdateProfileError は本番ビルドで
            // reason を保てないため、文言は一律にする (mime / size は client
            // 側で先に弾いているので、ここに来るのは想定外エラー)。
            setError("アップロードに しっぱいしたよ。もう一度ためしてね");
          }
        });
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-4"
      data-testid="icon-upload-form"
    >
      <p className="text-ink-soft text-xs">
        じぶんで えらんだ がぞうも つかえるよ。256×256 に きりぬかれるよ ♡
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <canvas
          ref={canvasRef}
          width={OUTPUT_PX}
          height={OUTPUT_PX}
          data-testid="icon-upload-preview"
          data-has-preview={hasPreview ? "true" : undefined}
          className="border-ink rounded-full border-2 bg-white shadow-[0_3px_0_var(--ink)]"
          style={{
            width: PREVIEW_PX,
            height: PREVIEW_PX,
            display: hasPreview ? "block" : "none",
          }}
        />
        {!hasPreview && (
          <div
            aria-hidden
            className="border-ink text-ink-soft flex items-center justify-center rounded-full border-2 border-dashed bg-white/40 text-xs"
            style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
          >
            ぷれびゅー
          </div>
        )}
        <label
          htmlFor={fileInputId}
          className="border-ink text-ink hover:bg-pink-soft/40 inline-flex cursor-pointer items-center justify-center rounded-2xl border-2 bg-white px-4 py-3 text-sm shadow-[0_3px_0_var(--ink)]"
        >
          ♡ がぞうを えらぶ
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={pending}
            className="sr-only"
            data-testid="icon-upload-input"
          />
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="text-pink-2 text-center text-xs"
          data-testid="icon-upload-error"
        >
          {error}
        </p>
      )}
      <div className="flex justify-center">
        <PuffButton
          type="submit"
          disabled={!hasPreview || pending}
          data-testid="icon-upload-save"
        >
          {pending ? "アップロード ちゅう…" : "♡ アップロード"}
        </PuffButton>
      </div>
    </form>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawCenterCrop(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement | null,
): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = OUTPUT_PX;
  canvas.height = OUTPUT_PX;
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.clearRect(0, 0, OUTPUT_PX, OUTPUT_PX);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_PX, OUTPUT_PX);
}
