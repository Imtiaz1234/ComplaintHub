import cloudinary from "../config/cloudinary.js";

/**
 * Upload a base64 data-URL or a public URL to Cloudinary.
 * Returns the secure URL string, or "" if input is empty / Cloudinary is not configured.
 */
export const uploadImage = async (dataUri, folder = "complainthub") => {
  if (!dataUri || typeof dataUri !== "string" || dataUri.trim().length === 0) {
    return "";
  }

  // If it's already a Cloudinary / http URL, skip re-upload
  if (dataUri.startsWith("http://") || dataUri.startsWith("https://")) {
    return dataUri;
  }

  // If Cloudinary credentials are not set, fall back to storing base64 as-is
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return dataUri;
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
    transformation: [{ width: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }]
  });

  return result.secure_url;
};
