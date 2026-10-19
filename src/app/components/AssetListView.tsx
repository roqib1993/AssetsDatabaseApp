import { useState, useEffect } from "react";
import { Package, MapPin, Trash, Pencil, Image, Search, ArrowUpDown, ChevronLeft, ChevronRight, ArrowUp, Trash2, User, Clock, FileText, Info, Calendar, Activity, Plus, Eye, FileDown } from "lucide-react";
import { exportAllReportsToZip } from "./exportReportsPdf";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { deleteImagesFromStorage } from "./imageStorage";
import { EditAssetModal } from "./EditAssetModal";
import { ImageZoomModal } from "./ImageZoomModal";
import { AssetReportView } from "./AssetReportView";
import { ActivityLogModal } from "./ActivityLogModal";
import { AddReportModal } from "./AddReportModal";
import { EditReportModal } from "./EditReportModal";
import { ReportHistoryModal } from "./ReportHistoryModal";

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

interface Asset {
  assetTag: string;
  description: string;
  location: string;
  highLevelInfo: string;
  pictures: { url: string; comment: string }[];
  asFound: { url: string; comment: string }[];
  asLeft: { url: string; comment: string }[];
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface AssetListViewProps {
  refreshTrigger: number;
  currentUser: string;
  isAdmin: boolean;
  isGuest: boolean;
}

export function AssetListView({ refreshTrigger, currentUser, isAdmin, isGuest }: AssetListViewProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date-newest" | "date-oldest" | "tag-asc" | "tag-desc" | "location-asc" | "location-desc">("date-newest");
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [zoomImage, setZoomImage] = useState<{ 
    url: string; 
    comment?: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<10 | 20 | 50>(10);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewingReport, setViewingReport] = useState<{ asset: Asset; report: Report } | null>(null);
  const [reportsByAsset, setReportsByAsset] = useState<Record<string, Report[]>>({});
  const [addingReportFor, setAddingReportFor] = useState<Asset | null>(null);
  const [editingReport, setEditingReport] = useState<{ asset: Asset; report: Report } | null>(null);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<Asset | null>(null);
  const [filterWithPictures, setFilterWithPictures] = useState(false);
  const [filterWithHighLevelInfo, setFilterWithHighLevelInfo] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [viewingActivityLog, setViewingActivityLog] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    // Find the scrollable parent container
    const scrollContainer = document.querySelector('.flex-1.overflow-auto');
    
    const handleScroll = () => {
      if (scrollContainer) {
        setShowScrollTop(scrollContainer.scrollTop > 300);
      }
    };

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('.flex-1.overflow-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPage]);

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.flex-1.overflow-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Tolerant JSON parse: the edge function occasionally returns a body with
  // trailing bytes (e.g. a doubled payload), which makes JSON.parse throw
  // "Unexpected non-whitespace character after JSON". This extracts the first
  // complete JSON value from the text instead of failing outright.
  const parseJsonSafe = (text: string): any => {
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // Scan for the first balanced {...} or [...] value from the start.
      const open = trimmed[0];
      if (open !== "{" && open !== "[") throw new Error("Invalid JSON response");
      const close = open === "{" ? "}" : "]";
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === "\\") escaped = true;
          else if (ch === '"') inString = false;
        } else if (ch === '"') {
          inString = true;
        } else if (ch === open) {
          depth++;
        } else if (ch === close) {
          depth--;
          if (depth === 0) {
            return JSON.parse(trimmed.substring(0, i + 1));
          }
        }
      }
      throw new Error("Could not parse JSON response");
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/reports`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const text = await response.text();

      if (!response.ok) {
        const error = parseJsonSafe(text);
        throw new Error(error.error || "Failed to fetch reports");
      }

      const data = parseJsonSafe(text);
      const grouped: Record<string, Report[]> = {};
      (data.reports || []).forEach((report: Report) => {
        if (!grouped[report.assetTag]) {
          grouped[report.assetTag] = [];
        }
        grouped[report.assetTag].push(report);
      });
      // Sort each asset's reports newest first
      Object.keys(grouped).forEach((tag) => {
        grouped[tag].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
      setReportsByAsset(grouped);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const runMigration = async () => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/migrate-reports`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
    } catch (error) {
      console.error("Error running report migration:", error);
    }
  };

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      // Ensure embedded report data is migrated into the Reports model before loading.
      await runMigration();

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/assets`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch assets");
      }

      const data = await response.json();
      setAssets(data.assets || []);
      await fetchReports();
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/reports/${report.reportId}?deletedBy=${currentUser}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete report");
      }

      // Delete uploaded photos from storage
      const imageUrls = [
        ...(report.pictures || []).map((p) => p.url),
        ...(report.asFound || []).map((p) => p.url),
        ...(report.asLeft || []).map((p) => p.url),
      ].filter(Boolean);
      if (imageUrls.length > 0) {
        await deleteImagesFromStorage(imageUrls);
      }

      await fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      alert(`Failed to delete report: ${error}`);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [refreshTrigger]);

  const handleDelete = async (assetTag: string) => {
    if (
      !confirm(
        `Are you sure you want to delete asset ${assetTag}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Collect all image URLs for this asset and its reports before deleting
      const asset = assets.find((a) => a.assetTag === assetTag);
      const assetImageUrls = asset
        ? [
            ...(asset.pictures || []).map((p) => p.url),
            ...(asset.asFound || []).map((p) => p.url),
            ...(asset.asLeft || []).map((p) => p.url),
          ]
        : [];
      const reportImageUrls = (reportsByAsset[assetTag] || []).flatMap((r) => [
        ...(r.pictures || []).map((p) => p.url),
        ...(r.asFound || []).map((p) => p.url),
        ...(r.asLeft || []).map((p) => p.url),
      ]);
      const allImageUrls = [...assetImageUrls, ...reportImageUrls].filter(Boolean);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/assets/${assetTag}?deletedBy=${currentUser}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete asset");
      }

      if (allImageUrls.length > 0) {
        await deleteImagesFromStorage(allImageUrls);
      }

      alert("Asset deleted successfully!");
      fetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      alert(`Failed to delete asset: ${error}`);
    }
  };

  const handleBulkDelete = async () => {
    const count = sortedAssets.length;
    
    if (count === 0) {
      alert("No assets to delete");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${count} asset(s)?\n\nThis action cannot be undone!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsLoading(true);
      const assetTags = sortedAssets.map(asset => asset.assetTag);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/assets/bulk-delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assetTags }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to bulk delete assets");
      }

      const result = await response.json();
      
      await fetchAssets();
      setCurrentPage(1);
      
      if (result.errors && result.errors.length > 0) {
        alert(
          `Bulk Delete Results:\n\n` +
          `✓ Successfully deleted: ${result.deletedAssets} asset(s)\n` +
          `✗ Failed: ${result.errors.length}\n\n` +
          `Errors:\n${result.errors.join('\n')}`
        );
      } else {
        alert(
          `Success!\n\n` +
          `Deleted ${result.deletedAssets} asset(s)`
        );
      }
    } catch (error) {
      console.error("Error bulk deleting assets:", error);
      alert(`Failed to bulk delete assets: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAllReports = async () => {
    try {
      setIsExporting(true);
      setExportProgress(null);
      await exportAllReportsToZip(sortedAssets, reportsByAsset, (progress) => {
        setExportProgress(progress);
      });
    } catch (error) {
      console.error("Error exporting reports to PDF:", error);
      alert(`Failed to export reports: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.highLevelInfo && asset.highLevelInfo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.createdBy && asset.createdBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.lastUpdatedBy && asset.lastUpdatedBy.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPictures = filterWithPictures ? asset.pictures.length > 0 : true;
    const matchesHighLevelInfo = filterWithHighLevelInfo ? asset.highLevelInfo : true;

    // Date range filtering
    let matchesDateRange = true;
    if (startDate || endDate) {
      const assetDate = new Date(asset.updatedAt);
      assetDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (assetDate < start) {
          matchesDateRange = false;
        }
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of day
        if (assetDate > end) {
          matchesDateRange = false;
        }
      }
    }

    return matchesSearch && matchesPictures && matchesHighLevelInfo && matchesDateRange;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    switch (sortBy) {
      case "date-newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "date-oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "tag-asc":
        return a.assetTag.localeCompare(b.assetTag);
      case "tag-desc":
        return b.assetTag.localeCompare(a.assetTag);
      case "location-asc":
        return a.location.localeCompare(b.location);
      case "location-desc":
        return b.location.localeCompare(a.location);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);
  const currentAssets = sortedAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Package className="size-8 text-blue-600" />
          <h1 className="text-3xl">Asset Database</h1>
        </div>
        <p className="text-gray-600">
          View and manage all assets in the database
        </p>
      </div>

      {/* Search and Filter Section */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3 mb-3 items-start sm:items-center justify-between">
          <div className="text-gray-600">
            <strong>Total Assets:</strong> {sortedAssets.length}
          </div>
          {isAdmin && sortedAssets.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAllReports}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                title="Export all reports as one PDF per asset (bundled in a ZIP)"
              >
                <FileDown className="size-4" />
                <span>
                  {isExporting
                    ? exportProgress
                      ? `Exporting ${exportProgress.current}/${exportProgress.total}...`
                      : "Preparing..."
                    : `Export All to PDF (${sortedAssets.length})`}
                </span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                title="Delete all current assets"
              >
                <Trash2 className="size-4" />
                <span>Delete All ({sortedAssets.length})</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by asset tag, description, location, high level info, or username..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
            >
              <option value="date-newest">Date: Newest First</option>
              <option value="date-oldest">Date: Oldest First</option>
              <option value="tag-asc">Asset Tag: A-Z</option>
              <option value="tag-desc">Asset Tag: Z-A</option>
              <option value="location-asc">Location: A-Z</option>
              <option value="location-desc">Location: Z-A</option>
            </select>
          </div>

          {/* Filter Options */}
          <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="filterPictures"
                  checked={filterWithPictures}
                  onChange={(e) => {
                    setFilterWithPictures(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="size-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="filterPictures" className="text-sm cursor-pointer select-none">
                  <span className="flex items-center gap-2">
                    <Image className="size-4 text-gray-600" />
                    <span>With Pictures Only</span>
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="filterHighLevelInfo"
                  checked={filterWithHighLevelInfo}
                  onChange={(e) => {
                    setFilterWithHighLevelInfo(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="size-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="filterHighLevelInfo" className="text-sm cursor-pointer select-none">
                  <span className="flex items-center gap-2">
                    <Info className="size-4 text-gray-600" />
                    <span>With High Level Info Only</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="size-4 text-gray-600" />
                <span className="text-sm">Filter by Updated Date:</span>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setCurrentPage(1);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline ml-auto"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label htmlFor="startDate" className="text-xs text-gray-600 block mb-1">
                    From:
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none z-10" />
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white cursor-pointer"
                    />
                  </div>
                </div>
                <div className="relative">
                  <label htmlFor="endDate" className="text-xs text-gray-600 block mb-1">
                    To:
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none z-10" />
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              {(startDate || endDate) && (
                <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  📅 Filtering: {startDate && `From ${new Date(startDate).toLocaleDateString()}`}
                  {startDate && endDate && ' • '}
                  {endDate && `To ${new Date(endDate).toLocaleDateString()}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pagination - Top */}
        {sortedAssets.length > 0 && (
          <div className="flex items-center justify-between py-3 border-t border-b border-gray-200">
            <div className="flex items-center gap-2">
              <label className="text-sm">Items per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value) as 10 | 20 | 50);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assets List */}
      {isLoading ? (
        <div className="text-center p-8 text-gray-500">
          Loading assets...
        </div>
      ) : sortedAssets.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <Package className="size-12 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">
            {searchQuery || filterWithPictures || filterWithHighLevelInfo
              ? "No assets found matching your filters"
              : "No assets yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentAssets.map((asset) => (
            <div
              key={asset.assetTag}
              className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              {/* Header Section with Asset Tag and Buttons */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Package className="size-5 text-blue-600 flex-shrink-0" />
                  <span className="text-lg">{asset.assetTag}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {isAdmin && (
                    <button
                      onClick={() => setViewingActivityLog(asset.assetTag)}
                      className="text-green-600 hover:text-green-800 p-2"
                      title="View activity log"
                    >
                      <Activity className="size-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setViewingHistoryFor(asset)}
                    className="text-purple-600 hover:text-purple-800 p-2 relative"
                    title="Report history"
                  >
                    <FileText className="size-5" />
                    {(reportsByAsset[asset.assetTag]?.length || 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-purple-600 text-white text-[10px] leading-none rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                        {reportsByAsset[asset.assetTag].length}
                      </span>
                    )}
                  </button>
                  {!isGuest && (
                    <button
                      onClick={() => setEditingAsset(asset)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="Edit asset"
                    >
                      <Pencil className="size-5" />
                    </button>
                  )}
                  {!isGuest && (isAdmin || asset.createdBy === currentUser) && (
                    <button
                      onClick={() => handleDelete(asset.assetTag)}
                      className="text-red-500 hover:text-red-700 p-2"
                      title={isAdmin ? "Admin: Can delete any asset" : "You created this asset"}
                    >
                      <Trash className="size-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="space-y-2">
                {asset.description && (
                  <p className="text-gray-700">{asset.description}</p>
                )}
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin className="size-4 flex-shrink-0" />
                  <span>{asset.location}</span>
                </div>
                
                {/* Add Report Button */}
                {!isGuest && (
                  <button
                    onClick={() => setAddingReportFor(asset)}
                    className="flex items-center justify-center gap-2 w-full py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm"
                  >
                    <Plus className="size-4" />
                    <span>Add Report</span>
                  </button>
                )}

                {/* Recent Reports */}
                {(() => {
                  const reports = reportsByAsset[asset.assetTag] || [];
                  const recent = reports.slice(0, 3);
                  return (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <FileText className="size-3" />
                        Recent Reports {reports.length > 0 && `(${reports.length})`}
                      </p>
                      {recent.length === 0 ? (
                        <p className="text-sm text-gray-400 italic px-1">
                          No reports yet. Add the first one.
                        </p>
                      ) : (
                        recent.map((report) => (
                          <div
                            key={report.reportId}
                            className="flex items-start justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-0.5 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {formatDate(report.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="size-3" />
                                  {report.createdBy || "Unknown"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-1">
                                {report.highLevelInfo || (
                                  <span className="italic text-gray-400">No high level info</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => setViewingReport({ asset, report })}
                                className="text-purple-600 hover:text-purple-800 p-1"
                                title="View full report"
                              >
                                <Eye className="size-4" />
                              </button>
                              {!isGuest && (isAdmin || report.createdBy === currentUser) && (
                                <button
                                  onClick={() => setEditingReport({ asset, report })}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Edit report"
                                >
                                  <Pencil className="size-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {reports.length > 3 && (
                        <button
                          onClick={() => setViewingHistoryFor(asset)}
                          className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          View All History ({reports.length})
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* User Stamps */}
                <div className="space-y-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <User className="size-3" />
                    <span>Created by: <strong>{asset.createdBy || "Unknown"}</strong></span>
                    <Clock className="size-3 ml-2" />
                    <span>{formatDate(asset.createdAt)}</span>
                  </div>
                  {asset.lastUpdatedBy && asset.updatedAt && (
                    <div className="flex items-center gap-2">
                      <Pencil className="size-3" />
                      <span>Last updated by: <strong>{asset.lastUpdatedBy}</strong></span>
                      <Clock className="size-3 ml-2" />
                      <span>{formatDate(asset.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {zoomImage && (
        <ImageZoomModal
          imageUrl={zoomImage.url}
          comment={zoomImage.comment}
          onClose={() => setZoomImage(null)}
        />
      )}

      {editingAsset && (
        <EditAssetModal
          asset={editingAsset}
          currentUser={currentUser}
          onClose={() => setEditingAsset(null)}
          onSave={() => {
            setEditingAsset(null);
            fetchAssets();
          }}
        />
      )}

      {viewingReport && (
        <AssetReportView
          asset={viewingReport.asset}
          report={viewingReport.report}
          onClose={() => setViewingReport(null)}
        />
      )}

      {addingReportFor && (
        <AddReportModal
          assetTag={addingReportFor.assetTag}
          currentUser={currentUser}
          onClose={() => setAddingReportFor(null)}
          onSave={() => {
            setAddingReportFor(null);
            fetchReports();
          }}
        />
      )}

      {viewingHistoryFor && (
        <ReportHistoryModal
          assetTag={viewingHistoryFor.assetTag}
          reports={reportsByAsset[viewingHistoryFor.assetTag] || []}
          currentUser={currentUser}
          isAdmin={isAdmin}
          isGuest={isGuest}
          onClose={() => setViewingHistoryFor(null)}
          onViewReport={(report) => {
            setViewingReport({ asset: viewingHistoryFor, report });
            setViewingHistoryFor(null);
          }}
          onEditReport={(report) => {
            setEditingReport({ asset: viewingHistoryFor, report });
            setViewingHistoryFor(null);
          }}
          onDeleteReport={async (report) => {
            await handleDeleteReport(report);
          }}
        />
      )}

      {editingReport && (
        <EditReportModal
          report={editingReport.report}
          currentUser={currentUser}
          onClose={() => setEditingReport(null)}
          onSave={() => {
            setEditingReport(null);
            fetchReports();
          }}
        />
      )}

      {viewingActivityLog && (
        <ActivityLogModal
          type="asset"
          identifier={viewingActivityLog}
          onClose={() => setViewingActivityLog(null)}
        />
      )}

      {/* Pagination - Bottom */}
      {sortedAssets.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value) as 10 | 20 | 50);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-4 left-4 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
          aria-label="Scroll to top"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </div>
  );
}