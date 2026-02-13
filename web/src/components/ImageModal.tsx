"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { ImageItem } from "@/lib/types";

type FrameOption = {
  id: string;
  label: string;
  portraitSrc: string | null;
  landscapeSrc: string | null;
};

const FRAME_OPTIONS: FrameOption[] = [
  { id: "none", label: "Sin marco", portraitSrc: null, landscapeSrc: null },
  {
    id: "frame-1",
    label: "Corazones",
    portraitSrc: "/frames/frame-1.svg",
    landscapeSrc: "/frames/frame-1-landscape.svg",
  },
  {
    id: "frame-2",
    label: "Lazos",
    portraitSrc: "/frames/frame-2.svg",
    landscapeSrc: "/frames/frame-2-landscape.svg",
  },
  {
    id: "frame-3",
    label: "Brillos",
    portraitSrc: "/frames/frame-3.svg",
    landscapeSrc: "/frames/frame-3-landscape.svg",
  },
  {
    id: "frame-4",
    label: "Flores",
    portraitSrc: "/frames/frame-4.svg",
    landscapeSrc: "/frames/frame-4-landscape.svg",
  },
  {
    id: "frame-5",
    label: "Doble borde",
    portraitSrc: "/frames/frame-5.svg",
    landscapeSrc: "/frames/frame-5-landscape.svg",
  },
  {
    id: "frame-6",
    label: "Noche romantica",
    portraitSrc: "/frames/frame-6.svg",
    landscapeSrc: "/frames/frame-6-landscape.svg",
  },
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

function resolveFrameSrc(frame: FrameOption, isLandscape: boolean): string | null {
  if (isLandscape) {
    return frame.landscapeSrc ?? frame.portraitSrc;
  }
  return frame.portraitSrc ?? frame.landscapeSrc;
}

export function ImageModal({ image, onClose }: Props) {
  const [selectedFrame, setSelectedFrame] = useState<string>("none");
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(3 / 4);
  const [isLandscapePhoto, setIsLandscapePhoto] = useState(false);

  useEffect(() => {
    let mounted = true;
    void loadImage(image.url)
      .then((img) => {
        if (!mounted) {
          return;
        }
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (width > 0 && height > 0) {
          setImageAspectRatio(width / height);
          setIsLandscapePhoto(width > height);
        }
      })
      .catch((loadError) => {
        console.error("image preload error:", loadError);
      });

    return () => {
      mounted = false;
    };
  }, [image.url]);

  const frame = useMemo(
    () => FRAME_OPTIONS.find((item) => item.id === selectedFrame) ?? FRAME_OPTIONS[0],
    [selectedFrame],
  );
  const selectedFrameSrc = resolveFrameSrc(frame, isLandscapePhoto);

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

      if (selectedFrameSrc) {
        const overlay = await loadImage(selectedFrameSrc);
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

        <div className="preview-area" style={{ aspectRatio: imageAspectRatio }}>
          <img src={image.url} alt="Foto seleccionada" className="preview-image" />
          {selectedFrameSrc ? <img src={selectedFrameSrc} alt={frame.label} className="preview-frame" /> : null}
        </div>

        <div className="frames-grid">
          {FRAME_OPTIONS.map((item) => {
            const thumbSrc = resolveFrameSrc(item, isLandscapePhoto);
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === selectedFrame ? "frame-btn frame-btn-active" : "frame-btn"}
                onClick={() => setSelectedFrame(item.id)}
              >
                {thumbSrc ? (
                  <img src={thumbSrc} alt={item.label} className="frame-thumb" style={{ aspectRatio: imageAspectRatio }} />
                ) : (
                  <span className="frame-thumb frame-empty" style={{ aspectRatio: imageAspectRatio }}>
                    Sin marco
                  </span>
                )}
                <small>{item.label}</small>
              </button>
            );
          })}
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
