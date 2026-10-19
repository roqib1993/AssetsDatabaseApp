import { useState, useEffect, useRef } from "react";
import { NewAssetForm } from "./components/NewAssetForm";
import { AssetListView } from "./components/AssetListView";
import { UserManagement } from "./components/UserManagement";
import { LoginPage } from "./components/LoginPage";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { Package, List, Users, LogOut, User, ChevronDown, Lock, ExternalLink } from "lucide-react";

type Tab = "new-asset" | "asset-list" | "user-management";

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("standard");
  const [activeTab, setActiveTab] = useState<Tab>("asset-list");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem("currentUser");
    const storedRole = localStorage.getItem("userRole") || "standard";
    if (storedUser) {
      setCurrentUser(storedUser);
      setUserRole(storedRole);
      // Guest users start on asset-list
      if (storedRole === "guest") {
        setActiveTab("asset-list");
      }
    }
  }, []);

  useEffect(() => {
    // Close user menu when clicking outside
    const handleClickOutside = () => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogin = (username: string) => {
    const role = localStorage.getItem("userRole") || "standard";
    setCurrentUser(username);
    setUserRole(role);
    // Guest users start on asset-list
    if (role === "guest") {
      setActiveTab("asset-list");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userRole");
    setCurrentUser(null);
    setUserRole("standard");
    setActiveTab("asset-list");
  };

  const isAdmin = currentUser === "ABDU0537" || userRole === "admin";
  const isGuest = userRole === "guest";

  const handleAssetCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          
          {/* Top Row: Title, Link, and User Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
            
            {/* Left Side: Title */}
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-semibold">Asset Database Management</h1>
            </div>

            {/* Right Side: EIC7 Link & User Controls */}
            {/* The main wrapper is no longer scrollable */}
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              
              {/* Scrollable area JUST for Link and User Info so it doesn't clip the dropdown */}
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar justify-start sm:justify-end">
                
                {/* EIC7 Portal Link */}
                <a
                  href="https://eenputra.github.io/EIC7-PORTAL/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition-colors shrink-0"
                  title="Open EIC7 main portal"
                >
                  <ExternalLink className="size-4" />
                  <span className="whitespace-nowrap">EIC7 Portal</span>
                </a>

                {/* User Info */}
                <div className="flex items-center gap-2 text-gray-700 whitespace-nowrap shrink-0">
                  <User className="size-5" />
                  <span>{currentUser}</span>
                  
                  {isAdmin && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full border border-purple-300">
                      Admin
                    </span>
                  )}
                  {isGuest && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-300">
                      Guest (View Only)
                    </span>
                  )}
                  {!isAdmin && !isGuest && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-300">
                      Standard
                    </span>
                  )}
                </div>
              </div>

              {/* Dropdown Menu (Moved completely OUTSIDE the overflow container) */}
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="flex items-center gap-2 px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronDown className="size-5" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowChangePassword(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                    >
                      <Lock className="size-5" />
                      <span>Change Password</span>
                    </button>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                    >
                      <LogOut className="size-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs Row */}
          <div className="flex gap-2">
            {!isGuest && (
              <button
                onClick={() => setActiveTab("new-asset")}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b-2 transition-colors min-w-0 ${
                  activeTab === "new-asset"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <Package className="size-5 flex-shrink-0" />
                <span className="text-xs sm:text-base whitespace-nowrap">New Asset</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("asset-list")}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b-2 transition-colors min-w-0 ${
                activeTab === "asset-list"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <List className="size-5 flex-shrink-0" />
              <span className="text-xs sm:text-base whitespace-nowrap">Asset List</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab("user-management")}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b-2 transition-colors min-w-0 ${
                  activeTab === "user-management"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                <Users className="size-5 flex-shrink-0" />
                <span className="text-xs sm:text-base whitespace-nowrap">Users</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto" ref={contentAreaRef}>
        {activeTab === "new-asset" && (
          <NewAssetForm 
            onAssetCreated={handleAssetCreated}
            currentUser={currentUser}
          />
        )}
        {activeTab === "asset-list" && (
          <AssetListView 
            refreshTrigger={refreshTrigger}
            currentUser={currentUser}
            isAdmin={isAdmin}
            isGuest={isGuest}
          />
        )}
        {activeTab === "user-management" && (
          <UserManagement
            currentUser={currentUser}
          />
        )}
      </div>
      
      {/* Modals */}
      {showChangePassword && (
        <ChangePasswordModal
          username={currentUser}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
}