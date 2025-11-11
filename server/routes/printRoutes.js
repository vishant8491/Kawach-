import { Router } from 'express';
import FileModel from '../models/fileModel.js';
import PrintTokenModel from '../models/printTokenModel.js';
import axios from 'axios';

const router = Router();

// ✅ REMOVED isAuthenticated - This endpoint is PUBLIC (secured by one-time token only)
// This allows print shops to scan QR codes without login
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;
        console.log(`🔍 Print request received for token: ${token.substring(0, 8)}...`);
        
        // Find and validate the print token
        const printToken = await PrintTokenModel.findOne({ token }).populate('fileId');
        
        if (!printToken) {
            console.log('❌ Token not found');
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired print link'
            });
        }

        // Check if token is expired
        if (printToken.expiresAt < new Date()) {
            console.log('⏰ Token expired');
            return res.status(410).json({
                success: false,
                message: 'This print link has expired'
            });
        }

        // Allow viewing even if used (for testing), but track usage
        if (!printToken.used) {
            printToken.used = true;
            printToken.usedAt = new Date();
            printToken.ipAddress = req.ip || req.connection.remoteAddress;
            printToken.userAgent = req.headers['user-agent'];
            await printToken.save();
        }

        // Get file details
        const file = printToken.fileId;
        if (!file) {
            console.log('❌ File not found in database');
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        console.log(`✅ File validated: ${file.filename}`);
        console.log(`   MIME type: ${file.mimetype}`);
        console.log(`   Cloudinary URL: ${file.path}`);

        // Send file data to frontend
        res.status(200).json({
            success: true,
            file: {
                url: file.path,  // Cloudinary URL
                filename: file.filename,
                mimetype: file.mimetype,
                token: token  // Send token back for cleanup API
            }
        });

        console.log('✅ Response delivered successfully');

    } catch (error) {
        console.error('❌ Print route error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing print request'
        });
    }
});

// Endpoint to stream file (proxy to avoid CORS issues)
router.get('/file/:token', async (req, res) => {
    try {
        const { token } = req.params;
        console.log(`📥 File stream request for token: ${token.substring(0, 8)}...`);
        
        // Find the print token
        const printToken = await PrintTokenModel.findOne({ token }).populate('fileId');
        
        if (!printToken || !printToken.fileId) {
            return res.status(404).json({
                success: false,
                message: 'Invalid or expired print link'
            });
        }

        const file = printToken.fileId;
        console.log(`📄 Streaming file: ${file.filename}`);

        // Fetch file from Cloudinary and stream to client
        const response = await axios.get(file.path, {
            responseType: 'stream'
        });

        // Set appropriate headers
        res.setHeader('Content-Type', file.mimetype);
        res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Stream the file
        response.data.pipe(res);

        console.log('✅ File streaming started');
    } catch (error) {
        console.error('❌ File stream error:', error);
        res.status(500).json({
            success: false,
            message: 'Error streaming file'
        });
    }
});

// Endpoint to invalidate token after print (called from frontend)
router.post('/cleanup/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const printToken = await PrintTokenModel.findOne({ token });
        if (printToken) {
            printToken.used = true;
            printToken.responseDelivered = true;
            await printToken.save();
            console.log(`🧹 Token cleanup completed: ${token.substring(0, 8)}...`);
        }
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ success: false });
    }
});

export default router;
