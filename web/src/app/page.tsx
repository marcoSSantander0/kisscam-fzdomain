import { GalleryClient } from "@/components/GalleryClient";

export default function Home() {
  return (
    <main className="page-wrap">
      <header className="hero">
        <h1>Kiss Cam</h1>
        <p>Galeria publica en vivo. Elige un marco y descarga tu recuerdo.</p>
      </header>
      <GalleryClient />
    </main>
  );
}
