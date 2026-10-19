import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Bucket name constant
const bucketName = 'make-6d0c6593-assets';

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize default users on startup
const initializeDefaultUsers = async () => {
  try {
    const defaultUsers = [
      { username: "ABDU0537", password: "eic78", isAdmin: true },
      { username: "ADNA0499", password: "eic78", isAdmin: false },
      { username: "MAHF0662", password: "eic78", isAdmin: false },
      { username: "FAUZ0565", password: "eic78", isAdmin: false },
      { username: "FEBR0663", password: "eic78", isAdmin: false },
      { username: "ISYA0318", password: "eic78", isAdmin: false },
      { username: "ZAIN0479", password: "eic78", isAdmin: false },
    ];

    const initPromises = defaultUsers.map(async (user) => {
      try {
        const existingUser = await kv.get(`user_${user.username}`);
        if (!existingUser) {
          await kv.set(`user_${user.username}`, {
            ...user,
            createdAt: new Date().toISOString(),
          });
          console.log(`Initialized user: ${user.username}`);
        }
      } catch (error) {
        console.log(`Error checking/creating user ${user.username}: ${error}`);
      }
    });
    
    await Promise.all(initPromises);
  } catch (error) {
    console.log(`Error in initializeDefaultUsers: ${error}`);
  }
};

// Run initialization with timeout
Promise.race([
  initializeDefaultUsers(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('User initialization timeout')), 5000))
]).catch(error => console.log(`User initialization warning: ${error}`));

