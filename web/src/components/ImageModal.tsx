"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { ImageItem } from "@/lib/types";

type FrameOption = {
  id: string;
  label: string;
  src: string | null;
};

const FRAME_OPTIONS: FrameOption[] = [
  { id: "none", label: "Sin marco", src: null },
  { id: "frame-1", label: "Corazones", src: "/frames/frame-1.svg" },
  { id: "frame-2", label: "Lazos", src: "/frames/frame-2.svg" },
  { id: "frame-3", label: "Brillos", src: "/frames/frame-3.svg" },
  { id: "frame-4", label: "Flores", src: "/frames/frame-4.svg" },
  { id: "frame-5", label: "Doble borde", src: "/frames/frame-5.svg" },
  { id: "frame-6", label: "Noche romantica", src: "/frames/frame-6.svg" },
];

type Props = {
  image: ImageItem;
  onClose: () => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar imagen: ${src}`));
    img.src = src;
  });
}

function downloadHref(href: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.click();
}

export function ImageModal({ image, onClose }: Props) {
  const [selectedFrame, setSelectedFrame] = useState<string>("none");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frame = useMemo(
    () => FRAME_OPTIONS.find((item) => item.id === selectedFrame) ?? FRAME_OPTIONS[0],
    [selectedFrame],
  );

  const handleDownloadOriginal = () => {
    downloadHref(image.url, image.id);
  };

  const handleDownloadWithFrame = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const base = await loadImage(image.url);
      const canvas = document.createElement("canvas");
      canvas.width = base.naturalWidth || base.width;
      canvas.height = base.naturalHeight || base.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No se pudo crear canvas.");
      }

      ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

      if (frame.src) {
        const overlay = await loadImage(frame.src);
        ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL("image/png");
      downloadHref(dataUrl, `kisscam-${frame.id}-${Date.now()}.png`);
    } catch (canvasError) {
      console.error("download frame error:", canvasError);
      setError("No se pudo descargar la composicion. Intenta nuevamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-muted close-btn" onClick={onClose}>
          Cerrar
        </button>

        <div className="preview-area">
          <img src={image.url} alt="Foto seleccionada" className="preview-image" />
          {frame.src ? <img src={frame.src} alt={frame.label} className="preview-frame" /> : null}
        </div>

        <div className="frames-grid">
          {FRAME_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selectedFrame ? "frame-btn frame-btn-active" : "frame-btn"}
              onClick={() => setSelectedFrame(item.id)}
            >
              {item.src ? (
                <img src={item.src} alt={item.label} className="frame-thumb" />
              ) : (
                <span className="frame-thumb frame-empty">Sin marco</span>
              )}
              <small>{item.label}</small>
            </button>
          ))}
        </div>

        <div className="actions-row">
          <button type="button" className="btn btn-muted" onClick={handleDownloadOriginal}>
            Descargar original
          </button>
          <button type="button" className="btn btn-primary" onClick={handleDownloadWithFrame} disabled={isDownloading}>
            {isDownloading ? "Generando..." : "Descargar con marco"}
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
