import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPrint, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

const Print = () => {
  const navigate = useNavigate();
  const { fileId: token } = useParams();  // This is the TOKEN (keeping param name for compatibility)
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isPDF, setIsPDF] = useState(false);
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('No document selected');
      navigate('/');
      return;
    }

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      // Block Ctrl+S (save), Ctrl+P (print manually), F12, DevTools shortcuts
      if ((e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
          (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'c' || e.key === 'v')) ||
          e.key === 'F12') {
        e.preventDefault();
        toast.error('This action is not allowed');
        return false;
      }
    };

    const fetchFile = async () => {
      try {
        // ✅ NO AUTHENTICATION - just pass the token in URL
        // Token validation happens on server side
        console.log('🔄 Fetching document with token....');
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/v1/print/${token}`);

        if (response.data.success) {
          const file = response.data.file;
          setFileData(file);
          console.log('✅ File metadata loaded:', file.filename);
          console.log('   MIME Type:', file.mimetype);
          
          // Check if PDF
          const isPDFFile = file.mimetype === 'application/pdf';
          setIsPDF(isPDFFile);

          // Fetch file through our server proxy (avoids CORS issues)
          console.log('📥 Downloading file content through server proxy...');
          const fileUrl = `${import.meta.env.VITE_BASE_URL}/api/v1/print/file/${token}`;
          
          const fileResponse = await axios.get(fileUrl, {
            responseType: 'blob'
          });

          // Create blob URL for secure rendering
          const blob = new Blob([fileResponse.data], { type: file.mimetype });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          console.log('✅ Document ready for display');
          
          // Auto-trigger print after a short delay (for QR scan scenario)
          setTimeout(() => {
            if (!autoPrintTriggered) {
              setAutoPrintTriggered(true);
              console.log('🖨️ Auto-triggering print dialog...');
              triggerAutoPrint(url, file.mimetype, file.filename);
            }
          }, 1500); // 1.5 second delay to ensure everything is loaded
          
        } else {
          toast.error(response.data.message || 'Failed to load document');
          navigate('/');
        }
      } catch (error) {
        console.error('❌ Error fetching file:', error);
        
        // Show specific error messages
        if (error.response?.status === 404) {
          toast.error('Invalid print link');
        } else if (error.response?.status === 410) {
          toast.error('This print link has expired');
        } else if (error.response?.status === 403) {
          toast.error('This print link has already been used');
        } else {
          toast.error('Error loading document');
        }
        
        // Redirect to home (not dashboard, since user might not be logged in)
        setTimeout(() => navigate('/'), 2000);
      } finally {
        setLoading(false);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('dragstart', e => e.preventDefault());

    fetchFile();

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', e => e.preventDefault());
      document.removeEventListener('dragstart', e => e.preventDefault());
      
      // Cleanup blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [token, navigate]);

  // Auto-print function for QR scan (works on all devices)
  const triggerAutoPrint = (url, mimetype, filename) => {
    try {
      const isPDFFile = mimetype === 'application/pdf';
      
      // Mobile/Tablet detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile devices, open print-optimized page
        toast.success('Document loaded! Tap Print button below', { duration: 3000 });
        return; // Don't auto-print on mobile, let user tap the button
      }
      
      // Desktop auto-print
      if (isPDFFile && iframeRef.current) {
        // PDF - use iframe
        setTimeout(() => {
          iframeRef.current.contentWindow.print();
        }, 500);
      } else {
        // Images - use print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
          toast.error('Please allow popups for auto-print');
          return;
        }

        const currentDate = new Date().toLocaleString();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Print - ${filename}</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { 
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
              }
              body { 
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: #000;
              }
              img { 
                max-width: 100%;
                height: auto;
                display: block;
              }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 48px;
                color: rgba(128, 128, 128, 0.15);
                white-space: nowrap;
                pointer-events: none;
                z-index: 1000;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="watermark">KAWACH • ${currentDate}</div>
            <img src="${url}" alt="Document" onload="setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 500);" />
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Auto-print error:', error);
      toast.error('Auto-print failed. Use Print button below.');
    }
  };

  const handlePrint = async () => {
    if (!blobUrl) {
      toast.error('Document not loaded yet');
      return;
    }

    try {
      console.log('🖨️ Starting print process...');
      
      // For PDF files, use iframe print
      if (isPDF) {
        if (iframeRef.current) {
          iframeRef.current.contentWindow.print();
        }
      } else {
        // For images, open in new window with print dialog
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.error('Please allow popups to print');
          return;
        }

        const currentDate = new Date().toLocaleString();

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Print Document</title>
            <style>
              body { 
                margin: 0; 
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              .container {
                position: relative;
                text-align: center;
              }
              img { 
                max-width: 100%; 
                height: auto;
                display: block;
              }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 48px;
                color: rgba(128, 128, 128, 0.15);
                white-space: nowrap;
                pointer-events: none;
                z-index: 1000;
                font-weight: bold;
              }
              @media print {
                body { margin: 0; }
                .watermark {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <div class="watermark">KAWACH • ${currentDate}</div>
            <div class="container">
              <img src="${blobUrl}" alt="Document" onload="setTimeout(() => window.print(), 500);" />
            </div>
            <script>
              window.addEventListener('afterprint', () => {
                setTimeout(() => window.close(), 500);
              });
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }

      // Cleanup token after print
      try {
        await axios.post(`${import.meta.env.VITE_BASE_URL}/api/v1/print/cleanup/${token}`);
        console.log('✅ Print token cleaned up');
      } catch (err) {
        console.error('Cleanup error:', err);
      }

    } catch (error) {
      console.error('❌ Print error:', error);
      toast.error('Error printing document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#0a0118] to-[#0c0118] text-white p-6">
      <div 
        ref={containerRef}
        className="max-w-6xl mx-auto mt-10 p-8 bg-[#1a1127] rounded-xl shadow-xl"
      >
        <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          🔒 Secure Print Document
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side: Document Preview */}
          <div className="bg-[#251934] p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaFileAlt className="text-purple-400" />
              Document Preview
            </h2>
            
            {blobUrl ? (
              <div className="bg-[#2a2235] p-2 rounded-md relative">
                {isPDF ? (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                      className="w-full h-[500px] border-0 rounded"
                      title="Document Preview"
                      style={{ 
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}
                      sandbox="allow-same-origin"
                    />
                    {/* Overlay to block all PDF interactions including toolbar */}
                    <div 
                      className="absolute inset-0 z-20"
                      onContextMenu={(e) => e.preventDefault()}
                      style={{ 
                        cursor: 'default',
                        background: 'transparent'
                      }}
                    />
                  </>
                ) : (
                  <>
                    <img
                      src={blobUrl}
                      alt="Document"
                      className="w-full h-auto max-h-[500px] object-contain rounded"
                      style={{ 
                        userSelect: 'none', 
                        pointerEvents: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none'
                      }}
                      draggable="false"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                    {/* Overlay to prevent interactions */}
                    <div 
                      className="absolute inset-0 z-20"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      style={{ cursor: 'default', background: 'transparent' }}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="bg-[#2a2235] p-8 rounded-md flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading document...</p>
                </div>
              </div>
            )}
          </div>

          {/* Right side: Document Details & Actions */}
          <div className="space-y-6">
            <div className="bg-[#251934] p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Document Details</h2>
              <div className="space-y-3">
                <div className="bg-[#2a2235] p-4 rounded-md">
                  <p className="text-xs text-gray-500 mb-1">Filename</p>
                  <p className="text-gray-300 break-all font-mono text-sm">
                    {fileData?.filename || 'Loading...'}
                  </p>
                </div>
                <div className="bg-[#2a2235] p-4 rounded-md">
                  <p className="text-xs text-gray-500 mb-1">File Type</p>
                  <p className="text-gray-300 font-mono text-sm">
                    {fileData?.mimetype || 'Loading...'}
                  </p>
                </div>
                <div className="bg-[#2a2235] p-4 rounded-md">
                  <p className="text-xs text-gray-500 mb-1">Security Status</p>
                  <p className="text-green-400 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    One-Time Access Link
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePrint}
              disabled={!blobUrl}
              className={`w-full py-4 px-6 rounded-lg transition-all duration-300
                       flex items-center justify-center space-x-2 font-semibold
                       ${blobUrl 
                         ? 'bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-500 hover:to-purple-600' 
                         : 'bg-gray-600 cursor-not-allowed'}`}
            >
              <FaPrint className="text-xl" />
              <span>{blobUrl ? 'Print Document' : 'Loading...'}</span>
            </button>

            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
              <p className="text-sm text-yellow-200 text-center">
                ⚠️ <strong>One-Time Access:</strong> This link will expire after printing or after 60 minutes.
              </p>
            </div>

            {autoPrintTriggered && (
              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                <p className="text-sm text-green-200 text-center">
                  ✅ <strong>Auto-Print Triggered:</strong> Print dialog should open automatically on desktop.
                </p>
              </div>
            )}

            <div className="bg-[#251934] p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-purple-300">🔐 Security Features</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>✓ Single-use print token</li>
                <li>✓ No direct file download</li>
                <li>✓ Automatic watermarking</li>
                <li>✓ Copy/save protection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Print;