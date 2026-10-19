import { X, FileText, User, Clock, Eye, Trash, Image, Pencil } from "lucide-react";

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

interface ReportHistoryModalProps {
  assetTag: string;
  reports: Report[];
  currentUser: string;
  isAdmin: boolean;
  isGuest: boolean;
  onClose: () => void;
  onViewReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onDeleteReport: (report: Report) => void;
}

export function ReportHistoryModal({
  assetTag,
  reports,
  currentUser,
  isAdmin,
  isGuest,
  onClose,
  onViewReport,
  onEditReport,
  onDeleteReport,
}: ReportHistoryModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sorted = [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const photoCount = (r: Report) =>
    (r.pictures?.length || 0) + (r.asFound?.length || 0) + (r.asLeft?.length || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileText className="size-6 text-purple-600" />
            <h2 className="text-xl">Report History: {assetTag}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="size-6" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            {sorted.length} report{sorted.length !== 1 ? "s" : ""} total • newest first
          </p>

          {sorted.map((report) => (
            <div
              key={report.reportId}
              className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDate(report.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {report.createdBy || "Unknown"}
                    </span>
                    {photoCount(report) > 0 && (
                      <span className="flex items-center gap-1">
                        <Image className="size-3" />
                        {photoCount(report)} photo{photoCount(report) !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {report.highLevelInfo || (
                      <span className="italic text-gray-400">No high level info</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onViewReport(report)}
                    className="text-purple-600 hover:text-purple-800 p-2"
                    title="View full report"
                  >
                    <Eye className="size-5" />
                  </button>
                  {!isGuest && (isAdmin || report.createdBy === currentUser) && (
                    <button
                      onClick={() => onEditReport(report)}
                      className="text-blue-500 hover:text-blue-700 p-2"
                      title="Edit report"
                    >
                      <Pencil className="size-5" />
                    </button>
                  )}
                  {!isGuest && (isAdmin || report.createdBy === currentUser) && (
                    <button
                      onClick={() => onDeleteReport(report)}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Delete report"
                    >
                      <Trash className="size-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="size-12 mx-auto text-gray-300 mb-2" />
              <p>No reports for this asset yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
