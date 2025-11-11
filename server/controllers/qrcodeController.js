import QRCode from 'qrcode';
import QRModel from '../models/qrModel.js';
import PrintTokenModel from '../models/printTokenModel.js';
import { uploadQRCodeBuffer } from '../utils/cloudinary.js';

// Generate QR code with one-time print token
export const generateQRCode = async (fileId, frontendUrl, validityMinutes = 60) => {
    try {
        // Create a one-time print token (valid for specified minutes, default 60)
        const printToken = await PrintTokenModel.createPrintToken(fileId, validityMinutes);
        
        // Build the print URL with token instead of fileId
        const printUrl = `${frontendUrl}/print/${printToken.token}`;
        
        // Generate QR code as buffer with the token-based URL
        const buffer = await QRCode.toBuffer(printUrl, {
            errorCorrectionLevel: 'H',
            type: 'png',
            quality: 0.92,
            margin: 1,
            width: 400
        });
        
        // Upload QR code buffer to Cloudinary
        const cloudinaryResponse = await uploadQRCodeBuffer(buffer);

        // Save QR code metadata to database
        const newQRCode = new QRModel({
            fileId,   // Reference to the file document
            qrCode: cloudinaryResponse.url,   // QR image URL for display
            fileUrl: printUrl    // The token-based print URL (not the file URL!)
        });

        await newQRCode.save();
        
        console.log(`✅ QR Code generated with token: ${printToken.token.substring(0, 8)}...`);
        console.log(`   Expires at: ${printToken.expiresAt.toISOString()}`);
        
        return {
            qrCodeUrl: cloudinaryResponse.url,
            printToken: printToken.token,
            expiresAt: printToken.expiresAt
        };
    } catch (error) {
        console.error('❌ Error generating QR code:', error);
        throw error;
    }
};
