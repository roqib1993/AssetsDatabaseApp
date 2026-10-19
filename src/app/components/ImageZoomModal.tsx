import { useEffect, useRef, useState } from "react";
import { X, Download, RotateCw, RotateCcw } from "lucide-react";

interface ImageZoomModalProps {
  imageUrl: string;
  comment?: string;
  onClose: () => void;
}

export function ImageZoomModal({ imageUrl, comment, onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  // Use a blob: URL so the full-size image loads even when img-src CSP blocks the R2 domain.
  const [displayUrl, setDisplayUrl] = useState<string>(imageUrl);
  const blobUrlRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef(0);
  const initialDistanceRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    // blob: / data: URLs are already local — no fetch needed.
    if (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")) {
      setDisplayUrl(imageUrl);
      return;
    }
    let cancelled = false;
    fetch(imageUrl)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setDisplayUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDisplayUrl(imageUrl);
      });
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [imageUrl]);

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(1, Math.min(5, scale + delta));
    setScale(newScale);
    
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      initialDistanceRef.current = distance;
    } else if (e.touches.length === 1) {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapRef.current;
      
      if (tapLength < 300 && tapLength > 0) {
        if (scale === 1) {
          setScale(2.5);
        } else {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
      }
      
      lastTapRef.current = currentTime;

      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (initialDistanceRef.current > 0) {
        const scaleChange = distance / initialDistanceRef.current;
        const newScale = Math.max(1, Math.min(5, scale * scaleChange));
        setScale(newScale);
        initialDistanceRef.current = distance;
        
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialDistanceRef.current = 0;
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image');
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center"
      onClick={handleBackgroundClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleRotateLeft}
          className="p-3 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-colors shadow-lg"
          title="Rotate left"
        >
          <RotateCcw className="size-5" />
        </button>
        <button
          onClick={handleRotateRight}
          className="p-3 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-colors shadow-lg"
          title="Rotate right"
        >
          <RotateCw className="size-5" />
        </button>
        <button
          onClick={handleDownload}
          className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors shadow-lg"
          title="Download image"
        >
          <Download className="size-5" />
        </button>
        <button
          onClick={onClose}
          className="p-3 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors shadow-lg"
          title="Close"
        >
          <X className="size-6" />
        </button>
      </div>

      {comment && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg z-10 max-w-2xl mx-auto">
          <p className="text-sm">{comment}</p>
        </div>
      )}

      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={displayUrl}
          alt="Zoomed image"
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `rotate(${rotation}deg) scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          draggable={false}
        />
      </div>

      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm">
        {scale > 1 ? (
          <span>Drag to pan • Scroll or pinch to zoom • Rotation: {rotation}°</span>
        ) : (
          <span>Scroll, pinch, or double-tap to zoom • Rotation: {rotation}°</span>
        )}
      </div>
    </div>
  );
}
