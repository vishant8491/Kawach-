import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET                   
});

// Generate a unique public ID
const generatePublicId = (prefix) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${randomString}`;
};



// Upload QR Code buffer to cloudinary directly
export const uploadQRCodeBuffer = async (buffer) => {
    try {
        if (!buffer) throw new Error('Buffer is required');
        
        // Generate a unique public ID for the QR code
        const publicId = generatePublicId('qr');
        
        // Convert buffer to base64
        const base64String = buffer.toString('base64');
        const dataURI = `data:image/png;base64,${base64String}`;
        
        // Upload QR code to cloudinary
        const response = await cloudinary.uploader.upload(dataURI, {
            folder: "qrcodes",
            public_id: publicId
        });
        console.log("QR Code uploaded successfully", response.url);
        return response;
    } catch (err) {
        console.error("QR Code upload to Cloudinary failed:", err);
        throw err;
    }
};

// Generate a short-lived signed URL (optional security enhancement)
export const generateSignedUrl = (publicId, expiresInSeconds = 3600) => {
    try {
        const timestamp = Math.round(Date.now() / 1000) + expiresInSeconds;
        
        // Determine resource type based on file extension or public_id pattern
        let resourceType = 'image';
        if (publicId.includes('uploads/')) {
            // Check common document formats
            if (publicId.match(/\.(pdf|doc|docx)$/i)) {
                resourceType = 'raw';
            }
        }
        
        const signedUrl = cloudinary.url(publicId, {
            sign_url: true,
            type: 'authenticated',
            resource_type: resourceType,
            expires_at: timestamp
        });
        
        console.log(`📝 Generated signed URL (expires in ${expiresInSeconds}s)`);
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        throw error;
    }
};

// Delete file from Cloudinary
export const deleteFileFromCloudinary = async (publicId) => {
    try {
        if (!publicId) throw new Error('Public ID is required');
        
        // Try deleting as image first (most common case)
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            if (result.result === 'ok') {
                console.log('File deleted successfully from Cloudinary');
                return { success: true, message: 'File deleted successfully' };
            }
        } catch (error) {
            console.log('Failed to delete as image, trying as raw file:', error.message);
        }

        // If image deletion failed, try as raw
        try {
            console.log('Attempting to delete as raw:', publicId);
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: "raw"
            });
            if (result.result === 'ok') {
                console.log('File deleted successfully from Cloudinary');
                return { success: true, message: 'File deleted successfully' };
            }
        } catch (error) {
            console.log('Failed to delete as raw file:', error.message);
        }
        // If both try failed
        throw new Error(`Could not delete file with public ID: ${publicId}`);
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        return { success: false, message: error.message };
    }
};