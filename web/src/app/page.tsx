import { GalleryClient } from "@/components/GalleryClient";

export default function Home() {
  return (
    <main className="page-wrap">
      <header className="hero">
        <h1>Snack&Love Kisscam</h1>
        <div className="hero-tags">
          <span>Edicion San Valentin</span>
          <span>Galeria en vivo</span>
          <span>Descarga con marco romantico</span>
        </div>
      </header>
      <GalleryClient />
    </main>
  );
}
