import { useState, useEffect, useRef } from "react";
import { ImageUploader } from "./ImageUploader";
import { ImageZoomModal } from "./ImageZoomModal";
import { ClipboardList, Plus, Trash, Search, MapPin, Upload } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface ImageWithComment {
  url: string;
  comment: string;
}

interface Asset {
  assetTag: string;
  description: string;
  location: string;
}

interface WorkOrder {
  woNumber: string;
  assetTag: string;
  status: "preparation" | "in progress" | "waiting" | "done";
  pictures: ImageWithComment[];
  remarks: string;
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = "all" | "preparation" | "in progress" | "waiting" | "done";

interface WorkProgressFormProps {
  refreshTrigger: number;
  onWorkOrderCreated: () => void;
  highlightedWorkOrder?: string | null;
  navigateToWorkOrder: (woNumber: string) => void;
  currentUser: string;
  isAdmin: boolean;
}

export function WorkProgressForm({
  refreshTrigger,
  onWorkOrderCreated,
  highlightedWorkOrder,
  navigateToWorkOrder,
  currentUser,
  isAdmin,
}: WorkProgressFormProps) {
  const [woNumber, setWoNumber] = useState("");
  const [selectedAssetTag, setSelectedAssetTag] = useState("");
  const [status, setStatus] = useState<WorkOrder["status"]>("preparation");
  const [pictures, setPictures] = useState<ImageWithComment[]>([]);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [zoomImage, setZoomImage] = useState<{ url: string; comment?: string } | null>(null);
  const [editingWO, setEditingWO] = useState<string | null>(null);
  const [editRemarks, setEditRemarks] = useState("");
  const [editPictures, setEditPictures] = useState<ImageWithComment[]>([]);
  const workOrderRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (highlightedWorkOrder && workOrderRefs.current[highlightedWorkOrder]) {
      const element = workOrderRefs.current[highlightedWorkOrder];
      // Scroll to the work order
      setTimeout(() => {
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [highlightedWorkOrder, workOrders]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch assets
      const assetsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/assets`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json();
        setAssets(assetsData.assets || []);
      }

      // Fetch work orders
      const workOrdersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/work-orders`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (workOrdersResponse.ok) {
        const workOrdersData = await workOrdersResponse.json();
        setWorkOrders(workOrdersData.workOrders || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!woNumber.trim() || !selectedAssetTag || !status) {
      alert("WO Number, Asset Tag, and Status are required");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/work-orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            woNumber: woNumber.trim(),
            assetTag: selectedAssetTag,
            status,
            pictures,
            remarks: remarks.trim(),
            createdBy: currentUser,
            lastUpdatedBy: currentUser,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create work order");
      }

      // Reset form
      setWoNumber("");
      setSelectedAssetTag("");
      setStatus("preparation");
      setPictures([]);
      setRemarks("");

      alert("Work order created successfully!");
      onWorkOrderCreated();
      fetchData();
    } catch (error) {
      console.error("Error creating work order:", error);
      alert(`Failed to create work order: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (woNumber: string) => {
    if (!confirm(`Are you sure you want to delete work order ${woNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/work-orders/${woNumber}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete work order");
      }

      alert("Work order deleted successfully!");
      fetchData();
    } catch (error) {
      console.error("Error deleting work order:", error);
      alert(`Failed to delete work order: ${error}`);
    }
  };

  const handleStatusUpdate = async (woNumber: string, newStatus: WorkOrder["status"]) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/work-orders/${woNumber}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ status: newStatus, lastUpdatedBy: currentUser }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update work order");
      }

      fetchData();
    } catch (error) {
      console.error("Error updating work order:", error);
      alert(`Failed to update work order: ${error}`);
    }
  };

  const startEditingWO = (wo: WorkOrder) => {
    setEditingWO(wo.woNumber);
    setEditRemarks(wo.remarks || "");
    setEditPictures(wo.pictures || []);
  };

  const saveWOEdits = async (woNumber: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/work-orders/${woNumber}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            remarks: editRemarks,
            pictures: editPictures,
            lastUpdatedBy: currentUser,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update work order");
      }

