const CLOUDFLARE_WORKER_URL = "https://image-uploader-worker.roqib1993.workers.dev";

export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    await fetch(`${CLOUDFLARE_WORKER_URL}/delete`, {
      method: "DELETE",
      headers: {
        "X-App-Auth": "53cu123",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: imageUrl }),
    });
  } catch (error) {
    console.error("Failed to delete image from storage:", error);
  }
}

export async function deleteImagesFromStorage(imageUrls: string[]): Promise<void> {
  await Promise.allSettled(imageUrls.map((url) => deleteImageFromStorage(url)));
}
