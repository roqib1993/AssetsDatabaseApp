import { useState, useEffect, useRef } from "react";

interface SecureImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Images uploaded to Cloudflare R2 are blocked by the hosting site's img-src
// CSP, but fetch() is allowed via connect-src. We fetch the bytes with a plain
// GET (no custom headers — custom headers trigger a CORS preflight that R2
// public buckets reject), create a local blob: URL, and hand that to <img>.
// blob: URLs are always permitted regardless of img-src restrictions.
export function SecureImage({ src, alt = "", className, style }: SecureImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src) return;

    // blob: and data: URLs are already local — no need to fetch them.
    if (src.startsWith("blob:") || src.startsWith("data:")) {
      setDisplaySrc(src);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        // Plain GET — no custom headers, so no CORS preflight is triggered.
        const res = await fetch(src);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setDisplaySrc(url);
      } catch {
        // Fallback: use the URL directly (works when CSP is permissive).
        if (!cancelled) setDisplaySrc(src);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src]);

  if (!displaySrc) {
    // Show same-size placeholder while loading
    return <div className={className} style={style} />;
  }

  return <img src={displaySrc} alt={alt} className={className} style={style} />;
}