      setEditingWO(null);
      setEditRemarks("");
      setEditPictures([]);
      alert("Work order updated successfully!");
      fetchData();
    } catch (error) {
      console.error("Error updating work order:", error);
      alert(`Failed to update work order: ${error}`);
    }
  };

  const cancelEditingWO = () => {
    setEditingWO(null);
    setEditRemarks("");
    setEditPictures([]);
  };

  // Calculate status counts
  const statusCounts = {
    preparation: workOrders.filter((wo) => wo.status === "preparation").length,
    "in progress": workOrders.filter((wo) => wo.status === "in progress").length,
    waiting: workOrders.filter((wo) => wo.status === "waiting").length,
    done: workOrders.filter((wo) => wo.status === "done").length,
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.woNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.assetTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.remarks && wo.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    preparation: "bg-yellow-100 text-yellow-800 border-yellow-300",
    "in progress": "bg-blue-100 text-blue-800 border-blue-300",
    waiting: "bg-orange-100 text-orange-800 border-orange-300",
    done: "bg-green-100 text-green-800 border-green-300",
  };

  const getAssetLocation = (assetTag: string) => {
    const asset = assets.find((a) => a.assetTag === assetTag);
    return asset?.location || "Unknown location";
  };

  const capitalizeStatus = (status: string) => {
    return status
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="size-8 text-blue-600" />
          <h1 className="text-3xl">Work Progress</h1>
        </div>
        <p className="text-gray-600">
          Track work orders and their progress status
        </p>
      </div>

      {/* Status Summary Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter("preparation")}
          className={`p-4 border-2 rounded-lg transition-all ${
            statusFilter === "preparation"
              ? "border-yellow-500 bg-yellow-50"
              : "border-gray-200 hover:border-yellow-300 bg-white"
          }`}
        >
          <div className="text-2xl mb-1">{statusCounts.preparation}</div>
          <div className="text-sm text-gray-600">Preparation</div>
        </button>

        <button
          onClick={() => setStatusFilter("in progress")}
          className={`p-4 border-2 rounded-lg transition-all ${
            statusFilter === "in progress"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-blue-300 bg-white"
          }`}
        >
          <div className="text-2xl mb-1">{statusCounts["in progress"]}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </button>

        <button
          onClick={() => setStatusFilter("waiting")}
          className={`p-4 border-2 rounded-lg transition-all ${
            statusFilter === "waiting"
              ? "border-orange-500 bg-orange-50"
              : "border-gray-200 hover:border-orange-300 bg-white"
          }`}
        >
          <div className="text-2xl mb-1">{statusCounts.waiting}</div>
          <div className="text-sm text-gray-600">Waiting</div>
        </button>

        <button
          onClick={() => setStatusFilter("done")}
          className={`p-4 border-2 rounded-lg transition-all ${
            statusFilter === "done"
              ? "border-green-500 bg-green-50"
              : "border-gray-200 hover:border-green-300 bg-white"
          }`}
        >
          <div className="text-2xl mb-1">{statusCounts.done}</div>
          <div className="text-sm text-gray-600">Done</div>
        </button>
      </div>

      {/* New Work Order Form - Highlighted Section */}
      <div className="p-6 sm:p-8 border-2 border-blue-300 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Plus className="size-6 text-white" />
          </div>
          <h2 className="text-2xl text-blue-900">Create New Work Order</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">
                <span className="text-red-500">*</span> WO Number
              </label>
              <input
                type="text"
                value={woNumber}
                onChange={(e) => setWoNumber(e.target.value)}
                placeholder="e.g., WO-001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block mb-2">
                <span className="text-red-500">*</span> Asset Tag
              </label>
              <select
                value={selectedAssetTag}
                onChange={(e) => setSelectedAssetTag(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Select an asset...</option>
                {assets.map((asset) => (
                  <option key={asset.assetTag} value={asset.assetTag}>
                    {asset.assetTag} - {asset.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-red-500">*</span> Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["preparation", "in progress", "waiting", "done"] as const).map(
                (s) => (
                  <label
                    key={s}
                    className={`flex items-center justify-center px-4 py-2 border-2 rounded-lg cursor-pointer transition-all ${
                      status === s
                        ? statusColors[s] + " border-current"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={(e) =>
                        setStatus(e.target.value as WorkOrder["status"])
                      }
                      className="hidden"
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block mb-2">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks or notes..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block mb-2">Evidence Pictures</label>
            <ImageUploader images={pictures} onChange={setPictures} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="size-5" />
            {isSubmitting ? "Creating Work Order..." : "Create Work Order"}
          </button>
        </form>
      </div>

      {/* Work Orders List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl">Work Orders List</h2>
          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="text-sm px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              ← Show All
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by WO number, asset tag, or remarks..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center p-8 text-gray-500">
            Loading work orders...
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <ClipboardList className="size-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">
              {searchQuery || statusFilter !== "all"
                ? "No work orders found matching your filters"
                : "No work orders yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWorkOrders.map((wo) => (
              <div
                key={wo.woNumber}
                className={`border rounded-lg p-4 bg-white transition-all ${
                  highlightedWorkOrder === wo.woNumber
                    ? "border-blue-500 border-2 shadow-lg ring-4 ring-blue-200"
                    : "border-gray-200"
                }`}
                ref={(el) => (workOrderRefs.current[wo.woNumber] = el)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{wo.woNumber}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm border ${
                          statusColors[wo.status]
                        }`}
                      >
                        {capitalizeStatus(wo.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-1">
                      Asset: <span className="text-blue-600">{wo.assetTag}</span>
                    </p>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                      <MapPin className="size-4" />
                      <span>{getAssetLocation(wo.assetTag)}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Created by: {wo.createdBy || "Unknown"} | Last updated by: {wo.lastUpdatedBy || "Unknown"}
                    </p>
                  </div>
                  {(isAdmin || wo.createdBy === currentUser) && (
                    <button
                      onClick={() => handleDelete(wo.woNumber)}
                      className="text-red-500 hover:text-red-700 p-2"
                      title={isAdmin ? "Admin: Can delete any work order" : "You created this work order"}
                    >
                      <Trash className="size-5" />
                    </button>
                  )}
                </div>

                {editingWO === wo.woNumber ? (
                  <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Update Status:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          ["preparation", "in progress", "waiting", "done"] as const
                        ).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusUpdate(wo.woNumber, s)}
                            className={`px-3 py-2 border-2 rounded-lg text-sm transition-all ${
                              wo.status === s
                                ? statusColors[s] + " border-current"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {capitalizeStatus(s)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Remarks:
                      </label>
                      <textarea
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        placeholder="Add remarks..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">
                        Add More Evidence Photos:
                      </label>
                      <ImageUploader
                        images={editPictures}
                        onChange={setEditPictures}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveWOEdits(wo.woNumber)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEditingWO}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm text-gray-600 mb-2">
                        Update Status:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          ["preparation", "in progress", "waiting", "done"] as const
                        ).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusUpdate(wo.woNumber, s)}
                            className={`px-3 py-2 border-2 rounded-lg text-sm transition-all ${
                              wo.status === s
                                ? statusColors[s] + " border-current"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {capitalizeStatus(s)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {wo.remarks && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Remarks:</p>
                        <p className="text-sm text-gray-800">{wo.remarks}</p>
                      </div>
                    )}

                    <button
                      onClick={() => startEditingWO(wo)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3"
                    >
                      <Upload className="size-4" />
                      Add more photos or update remarks
                    </button>

                    {wo.pictures && wo.pictures.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          Evidence ({wo.pictures.length} photo(s))
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {wo.pictures.map((pic, index) => (
                            <div
                              key={index}
                              className="relative group cursor-pointer"
                              onClick={() => setZoomImage({ url: pic.url, comment: pic.comment })}
                            >
                              <img
                                src={pic.url}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg hover:shadow-lg transition-shadow"
                              />
                              {pic.comment && (
                                <div className="absolute inset-0 bg-black bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-2 flex items-center justify-center">
                                  <p className="text-white text-xs text-center">
                                    {pic.comment}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {zoomImage && (
        <ImageZoomModal
          imageUrl={zoomImage.url}
          comment={zoomImage.comment}
          onClose={() => setZoomImage(null)}
        />
      )}
    </div>
  );
}