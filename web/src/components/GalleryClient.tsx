"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { ImageModal } from "@/components/ImageModal";
import { SkeletonGrid } from "@/components/SkeletonGrid";
import type { ImageItem } from "@/lib/types";

const POLLING_INTERVAL_MS = 3000;

export function GalleryClient() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ImageItem | null>(null);

  const fetchImages = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/images", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`GET /api/images ${response.status}`);
      }
      const payload = (await response.json()) as ImageItem[];
      setItems(Array.isArray(payload) ? payload : []);
      setError(null);
    } catch (fetchError) {
      console.error("fetchImages error:", fetchError);
      setError("No se pudieron cargar las fotos.");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchImages();
    const intervalId = window.setInterval(() => {
      void fetchImages();
    }, POLLING_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchImages]);

  return (
    <section className="gallery-section">
      <div className="toolbar">
        <p>
          <strong>Total:</strong> {items.length} foto{items.length === 1 ? "" : "s"}
        </p>
        <button type="button" className="btn btn-muted" onClick={() => void fetchImages(true)} disabled={refreshing}>
          {refreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <p className="subtle">Auto-refresh cada 3 segundos.</p>

      {initialLoading ? <SkeletonGrid /> : null}
      {!initialLoading && error ? <p className="error-text">{error}</p> : null}
      {!initialLoading && !error && items.length === 0 ? <p className="subtle">Aun no hay fotos disponibles.</p> : null}

      {!initialLoading && !error && items.length > 0 ? (
        <div className="gallery-grid">
          {items.map((item) => (
            <button key={item.id} type="button" className="photo-card" onClick={() => setSelected(item)}>
              <img src={item.url} alt={`kisscam-${item.id}`} loading="lazy" />
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? <ImageModal image={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}
