import { useState } from "react";
import { X, Save, FileText } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface ImageWithComment {
  url: string;
  comment: string;
}

interface AddReportModalProps {
  assetTag: string;
  currentUser: string;
  onClose: () => void;
  onSave: () => void;
}

export function AddReportModal({ assetTag, currentUser, onClose, onSave }: AddReportModalProps) {
  const [highLevelInfo, setHighLevelInfo] = useState("");
  const [pictures, setPictures] = useState<ImageWithComment[]>([]);
  const [asFound, setAsFound] = useState<ImageWithComment[]>([]);
  const [asLeft, setAsLeft] = useState<ImageWithComment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!highLevelInfo.trim() && pictures.length === 0 && asFound.length === 0 && asLeft.length === 0) {
      alert("Please add some High Level Info or at least one photo before saving the report.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            assetTag,
            highLevelInfo: highLevelInfo.trim(),
            pictures,
            asFound,
            asLeft,
            createdBy: currentUser,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create report");
      }

      alert("Report created successfully!");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error creating report:", error);
      alert(`Failed to create report: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileText className="size-6 text-purple-600" />
            <h2 className="text-xl">New Report: {assetTag}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="size-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block mb-2">
              High Level Info <span className="text-gray-500">(what was found / done)</span>
            </label>
            <textarea
              value={highLevelInfo}
              onChange={(e) => setHighLevelInfo(e.target.value)}
              placeholder="Describe the inspection findings or work performed..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={4}
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-2">Report Photos</label>
            <ImageUploader images={pictures} onChange={setPictures} />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <label className="block mb-2">
              <span className="text-green-700">📸 As Found</span>
              <span className="text-sm text-gray-500 ml-2">(Condition before work)</span>
            </label>
            <ImageUploader images={asFound} onChange={setAsFound} />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <label className="block mb-2">
              <span className="text-blue-700">📸 As Left</span>
              <span className="text-sm text-gray-500 ml-2">(Condition after work)</span>
            </label>
            <ImageUploader images={asLeft} onChange={setAsLeft} />
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="size-5" />
            {isSaving ? "Saving..." : "Save Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
