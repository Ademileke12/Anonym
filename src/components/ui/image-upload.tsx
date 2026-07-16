"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadImage, type StorageBucket } from "@/services/storage/upload";
import { useToast } from "@/components/ui/toast";

type ImageUploadProps = {
  bucket: StorageBucket;
  wallet: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
  aspect?: "square" | "wide" | "cover";
  disabled?: boolean;
};

export function ImageUpload({
  bucket,
  wallet,
  value,
  onChange,
  label = "Upload image",
  className,
  aspect = "square",
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file || !wallet) return;
    setUploading(true);
    try {
      const url = await uploadImage({ file, bucket, wallet });
      onChange(url);
      toast({ title: "Image uploaded", tone: "success" });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Try again",
        tone: "error",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-sm font-medium text-ink">{label}</p>
      ) : null}
      <div
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-subtle",
          aspect === "square" && "aspect-square max-w-[160px]",
          aspect === "wide" && "aspect-[16/6] w-full",
          aspect === "cover" && "aspect-[16/5] w-full",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <button
            type="button"
            disabled={disabled || uploading || !wallet}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-muted transition-colors hover:bg-muted-bg hover:text-ink disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <span className="text-xs">
              {uploading ? "Uploading…" : "Choose image"}
            </span>
          </button>
        )}

        {value ? (
          <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-ink"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => onChange(null)}
              className="rounded-full bg-white/90 p-1 text-ink"
              aria-label="Remove"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