// Create storage bucket on startup with timeout
Promise.race([
  (async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: false });
        console.log(`Created bucket: ${bucketName}`);
      }
    } catch (error) {
      console.log(`Error creating storage bucket: ${error}`);
    }
  })(),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Bucket creation timeout')), 5000))
]).catch(error => console.log(`Bucket initialization warning: ${error}`));

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to extract filename from signed URL
const extractFilenameFromUrl = (url: string): string | null => {
  try {
    // Extract filename from URL pattern: .../storage/v1/object/sign/BUCKET_NAME/FILENAME?token=...
    const match = url.match(/\/storage\/v1\/object\/sign\/[^/]+\/([^?]+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.log(`Error extracting filename from URL: ${error}`);
    return null;
  }
};

// Helper function to delete images from storage
const deleteImagesFromStorage = async (pictures: Array<{ url: string; comment: string }>) => {
  if (!pictures || pictures.length === 0) return;
  
  for (const picture of pictures) {
    try {
      const filename = extractFilenameFromUrl(picture.url);
      if (filename) {
        const { error } = await supabase.storage
          .from(bucketName)
          .remove([filename]);
        
        if (error) {
          console.log(`Error deleting file ${filename}: ${error.message}`);
        } else {
          console.log(`Successfully deleted file: ${filename}`);
        }
      }
    } catch (error) {
      console.log(`Error deleting image from storage: ${error}`);
    }
  }
};

// Health check endpoint
app.get("/make-server-6d0c6593/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== ACTIVITY LOG HELPER ====================

// Helper function to create activity log entry
async function logActivity(activity: {
  username: string;
  action: string;
  assetTag?: string;
  details?: string;
  metadata?: any;
}) {
  const timestamp = new Date().toISOString();
  const logId = `activity_${timestamp}_${Math.random().toString(36).substring(7)}`;
  
  const logEntry = {
    id: logId,
    username: activity.username,
    action: activity.action,
    assetTag: activity.assetTag || null,
    details: activity.details || "",
    metadata: activity.metadata || {},
    timestamp,
  };
  
  await kv.set(logId, logEntry);
  return logEntry;
}

// ============ ASSET ROUTES ============

// Create new asset
app.post("/make-server-6d0c6593/assets", async (c) => {
  try {
    const body = await c.req.json();
    const { assetTag, description, location, pictures, createdBy, highLevelInfo } = body;

    if (!assetTag || !location) {
      return c.json({ error: "Asset Tag and Location are required" }, 400);
    }

    // Check if asset tag already exists
    const existingAsset = await kv.get(`asset_${assetTag}`);
    if (existingAsset) {
      return c.json({ error: `Asset tag "${assetTag}" already exists in the database` }, 409);
    }

    const asset = {
      assetTag,
      description: description || "",
      location,
      highLevelInfo: highLevelInfo || "",
      pictures: pictures || [],
      asFound: [],
      asLeft: [],
      createdBy: createdBy || "Unknown",
      lastUpdatedBy: createdBy || "Unknown",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`asset_${assetTag}`, asset);
    
    // Log activity
    await logActivity({
      username: createdBy || "Unknown",
      action: "CREATE_ASSET",
      assetTag: assetTag,
      details: `Created new asset: ${assetTag} at ${location}`,
      metadata: {
        description: description || "",
        location: location,
        highLevelInfo: highLevelInfo || "",
        pictureCount: pictures?.length || 0
      }
    });
    
    return c.json({ success: true, asset });
  } catch (error) {
    console.log(`Error creating asset: ${error}`);
    return c.json({ error: `Failed to create asset: ${error}` }, 500);
  }
});

// Get all assets
app.get("/make-server-6d0c6593/assets", async (c) => {
  try {
    const assets = await kv.getByPrefix("asset_");
    return c.json({ assets });
  } catch (error) {
    console.log(`Error fetching assets: ${error}`);
    return c.json({ error: `Failed to fetch assets: ${error}` }, 500);
  }
});

// Get specific asset
app.get("/make-server-6d0c6593/assets/:tag", async (c) => {
  try {
    const tag = c.req.param("tag");
    const asset = await kv.get(`asset_${tag}`);
    
    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }
    
    return c.json({ asset });
  } catch (error) {
    console.log(`Error fetching asset: ${error}`);
    return c.json({ error: `Failed to fetch asset: ${error}` }, 500);
  }
});

// Update asset
app.put("/make-server-6d0c6593/assets/:tag", async (c) => {
  try {
    const tag = c.req.param("tag");
    const body = await c.req.json();
    
    const existingAsset = await kv.get(`asset_${tag}`);
    if (!existingAsset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    const updatedAsset = {
      ...existingAsset,
      ...body,
      assetTag: tag, // Keep original tag
      createdBy: existingAsset.createdBy, // Keep original creator
      createdAt: existingAsset.createdAt, // Keep original creation date
      lastUpdatedBy: body.lastUpdatedBy || existingAsset.lastUpdatedBy,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`asset_${tag}`, updatedAsset);
    
    // Detect changes and log activity
    const changes: string[] = [];
    const changesMetadata: any = {};
    
    if (body.description !== undefined && body.description !== existingAsset.description) {
      changes.push("description");
      changesMetadata.description = { from: existingAsset.description, to: body.description };
    }
    if (body.location !== undefined && body.location !== existingAsset.location) {
      changes.push("location");
      changesMetadata.location = { from: existingAsset.location, to: body.location };
    }
    if (body.highLevelInfo !== undefined && body.highLevelInfo !== existingAsset.highLevelInfo) {
      changes.push("high level info");
      changesMetadata.highLevelInfo = { from: existingAsset.highLevelInfo, to: body.highLevelInfo };
    }
    
    // Better photo change descriptions with specific positions
    if (body.pictures !== undefined && JSON.stringify(body.pictures) !== JSON.stringify(existingAsset.pictures)) {
      const oldPictures = existingAsset.pictures || [];
      const newPictures = body.pictures || [];
      
      // Extract URLs for comparison
      const oldUrls = oldPictures.map((p: any) => p.url);
      const newUrls = newPictures.map((p: any) => p.url);
      
      // Find added photos
      const addedPhotos: number[] = [];
      newPictures.forEach((photo: any, index: number) => {
        if (!oldUrls.includes(photo.url)) {
          addedPhotos.push(index + 1); // 1-indexed
        }
      });
      
      // Find deleted photos
      const deletedPhotos: number[] = [];
      oldPictures.forEach((photo: any, index: number) => {
        if (!newUrls.includes(photo.url)) {
          deletedPhotos.push(index + 1); // 1-indexed
        }
      });
      
      if (addedPhotos.length > 0) {
        changes.push(`uploaded ${addedPhotos.length} photo${addedPhotos.length > 1 ? 's' : ''}`);
        changesMetadata.pictures = `Uploaded photo${addedPhotos.length > 1 ? 's' : ''} #${addedPhotos.join(', #')}`;
      } else if (deletedPhotos.length > 0) {
        changes.push(`deleted ${deletedPhotos.length} photo${deletedPhotos.length > 1 ? 's' : ''}`);
        changesMetadata.pictures = `Deleted photo${deletedPhotos.length > 1 ? 's' : ''} #${deletedPhotos.join(', #')}`;
      } else {
        changes.push("updated photo comments");
        changesMetadata.pictures = `Updated photo comments (${newPictures.length} total)`;
      }
    }
    
    if (body.asFound !== undefined && JSON.stringify(body.asFound) !== JSON.stringify(existingAsset.asFound)) {
      const oldPhotos = existingAsset.asFound || [];
      const newPhotos = body.asFound || [];
      
      // Extract URLs for comparison
      const oldUrls = oldPhotos.map((p: any) => p.url);
      const newUrls = newPhotos.map((p: any) => p.url);
      
      // Find added photos
      const addedPhotos: number[] = [];
      newPhotos.forEach((photo: any, index: number) => {
        if (!oldUrls.includes(photo.url)) {
          addedPhotos.push(index + 1);
        }
      });
      
      // Find deleted photos
      const deletedPhotos: number[] = [];
      oldPhotos.forEach((photo: any, index: number) => {
        if (!newUrls.includes(photo.url)) {
          deletedPhotos.push(index + 1);
        }
      });
      
      if (addedPhotos.length > 0) {
        changes.push(`As Found: uploaded photo${addedPhotos.length > 1 ? 's' : ''}`);
        changesMetadata.asFound = `Uploaded photo${addedPhotos.length > 1 ? 's' : ''} #${addedPhotos.join(', #')}`;
      } else if (deletedPhotos.length > 0) {
        changes.push(`As Found: deleted photo${deletedPhotos.length > 1 ? 's' : ''}`);
        changesMetadata.asFound = `Deleted photo${deletedPhotos.length > 1 ? 's' : ''} #${deletedPhotos.join(', #')}`;
      } else {
        changes.push("As Found: updated photo comments");
        changesMetadata.asFound = `Updated photo comments (${newPhotos.length} total)`;
      }
    }
    
    if (body.asLeft !== undefined && JSON.stringify(body.asLeft) !== JSON.stringify(existingAsset.asLeft)) {
      const oldPhotos = existingAsset.asLeft || [];
      const newPhotos = body.asLeft || [];
      
      // Extract URLs for comparison
      const oldUrls = oldPhotos.map((p: any) => p.url);
      const newUrls = newPhotos.map((p: any) => p.url);
      
      // Find added photos
      const addedPhotos: number[] = [];
      newPhotos.forEach((photo: any, index: number) => {
        if (!oldUrls.includes(photo.url)) {
          addedPhotos.push(index + 1);
        }
      });
      
      // Find deleted photos
      const deletedPhotos: number[] = [];
      oldPhotos.forEach((photo: any, index: number) => {
        if (!newUrls.includes(photo.url)) {
          deletedPhotos.push(index + 1);
        }
      });
      
      if (addedPhotos.length > 0) {
        changes.push(`As Left: uploaded photo${addedPhotos.length > 1 ? 's' : ''}`);
        changesMetadata.asLeft = `Uploaded photo${addedPhotos.length > 1 ? 's' : ''} #${addedPhotos.join(', #')}`;
      } else if (deletedPhotos.length > 0) {
        changes.push(`As Left: deleted photo${deletedPhotos.length > 1 ? 's' : ''}`);
        changesMetadata.asLeft = `Deleted photo${deletedPhotos.length > 1 ? 's' : ''} #${deletedPhotos.join(', #')}`;
      } else {
        changes.push("As Left: updated photo comments");
        changesMetadata.asLeft = `Updated photo comments (${newPhotos.length} total)`;
      }
    }
    
    // Log activity if there were changes
    if (changes.length > 0) {
      await logActivity({
        username: body.lastUpdatedBy || "Unknown",
        action: "UPDATE_ASSET",
        assetTag: tag,
        details: `Updated ${changes.join(", ")} for asset ${tag}`,
        metadata: changesMetadata
      });
    }
    
    return c.json({ success: true, asset: updatedAsset });
  } catch (error) {
    console.log(`Error updating asset: ${error}`);
    return c.json({ error: `Failed to update asset: ${error}` }, 500);
  }
});

// Delete asset
app.delete("/make-server-6d0c6593/assets/:tag", async (c) => {
  try {
    const tag = c.req.param("tag");
    const deletedBy = c.req.query("deletedBy") || "Unknown";
    
    const asset = await kv.get(`asset_${tag}`);
    
    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    // Count total images
    const totalPictures = (asset.pictures?.length || 0) + 
                         (asset.asFound?.length || 0) + 
                         (asset.asLeft?.length || 0);

    // Delete all associated images from storage
    if (asset.pictures && asset.pictures.length > 0) {
      console.log(`Deleting ${asset.pictures.length} images for asset ${tag}`);
      await deleteImagesFromStorage(asset.pictures);
    }
    
    // Delete As Found images
    if (asset.asFound && asset.asFound.length > 0) {
      console.log(`Deleting ${asset.asFound.length} As Found images for asset ${tag}`);
      await deleteImagesFromStorage(asset.asFound);
    }
    
    // Delete As Left images
    if (asset.asLeft && asset.asLeft.length > 0) {
      console.log(`Deleting ${asset.asLeft.length} As Left images for asset ${tag}`);
      await deleteImagesFromStorage(asset.asLeft);
    }

    // Cascade delete all reports belonging to this asset (including their photos)
    try {
      const assetReports = await kv.getByPrefix(`report_${tag}_`);
      if (assetReports && assetReports.length > 0) {
        for (const report of assetReports) {
          await deleteImagesFromStorage(report.pictures || []);
          await deleteImagesFromStorage(report.asFound || []);
          await deleteImagesFromStorage(report.asLeft || []);
          if (report.reportId) {
            await kv.del(report.reportId);
          }
        }
        console.log(`Deleted ${assetReports.length} report(s) for asset ${tag}`);
      }
    } catch (reportError) {
      console.log(`Error deleting reports for asset ${tag}: ${reportError}`);
    }

    await kv.del(`asset_${tag}`);

    // Log deletion activity
    await logActivity({
      username: deletedBy,
      action: "DELETE_ASSET",
      assetTag: tag,
      details: `Deleted asset ${tag} from ${asset.location}`,
      metadata: {
        description: asset.description,
        location: asset.location,
        highLevelInfo: asset.highLevelInfo || "",
        totalImages: totalPictures,
        createdBy: asset.createdBy
      }
    });
    
    return c.json({ success: true, message: "Asset deleted" });
  } catch (error) {
    console.log(`Error deleting asset: ${error}`);
    return c.json({ error: `Failed to delete asset: ${error}` }, 500);
  }
});

// Bulk delete assets
app.post("/make-server-6d0c6593/assets/bulk-delete", async (c) => {
  try {
    const body = await c.req.json();
    const { assetTags } = body;

    if (!assetTags || !Array.isArray(assetTags) || assetTags.length === 0) {
      return c.json({ error: "Asset tags array is required" }, 400);
    }

    let deletedAssets = 0;
    const errors: string[] = [];

    for (const tag of assetTags) {
      try {
        // Get the asset
        const asset = await kv.get(`asset_${tag}`);
        
        if (asset) {
          // Delete all associated images from storage
          if (asset.pictures && asset.pictures.length > 0) {
            console.log(`Deleting ${asset.pictures.length} images for asset ${tag}`);
            await deleteImagesFromStorage(asset.pictures);
          }

          // Delete the asset from database
          await kv.del(`asset_${tag}`);
          deletedAssets++;
          console.log(`Deleted asset: ${tag}`);
        }
      } catch (error) {
        console.log(`Error deleting asset ${tag}: ${error}`);
        errors.push(`Failed to delete ${tag}: ${error}`);
      }
    }

    return c.json({ 
      success: true, 
      deletedAssets,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deletedAssets} asset(s)` 
    });
  } catch (error) {
    console.log(`Error in bulk delete assets: ${error}`);
    return c.json({ error: `Failed to bulk delete assets: ${error}` }, 500);
  }
});

// ============ IMAGE UPLOAD ROUTE ============

// Upload image to Supabase Storage
app.post("/make-server-6d0c6593/upload-image", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
      });

    if (error) {
      console.log(`Error uploading image: ${error.message}`);
      return c.json({ error: `Failed to upload image: ${error.message}` }, 500);
    }

    // Generate signed URL (valid for 1 year)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);

    if (signedUrlError) {
      console.log(`Error creating signed URL: ${signedUrlError.message}`);
      return c.json({ error: `Failed to create signed URL: ${signedUrlError.message}` }, 500);
    }

    return c.json({ 
      success: true, 
      url: signedUrlData.signedUrl,
      fileName 
    });
  } catch (error) {
    console.log(`Error in upload-image endpoint: ${error}`);
    return c.json({ error: `Failed to upload image: ${error}` }, 500);
  }
});

// ============ USER MANAGEMENT ROUTES ============

// Get all users
app.get("/make-server-6d0c6593/users", async (c) => {
  try {
    const users = await kv.getByPrefix("user_");
    return c.json({ users });
  } catch (error) {
    console.log(`Error fetching users: ${error}`);
    return c.json({ error: `Failed to fetch users: ${error}` }, 500);
  }
});

// Get specific user (for login validation)
app.get("/make-server-6d0c6593/users/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const user = await kv.get(`user_${username}`);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    return c.json({ user });
  } catch (error) {
    console.log(`Error fetching user: ${error}`);
    return c.json({ error: `Failed to fetch user: ${error}` }, 500);
  }
});

// Create new user
app.post("/make-server-6d0c6593/users", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password, isAdmin, role } = body;

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    // Check if user already exists
    const existingUser = await kv.get(`user_${username}`);
    if (existingUser) {
      return c.json({ error: "Username already exists" }, 409);
    }

    const user = {
      username,
      password: password || "eic78",
      isAdmin: isAdmin || false,
      role: role || "standard", // "guest", "standard", or "admin"
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user_${username}`, user);
    return c.json({ success: true, user });
  } catch (error) {
    console.log(`Error creating user: ${error}`);
    return c.json({ error: `Failed to create user: ${error}` }, 500);
  }
});

// Reset user password to default
app.put("/make-server-6d0c6593/users/:username/reset-password", async (c) => {
  try {
    const username = c.req.param("username");
    const user = await kv.get(`user_${username}`);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    await kv.set(`user_${username}`, {
      ...user,
      password: "eic78",
      updatedAt: new Date().toISOString(),
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error resetting password: ${error}`);
    return c.json({ error: `Failed to reset password: ${error}` }, 500);
  }
});

// Update user role/permission
app.put("/make-server-6d0c6593/users/:username/role", async (c) => {
  try {
    const username = c.req.param("username");
    const body = await c.req.json();
    const { role } = body;

    if (!role || !["guest", "standard", "admin"].includes(role)) {
      return c.json({ error: "Valid role is required (guest, standard, or admin)" }, 400);
    }

    const user = await kv.get(`user_${username}`);
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    await kv.set(`user_${username}`, {
      ...user,
      role: role,
      isAdmin: role === "admin",
      updatedAt: new Date().toISOString(),
    });
    
    return c.json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    console.log(`Error updating user role: ${error}`);
    return c.json({ error: `Failed to update user role: ${error}` }, 500);
  }
});

// Delete user
app.delete("/make-server-6d0c6593/users/:username", async (c) => {
  try {
    const username = c.req.param("username");
    
    if (username === "ABDU0537") {
      return c.json({ error: "Cannot delete the main administrator account" }, 403);
    }
    
    await kv.del(`user_${username}`);
    return c.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.log(`Error deleting user: ${error}`);
    return c.json({ error: `Failed to delete user: ${error}` }, 500);
  }
});

// ==================== ACTIVITY LOG ROUTES ====================

// Get all activity logs (admin only)
app.get("/make-server-6d0c6593/activity-logs", async (c) => {
  try {
    const logs = await kv.getByPrefix("activity_");
    // Sort by timestamp, newest first
    const sortedLogs = logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return c.json({ logs: sortedLogs });
  } catch (error) {
    console.log(`Error fetching activity logs: ${error}`);
    return c.json({ error: `Failed to fetch activity logs: ${error}` }, 500);
  }
});

// Get activity logs by username
app.get("/make-server-6d0c6593/activity-logs/user/:username", async (c) => {
  try {
    const username = c.req.param("username");
    const allLogs = await kv.getByPrefix("activity_");
    const userLogs = allLogs.filter(log => log.username === username);
    // Sort by timestamp, newest first
    const sortedLogs = userLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return c.json({ logs: sortedLogs });
  } catch (error) {
    console.log(`Error fetching user activity logs: ${error}`);
    return c.json({ error: `Failed to fetch user activity logs: ${error}` }, 500);
  }
});

// Get activity logs by asset tag
app.get("/make-server-6d0c6593/activity-logs/asset/:assetTag", async (c) => {
  try {
    const assetTag = c.req.param("assetTag");
    const allLogs = await kv.getByPrefix("activity_");
    const assetLogs = allLogs.filter(log => log.assetTag === assetTag);
    // Sort by timestamp, newest first
    const sortedLogs = assetLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return c.json({ logs: sortedLogs });
  } catch (error) {
    console.log(`Error fetching asset activity logs: ${error}`);
    return c.json({ error: `Failed to fetch asset activity logs: ${error}` }, 500);
  }
});

// Log activity endpoint (for manual logging from frontend)
app.post("/make-server-6d0c6593/activity-logs", async (c) => {
  try {
    const body = await c.req.json();
    const logEntry = await logActivity(body);
    return c.json({ success: true, log: logEntry });
  } catch (error) {
    console.log(`Error logging activity: ${error}`);
    return c.json({ error: `Failed to log activity: ${error}` }, 500);
  }
});

// ==================== REPORT ROUTES ====================
// A Report is an inspection record belonging to a single Asset (one-to-many).
// Report key format: report_${assetTag}_${timestamp}_${random}

// Get all reports (across all assets)
app.get("/make-server-6d0c6593/reports", async (c) => {
  try {
    const reports = await kv.getByPrefix("report_");
    return c.json({ reports });
  } catch (error) {
    console.log(`Error fetching reports: ${error}`);
    return c.json({ error: `Failed to fetch reports: ${error}` }, 500);
  }
});

// Get all reports for a specific asset (newest first)
app.get("/make-server-6d0c6593/reports/asset/:assetTag", async (c) => {
  try {
    const assetTag = c.req.param("assetTag");
    const reports = await kv.getByPrefix(`report_${assetTag}_`);
    const sorted = reports.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return c.json({ reports: sorted });
  } catch (error) {
    console.log(`Error fetching asset reports: ${error}`);
    return c.json({ error: `Failed to fetch asset reports: ${error}` }, 500);
  }
});

// Create a new report for an asset
app.post("/make-server-6d0c6593/reports", async (c) => {
  try {
    const body = await c.req.json();
    const { assetTag, highLevelInfo, pictures, asFound, asLeft, createdBy } = body;

    if (!assetTag) {
      return c.json({ error: "assetTag is required" }, 400);
    }

    const asset = await kv.get(`asset_${assetTag}`);
    if (!asset) {
      return c.json({ error: `Asset "${assetTag}" not found` }, 404);
    }

    const timestamp = new Date().toISOString();
    const reportId = `report_${assetTag}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;

    const report = {
      reportId,
      assetTag,
      highLevelInfo: highLevelInfo || "",
      pictures: pictures || [],
      asFound: asFound || [],
      asLeft: asLeft || [],
      createdBy: createdBy || "Unknown",
      createdAt: timestamp,
    };

    await kv.set(reportId, report);

    await logActivity({
      username: createdBy || "Unknown",
      action: "CREATE_REPORT",
      assetTag,
      details: `Created new inspection report for asset ${assetTag}`,
      metadata: {
        reportId,
        highLevelInfo: highLevelInfo || "",
        pictureCount: pictures?.length || 0,
        asFoundCount: asFound?.length || 0,
        asLeftCount: asLeft?.length || 0,
      },
    });

    return c.json({ success: true, report });
  } catch (error) {
    console.log(`Error creating report: ${error}`);
    return c.json({ error: `Failed to create report: ${error}` }, 500);
  }
});

// Delete a report
app.delete("/make-server-6d0c6593/reports/:reportId", async (c) => {
  try {
    const reportId = c.req.param("reportId");
    const deletedBy = c.req.query("deletedBy") || "Unknown";

    const report = await kv.get(reportId);
    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // Delete report photos from storage
    await deleteImagesFromStorage(report.pictures || []);
    await deleteImagesFromStorage(report.asFound || []);
    await deleteImagesFromStorage(report.asLeft || []);

    await kv.del(reportId);

    await logActivity({
      username: deletedBy,
      action: "DELETE_REPORT",
      assetTag: report.assetTag,
      details: `Deleted an inspection report for asset ${report.assetTag}`,
      metadata: { reportId, createdBy: report.createdBy },
    });

    return c.json({ success: true, message: "Report deleted" });
  } catch (error) {
    console.log(`Error deleting report: ${error}`);
    return c.json({ error: `Failed to delete report: ${error}` }, 500);
  }
});

// One-time idempotent migration: move embedded report data from assets into
// the first Report record for each asset. Safe to call repeatedly.
app.post("/make-server-6d0c6593/migrate-reports", async (c) => {
  try {
    const assets = await kv.getByPrefix("asset_");
    let migratedCount = 0;

    for (const asset of assets) {
      // Skip assets already migrated
      if (asset.reportsMigrated) continue;

      const existingReports = await kv.getByPrefix(`report_${asset.assetTag}_`);

      const hasEmbeddedData =
        (asset.highLevelInfo && asset.highLevelInfo.trim() !== "") ||
        (asset.pictures && asset.pictures.length > 0) ||
        (asset.asFound && asset.asFound.length > 0) ||
        (asset.asLeft && asset.asLeft.length > 0);

      if (existingReports.length === 0 && hasEmbeddedData) {
        const createdAt = asset.createdAt || new Date().toISOString();
        const reportId = `report_${asset.assetTag}_${new Date(
          createdAt
        ).getTime()}_migrated`;

        const report = {
          reportId,
          assetTag: asset.assetTag,
          highLevelInfo: asset.highLevelInfo || "",
          pictures: asset.pictures || [],
          asFound: asset.asFound || [],
          asLeft: asset.asLeft || [],
          createdBy: asset.createdBy || "Unknown",
          createdAt,
        };

        await kv.set(reportId, report);
        migratedCount++;
      }

      // Mark asset as migrated so this runs only once per asset.
      await kv.set(`asset_${asset.assetTag}`, {
        ...asset,
        reportsMigrated: true,
      });
    }

    return c.json({
      success: true,
      migratedCount,
      message: `Migration complete. Created ${migratedCount} report(s).`,
    });
  } catch (error) {
    console.log(`Error migrating reports: ${error}`);
    return c.json({ error: `Failed to migrate reports: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);