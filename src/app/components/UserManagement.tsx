import { useState, useEffect } from "react";
import { Users, Plus, Trash, RefreshCw, Shield, ChevronDown, Activity } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { ActivityLogModal } from "./ActivityLogModal";

interface User {
  username: string;
  password: string;
  isAdmin: boolean;
  role?: string;
  createdAt: string;
}

interface UserManagementProps {
  currentUser: string;
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/users`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername.trim()) {
      alert("Username is required");
      return;
    }

    const username = newUsername.trim().toUpperCase();

    // Check if user already exists
    if (users.some((u) => u.username === username)) {
      alert("Username already exists");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            username,
            password: "eic78", // Default password
            isAdmin: false,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add user");
      }

      alert(`User ${username} created successfully with default password: eic78`);
      setNewUsername("");
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      alert(`Failed to add user: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (username: string) => {
    if (!confirm(`Reset password for ${username} to default (eic78)?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/users/${username}/reset-password`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      alert(`Password for ${username} has been reset to: eic78`);
      fetchUsers();
    } catch (error) {
      console.error("Error resetting password:", error);
      alert(`Failed to reset password: ${error}`);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === "ABDU0537") {
      alert("Cannot delete the main administrator account");
      return;
    }

    if (!confirm(`Are you sure you want to delete user ${username}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/users/${username}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      alert(`User ${username} has been deleted`);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(`Failed to delete user: ${error}`);
    }
  };

  const handleChangeRole = async (username: string, newRole: string) => {
    if (!confirm(`Change ${username}'s role to ${newRole}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d0c6593/users/${username}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change role");
      }

      alert(`User ${username}'s role has been changed to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      alert(`Failed to change role: ${error}`);
    }
  };

  const handleViewActivityLog = (user: User) => {
    setSelectedUser(user);
    setShowActivityLog(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="size-8 text-purple-600" />
          <h1 className="text-3xl">User Management</h1>
        </div>
        <p className="text-gray-600">
          Manage user accounts, reset passwords, and control access
        </p>
      </div>

      {/* Add New User Form */}
      <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-white">
        <h2 className="text-xl mb-4">Add New User</h2>
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block mb-2">
              <span className="text-red-500">*</span> Username
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toUpperCase())}
              placeholder="e.g., JOHN0001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Default password will be set to: <span className="font-semibold">eic78</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="size-5" />
            {isSubmitting ? "Adding User..." : "Add User"}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div>
        <h2 className="text-xl mb-4">Users List</h2>

        {isLoading ? (
          <div className="text-center p-8 text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Users className="size-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const userRole = user.role || (user.isAdmin ? "admin" : "standard");
              
              return (
                <div
                  key={user.username}
                  className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-medium">{user.username}</span>
                        {userRole === "admin" && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full border border-purple-300 flex items-center gap-1">
                            <Shield className="size-3" />
                            Admin
                          </span>
                        )}
                        {userRole === "guest" && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-300">
                            Guest
                          </span>
                        )}
                        {userRole === "standard" && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-300">
                            Standard
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-1">
                        Created: {new Date(user.createdAt).toLocaleString()}
                      </p>
                      
                      <p className="text-sm text-gray-600">
                        Current password: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{user.password}</span>
                      </p>

                      {/* Role Change Dropdown */}
                      <div className="mt-3">
                        <label className="text-xs text-gray-600 block mb-1">Change Role:</label>
                        <select
                          value={userRole}
                          onChange={(e) => handleChangeRole(user.username, e.target.value)}
                          disabled={user.username === "ABDU0537"}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="guest">Guest (View Only)</option>
                          <option value="standard">Standard (View & Edit)</option>
                          <option value="admin">Admin (Full Access)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleViewActivityLog(user)}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors whitespace-nowrap"
                        title="View activity log"
                      >
                        <Activity className="size-4" />
                        Activity
                      </button>
                      
                      <button
                        onClick={() => handleResetPassword(user.username)}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                        title="Reset password to default (eic78)"
                      >
                        <RefreshCw className="size-4" />
                        Reset
                      </button>

                      {user.username !== "ABDU0537" && (
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                          title="Delete user account"
                        >
                          <Trash className="size-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> The main administrator account (ABDU0537) cannot be deleted
          to ensure continuous system access.
        </p>
      </div>

      {/* Activity Log Modal */}
      {showActivityLog && selectedUser && (
        <ActivityLogModal
          type="user"
          identifier={selectedUser.username}
          onClose={() => {
            setShowActivityLog(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}