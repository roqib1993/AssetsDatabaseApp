import { useState } from "react";
import { X, Save, FileText } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { deleteImagesFromStorage } from "./imageStorage";

interface ImageWithComment {
  url: string;
  comment: string;
}

interface Report {
  reportId: string;
  assetTag: string;
  highLevelInfo: string;
  pictures: ImageWithComment[];
  asFound: ImageWithComment[];
  asLeft: ImageWithComment[];
  createdBy: string;
  createdAt: string;
}

interface EditReportModalProps {
  report: Report;
  currentUser: string;
  onClose: () => void;
  onSave: () => void;
}

export function EditReportModal({ report, currentUser, onClose, onSave }: EditReportModalProps) {
  const [highLevelInfo, setHighLevelInfo] = useState(report.highLevelInfo || "");
  const [pictures, setPictures] = useState<ImageWithComment[]>(report.pictures || []);
  const [asFound, setAsFound] = useState<ImageWithComment[]>(report.asFound || []);
  const [asLeft, setAsLeft] = useState<ImageWithComment[]>(report.asLeft || []);
  const [isSaving, setIsSaving] = useState(false);

  // Track original URLs to clean up removed images on save
  const originalPictureUrls = (report.pictures || []).map((p) => p.url);
  const originalAsFoundUrls = (report.asFound || []).map((p) => p.url);
  const originalAsLeftUrls = (report.asLeft || []).map((p) => p.url);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/reports/${report.reportId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            highLevelInfo: highLevelInfo.trim(),
            pictures,
            asFound,
            asLeft,
            updatedBy: currentUser,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update report");
      }

      // Delete removed images from storage
      const currentPictureUrls = pictures.map((p) => p.url);
      const currentAsFoundUrls = asFound.map((p) => p.url);
      const currentAsLeftUrls = asLeft.map((p) => p.url);

      const removedUrls = [
        ...originalPictureUrls.filter((u) => !currentPictureUrls.includes(u)),
        ...originalAsFoundUrls.filter((u) => !currentAsFoundUrls.includes(u)),
        ...originalAsLeftUrls.filter((u) => !currentAsLeftUrls.includes(u)),
      ];

      if (removedUrls.length > 0) {
        await deleteImagesFromStorage(removedUrls);
      }

      alert("Report updated successfully!");
      onSave();
      onClose();
    } catch (error) {
      console.error("Error updating report:", error);
      alert(`Failed to update report: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileText className="size-6 text-purple-600" />
            <div>
              <h2 className="text-xl">Edit Report: {report.assetTag}</h2>
              <p className="text-xs text-gray-500">
                Originally created by {report.createdBy} on {formatDate(report.createdAt)}
              </p>
            </div>
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
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
