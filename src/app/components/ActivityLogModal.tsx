import { useState, useEffect, useRef } from "react";
import { X, Activity, User, Package, Clock, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface ActivityLog {
  id: string;
  username: string;
  action: string;
  assetTag?: string | null;
  details: string;
  metadata?: any;
  timestamp: string;
}

interface ActivityLogModalProps {
  type: "user" | "asset" | "all";
  identifier?: string; // username for user logs, assetTag for asset logs
  onClose: () => void;
}

export function ActivityLogModal({ type, identifier, onClose }: ActivityLogModalProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(10);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLogs();
  }, [type, identifier]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      let url = `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/activity-logs`;
      
      if (type === "user" && identifier) {
        url += `/user/${identifier}`;
      } else if (type === "asset" && identifier) {
        url += `/asset/${identifier}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATE")) return "text-green-700 bg-green-50 border-green-200";
    if (action.includes("UPDATE") || action.includes("EDIT")) return "text-blue-700 bg-blue-50 border-blue-200";
    if (action.includes("DELETE")) return "text-red-700 bg-red-50 border-red-200";
    if (action.includes("UPLOAD")) return "text-purple-700 bg-purple-50 border-purple-200";
    return "text-gray-700 bg-gray-50 border-gray-200";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("CREATE")) return "➕";
    if (action.includes("UPDATE") || action.includes("EDIT")) return "✏️";
    if (action.includes("DELETE")) return "🗑️";
    if (action.includes("UPLOAD")) return "📤";
    return "📝";
  };

  // Get unique actions for filter
  const uniqueActions = ["all", ...Array.from(new Set(logs.map(log => log.action)))];

  // Filter logs by action
  const filteredLogs = filterAction === "all" 
    ? logs 
    : logs.filter(log => log.action === filterAction);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Scroll content to top when page changes
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [filterAction]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Activity className="size-6 text-blue-600" />
            <div>
              <h2 className="text-2xl">Activity Log</h2>
              <p className="text-sm text-gray-600 mt-1">
                {type === "user" && identifier && `User: ${identifier}`}
                {type === "asset" && identifier && `Asset: ${identifier}`}
                {type === "all" && "All System Activities"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="size-6" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Filter className="size-4 text-gray-600" />
            <label className="text-sm text-gray-700">Filter by Action:</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action === "all" ? "All Actions" : action}
                </option>
              ))}
            </select>
            <span className="ml-auto text-sm text-gray-600">
              Showing {filteredLogs.length} of {logs.length} activities
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6" ref={contentRef}>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading activity logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="size-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No activity logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0 mt-1">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Action Badge */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-3 py-1 text-xs rounded-full border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        
                        {/* User Badge */}
                        <div className="flex items-center gap-1 text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          <User className="size-3" />
                          <span className="font-medium">{log.username}</span>
                        </div>

                        {/* Asset Badge */}
                        {log.assetTag && (
                          <div className="flex items-center gap-1 text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">
                            <Package className="size-3" />
                            <span className="font-medium">{log.assetTag}</span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      {log.details && (
                        <p className="text-gray-700 mb-2">{log.details}</p>
                      )}

                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2 text-xs">
                          <div className="text-gray-600 mb-1 font-medium">Additional Details:</div>
                          <div className="space-y-1">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <div key={key} className="text-gray-700">
                                <span className="font-medium capitalize">{key}:</span>{" "}
                                <span className={typeof value === 'string' ? '' : 'font-mono'}>
                                  {typeof value === 'string' ? value : JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="size-3" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {!isLoading && filteredLogs.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <span className="text-sm text-gray-700 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Close Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
