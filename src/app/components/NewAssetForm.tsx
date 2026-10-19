import { useState, useEffect } from "react";
import { ImageUploader } from "./ImageUploader";
import { Plus, Package, RotateCcw } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface ImageWithComment {
  url: string;
  comment: string;
}

interface NewAssetFormProps {
  onAssetCreated: () => void;
  currentUser: string;
}

export function NewAssetForm({ onAssetCreated, currentUser }: NewAssetFormProps) {
  const [assetTag, setAssetTag] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [highLevelInfo, setHighLevelInfo] = useState("");
  const [pictures, setPictures] = useState<ImageWithComment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved form values on mount
  useEffect(() => {
    const savedDescription = localStorage.getItem("lastAssetDescription");
    const savedLocation = localStorage.getItem("lastAssetLocation");
    const savedHighLevelInfo = localStorage.getItem("lastAssetHighLevelInfo");
    
    if (savedDescription) setDescription(savedDescription);
    if (savedLocation) setLocation(savedLocation);
    if (savedHighLevelInfo) setHighLevelInfo(savedHighLevelInfo);
  }, []);

  const clearForm = () => {
    setAssetTag("");
    setDescription("");
    setLocation("");
    setHighLevelInfo("");
    setPictures([]);
    localStorage.removeItem("lastAssetDescription");
    localStorage.removeItem("lastAssetLocation");
    localStorage.removeItem("lastAssetHighLevelInfo");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetTag.trim() || !location.trim()) {
      alert("Asset Tag and Location are required");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/assets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            assetTag: assetTag.trim(),
            description: description.trim(),
            location: location.trim(),
            highLevelInfo: highLevelInfo.trim(),
            pictures,
            createdBy: currentUser,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create asset");
      }

      // Save the current values to localStorage for next entry
      localStorage.setItem("lastAssetDescription", description.trim());
      localStorage.setItem("lastAssetLocation", location.trim());
      localStorage.setItem("lastAssetHighLevelInfo", highLevelInfo.trim());

      // Only reset pictures (keep asset tag, description, location, and high level info)
      setPictures([]);

      alert("Asset created successfully!");
      onAssetCreated();
    } catch (error) {
      console.error("Error creating asset:", error);
      alert(`Failed to create asset: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="size-8 text-blue-600" />
          <h1 className="text-3xl">New Asset Entry</h1>
        </div>
        <p className="text-gray-600">
          Add a new asset to the database with details and photos
        </p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 <strong>Tip:</strong> All fields are kept after submission for faster data entry. Only photos are cleared.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2">
            <span className="text-red-500">*</span> Asset Tag
          </label>
          <input
            type="text"
            value={assetTag}
            onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
            placeholder="e.g., ASSET-001"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block mb-2">
            Description <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter asset description..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-2">
            <span className="text-red-500">*</span> Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location (e.g., Warehouse A, Shelf 3)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block mb-2">
            High Level Info <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            value={highLevelInfo}
            onChange={(e) => setHighLevelInfo(e.target.value)}
            placeholder="Enter high level information..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div>
          <label className="block mb-2">Pictures</label>
          <ImageUploader images={pictures} onChange={setPictures} />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="size-5" />
            {isSubmitting ? "Creating Asset..." : "Create Asset"}
          </button>
          <button
            type="button"
            onClick={clearForm}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            title="Clear all fields"
          >
            <RotateCcw className="size-5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </form>
    </div>
  );
}