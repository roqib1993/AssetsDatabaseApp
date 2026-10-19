import { useState } from "react";
import { X, Save } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { deleteImagesFromStorage } from "./imageStorage";

interface ImageWithComment {
  url: string;
  comment: string;
}

interface Asset {
  assetTag: string;
  description: string;
  location: string;
  highLevelInfo: string;
  pictures: ImageWithComment[];
  asFound: ImageWithComment[];
  asLeft: ImageWithComment[];
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface EditAssetModalProps {
  asset: Asset;
  currentUser: string;
  onClose: () => void;
  onSave: () => void;
}

export function EditAssetModal({ asset, currentUser, onClose, onSave }: EditAssetModalProps) {
  const [description, setDescription] = useState(asset.description);
  const [location, setLocation] = useState(asset.location);
  const [pictures, setPictures] = useState<ImageWithComment[]>(asset.pictures || []);
  const [isSaving, setIsSaving] = useState(false);

  const originalPictureUrls = (asset.pictures || []).map((p) => p.url);

  const handleSave = async () => {
    if (!location.trim()) {
      alert("Location is required");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/assets/${asset.assetTag}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            description: description.trim(),
            location: location.trim(),
            pictures,
            lastUpdatedBy: currentUser,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update asset");
      }

      // Delete removed pictures from storage
      const currentPictureUrls = pictures.map((p) => p.url);
      const removedUrls = originalPictureUrls.filter((u) => !currentPictureUrls.includes(u));
      if (removedUrls.length > 0) {
        await deleteImagesFromStorage(removedUrls);
      }

      alert("Asset updated successfully!");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating asset:", error);
      alert(`Failed to update asset: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10 rounded-t-lg">
          <h2 className="text-xl">Edit Asset: {asset.assetTag}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="size-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block mb-2">Asset Tag</label>
            <input
              type="text"
              value={asset.assetTag}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
            <p className="text-sm text-gray-500 mt-1">Asset tag cannot be changed</p>
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
              placeholder="Enter location"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block mb-2">Asset Pictures</label>
            <ImageUploader images={pictures} onChange={setPictures} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="size-5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
