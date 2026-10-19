import { useState, useRef, useEffect } from "react";
import { Camera, Image, X, Upload, Download, ZoomIn } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { ImageZoomModal } from "./ImageZoomModal";
import { SecureImage } from "./SecureImage";

interface ImageWithComment {
  url: string;
  comment: string;
}

interface ImageUploaderProps {
  images: ImageWithComment[];
  onChange: (images: ImageWithComment[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [uploadingCount, setUploadingCount] = useState<number>(0);
  const [uploadingTotal, setUploadingTotal] = useState<number>(0);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Map from remote R2 URL → local blob: URL for instant, network-free thumbnails.
  const previewsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const previews = previewsRef.current;
    return () => {
      previews.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
    };
  }, []);

  // Compress image to Full HD resolution (1920x1080)
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate dimensions to fit within 1920x1080 while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          const maxHeight = 1080;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            
            if (aspectRatio > maxWidth / maxHeight) {
              // Width is the limiting factor
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              // Height is the limiting factor
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.85 // Quality: 85%
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    try {
      const compressedBlob = await compressImage(file);

      // Create a local blob URL immediately so the thumbnail never needs to
      // load from the network (avoids CSP img-src and CORS issues entirely).
      const localPreviewUrl = URL.createObjectURL(compressedBlob);

      const formData = new FormData();
      formData.append("file", compressedBlob, file.name);

      const CLOUDFLARE_WORKER_URL = "https://image-uploader-worker.roqib1993.workers.dev/upload";

      const response = await fetch(CLOUDFLARE_WORKER_URL, {
        method: "POST",
        headers: { "X-App-Auth": "53cu123" },
        body: formData,
      });

      if (!response.ok) {
        URL.revokeObjectURL(localPreviewUrl);
        throw new Error("Failed to upload image to Cloudflare");
      }

      const data = await response.json();

      // Store local blob URL so the thumbnail uses it instead of the R2 URL.
      previewsRef.current.set(data.url, localPreviewUrl);

      return { url: data.url, comment: "" };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleMultipleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    setUploadingTotal(fileArray.length);
    setUploadingCount(0);

    const uploadedImages: ImageWithComment[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const uploadedImage = await handleFileSelect(fileArray[i]);
        uploadedImages.push(uploadedImage);
        setUploadingCount(i + 1);
      } catch (error) {
        console.error(`Error uploading file ${fileArray[i].name}:`, error);
        errors.push(`${fileArray[i].name}: ${error}`);
      }
    }

    // Add all successfully uploaded images at once
    if (uploadedImages.length > 0) {
      onChange([...images, ...uploadedImages]);
    }

    // Show error summary if any failed
    if (errors.length > 0) {
      alert(`Some images failed to upload:\n${errors.join('\n')}`);
    }

    setUploadingTotal(0);
    setUploadingCount(0);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleMultipleFiles(files);
    }
    e.target.value = ""; // Reset input
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleMultipleFiles(files);
    }
    e.target.value = ""; // Reset input
  };

  const updateComment = (index: number, comment: string) => {
    const updatedImages = [...images];
    updatedImages[index].comment = comment;
    onChange(updatedImages);
  };

  const removeImage = (index: number) => {
    const removed = images[index];
    const preview = previewsRef.current.get(removed.url);
    if (preview) {
      URL.revokeObjectURL(preview);
      previewsRef.current.delete(removed.url);
    }
    onChange(images.filter((_, i) => i !== index));
  };

  const downloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `image-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image');
    }
  };

  const openZoomModal = (url: string) => {
    setZoomedImageUrl(url);
  };

  const closeZoomModal = () => {
    setZoomedImageUrl(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer">
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Camera className="size-5" />
            <span className="whitespace-nowrap">Take Photo</span>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
        </label>

        <label className="flex-1 cursor-pointer">
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            <Upload className="size-5" />
            <span className="whitespace-nowrap">Upload Images</span>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
        </label>
      </div>

      <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          📸 Select multiple images at once • Images are automatically compressed to Full HD (1920×1080) to save storage
        </p>
      </div>

      {uploadingTotal > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700">
            Compressing and uploading {uploadingCount}/{uploadingTotal} images...
          </p>
        </div>
      )}

      <div className="space-y-3">
        {images.map((img, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-3 bg-white"
          >
            <div className="flex gap-3">
              <div className="relative group cursor-pointer" onClick={() => openZoomModal(previewsRef.current.get(img.url) || img.url)}>
                <SecureImage
                  src={previewsRef.current.get(img.url) || img.url}
                  alt={`Upload ${index + 1}`}
                  className="size-24 object-cover rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center group-hover:bg-black group-hover:bg-opacity-30 transition-all rounded-lg">
                  <ZoomIn className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <label className="text-sm text-gray-600">
                    Image Comment (optional)
                  </label>
                  <button
                    onClick={() => removeImage(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <textarea
                  value={img.comment}
                  onChange={(e) => updateComment(index, e.target.value)}
                  placeholder="Add a comment for this image..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-2">
              <button
                onClick={() => downloadImage(img.url, index)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="size-5" />
                <span className="whitespace-nowrap">Download Image</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && uploadingTotal === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <Image className="size-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">No images added yet</p>
        </div>
      )}

      {zoomedImageUrl && (
        <ImageZoomModal
          imageUrl={zoomedImageUrl}
          onClose={closeZoomModal}
        />
      )}
    </div>
  );
}