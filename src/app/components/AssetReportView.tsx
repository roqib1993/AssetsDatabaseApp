import { X, FileText, Printer } from "lucide-react";
import companyLogo from "figma:asset/bbe538ebbc683fd4468cd8b0dad80b71648785ad.png";
import { SecureImage } from "./SecureImage";

interface ImageWithComment {
  url: string;
  comment: string;
}

interface Asset {
  assetTag: string;
  description: string;
  location: string;
  highLevelInfo: string;
  pictures: ImageWithComment[];
  asFound: ImageWithComment[];
  asLeft: ImageWithComment[];
  createdBy: string;
  lastUpdatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Report {
  reportId: string;
  assetTag: string;
  highLevelInfo: string;
  pictures: ImageWithComment[];
  asFound: ImageWithComment[];
  asLeft: ImageWithComment[];
  createdBy: string;
  createdAt: string;
}

interface AssetReportViewProps {
  asset: Asset;
  report?: Report;
  onClose: () => void;
}

export function AssetReportView({ asset, report, onClose }: AssetReportViewProps) {
  // When a specific report is provided, use its inspection data; otherwise
  // fall back to the asset's embedded data (backward compatibility).
  const highLevelInfo = report ? report.highLevelInfo : asset.highLevelInfo;
  const pictures = report ? report.pictures || [] : asset.pictures || [];
  const asFound = report ? report.asFound || [] : asset.asFound || [];
  const asLeft = report ? report.asLeft || [] : asset.asLeft || [];
  const reportCreatedBy = report ? report.createdBy : asset.createdBy;
  const reportCreatedAt = report ? report.createdAt : asset.createdAt;
  const reportUpdatedBy = report ? report.createdBy : asset.lastUpdatedBy;
  const reportUpdatedAt = report ? report.createdAt : asset.updatedAt;
  const handlePrint = () => {
    // Format date as DDMMYYYY
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    // Format: ASSET_TAG-DDMMYYYY_HHMM
    const assetTagFormatted = asset.assetTag.replace(/-/g, '_');
    const dateTimeFormatted = `${day}${month}${year}_${hours}${minutes}`;
    const filename = `${assetTagFormatted}-${dateTimeFormatted}`;
    
    // Set document title for PDF filename
    const originalTitle = document.title;
    document.title = filename;
    
    // Print
    window.print();
    
    // Restore original title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Screen View - Hidden when printing */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 print:hidden overflow-y-auto">
        <div className="bg-white rounded-lg max-w-5xl w-full my-4">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10 rounded-t-lg">
            <div className="flex items-center gap-2">
              <FileText className="size-6 text-blue-600" />
              <h2 className="text-xl">Asset Report</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="size-5" />
                <span>Print Report</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X className="size-6" />
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-8">
            {/* Company Logo and Report Title */}
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
              <img
                src={companyLogo}
                alt="POMI - PAITON OPERATION & MAINTENANCE INDONESIA"
                className="h-20 mx-auto mb-4"
              />
              <h1 className="text-3xl mb-2">Asset Inspection Report</h1>
              <p className="text-gray-600">Generated on {formatDate(new Date().toISOString())}</p>
            </div>

            {/* Section: Asset Details */}
            <div className="mb-8">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                <h2 className="text-2xl text-blue-900">Asset Details</h2>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Asset Tag</label>
                  <p className="text-lg font-semibold">{asset.assetTag}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Location</label>
                  <p className="text-lg">{asset.location}</p>
                </div>
              </div>

              {asset.description && (
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <p className="text-lg">{asset.description}</p>
                </div>
              )}

              {highLevelInfo && (
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-1">High Level Info</label>
                  <p className="text-lg">{highLevelInfo}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Created By</label>
                  <p className="text-base">{reportCreatedBy}</p>
                  <p className="text-sm text-gray-500">{formatDate(reportCreatedAt)}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Last Updated By</label>
                  <p className="text-base">{reportUpdatedBy}</p>
                  <p className="text-sm text-gray-500">{formatDate(reportUpdatedAt)}</p>
                </div>
              </div>

              {/* Asset Pictures */}
              {pictures && pictures.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-600 mb-3">Asset Photos ({pictures.length})</label>
                  <div className="grid grid-cols-2 gap-4">
                    {pictures.map((pic, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-3">
                        <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                          <SecureImage
                            src={pic.url}
                            alt={`Asset ${asset.assetTag} - Photo ${index + 1}`}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        {pic.comment && (
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-sm text-gray-700">{pic.comment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section: As Found */}
            <div className="mb-8">
              <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
                <h2 className="text-2xl text-green-900">As Found Condition</h2>
                <p className="text-sm text-green-700 mt-1">Condition before work commenced</p>
              </div>

              {asFound && asFound.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {asFound.map((pic, index) => (
                    <div key={index} className="border border-green-300 rounded-lg p-3 bg-green-50">
                      <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        <SecureImage
                          src={pic.url}
                          alt={`As Found ${index + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      {pic.comment && (
                        <div className="bg-white p-2 rounded border border-green-200">
                          <p className="text-sm text-gray-700">{pic.comment}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <p>No "As Found" photos available</p>
                </div>
              )}
            </div>

            {/* Section: As Left */}
            <div className="mb-8">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                <h2 className="text-2xl text-blue-900">As Left Condition</h2>
                <p className="text-sm text-blue-700 mt-1">Condition after work completed</p>
              </div>

              {asLeft && asLeft.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {asLeft.map((pic, index) => (
                    <div key={index} className="border border-blue-300 rounded-lg p-3 bg-blue-50">
                      <div className="w-full aspect-square bg-white rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        <SecureImage
                          src={pic.url}
                          alt={`As Left ${index + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      {pic.comment && (
                        <div className="bg-white p-2 rounded border border-blue-200">
                          <p className="text-sm text-gray-700">{pic.comment}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <p>No "As Left" photos available</p>
                </div>
              )}
            </div>

            {/* Report Footer */}
            <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-sm text-gray-600">
              <p>End of Report - Asset Tag: {asset.assetTag}</p>
              <p className="mt-1">Asset Database Management System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print View - Only visible when printing */}
      <div className="hidden print:block print-only-view">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: A4;
              margin: 10mm 8mm;
            }
            body * {
              visibility: hidden;
            }
            .print-only-view, .print-only-view * {
              visibility: visible;
            }
            .print-only-view {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .page-break {
              page-break-before: always;
            }
            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              border-bottom: 2px solid #000;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .header-bar img {
              height: 60px !important;
              max-height: 60px !important;
              width: auto !important;
              max-width: 150px !important;
            }
            .section-header {
              border-left: 4px solid;
              padding: 10px 12px;
              margin: 12px 0;
              font-size: 16px;
              font-weight: bold;
            }
            .section-header-blue {
              background: #eff6ff;
              border-color: #2563eb;
              color: #1e40af;
            }
            .section-header-green {
              background: #f0fdf4;
              border-color: #16a34a;
              color: #15803d;
            }
            .section-subtitle {
              font-size: 11px;
              font-weight: normal;
              margin-top: 2px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 10px;
              padding: 10px;
            }
            .info-item {
              margin-bottom: 6px;
            }
            .info-label {
              font-weight: bold;
              font-size: 11px;
              margin-bottom: 2px;
            }
            .info-value {
              font-size: 12px;
            }
            .photo-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            .photo-cell {
              border: 2px solid #16a34a;
              border-radius: 8px;
              padding: 12px;
              min-height: 200px;
              display: flex;
              flex-direction: column;
              page-break-inside: avoid;
            }
            .photo-cell-blue {
              border-color: #2563eb;
            }
            .photo-cell-green {
              border-color: #16a34a;
            }
            .photo-cell img {
              width: 100%;
              height: auto;
              max-height: 300px;
              object-fit: contain;
              border-radius: 4px;
              margin-bottom: 8px;
            }
            .photo-label {
              font-size: 10px;
              margin-top: 4px;
              text-align: left;
              word-wrap: break-word;
            }
            .report-footer {
              margin-top: 40px;
              text-align: center;
            }
            .footer-line {
              border-top: 1px solid #666;
              margin-bottom: 12px;
            }
            .footer-text {
              font-size: 11px;
              color: #333;
              margin: 4px 0;
            }
          }
        `}} />
        
        {/* PAGE 1: Asset Details */}
        <div className="page-1">
          {/* Header */}
          <div className="header-bar">
            <div style={{fontSize: '11px', fontWeight: 'bold'}}>
              <img src={companyLogo} alt="Company Logo" style={{height: '35px', width: 'auto'}} />
            </div>
            <div style={{fontSize: '18px', fontWeight: 'bold'}}>
              Asset Inspection Report
            </div>
            <div style={{fontSize: '11px'}}>
              Generated on {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}, {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
          </div>

          {/* Asset Details Section Header */}
          <div className="section-header section-header-blue">Asset Details</div>

          {/* Asset Information */}
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Asset Tag</div>
              <div className="info-value">{asset.assetTag}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Location</div>
              <div className="info-value">{asset.location}</div>
            </div>
            <div className="info-item" style={{gridColumn: '1 / -1'}}>
              <div className="info-label">Description</div>
              <div className="info-value">{asset.description || 'N/A'}</div>
            </div>
            <div className="info-item" style={{gridColumn: '1 / -1'}}>
              <div className="info-label">High Level Info</div>
              <div className="info-value">{highLevelInfo || 'N/A'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Created By</div>
              <div className="info-value">{reportCreatedBy}</div>
              <div className="info-value" style={{fontSize: '10px', color: '#666', marginTop: '2px'}}>
                {formatDate(reportCreatedAt)}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Last Updated By</div>
              <div className="info-value">{reportUpdatedBy}</div>
              <div className="info-value" style={{fontSize: '10px', color: '#666', marginTop: '2px'}}>
                {formatDate(reportUpdatedAt)}
              </div>
            </div>
          </div>

          {/* Asset Photos Section Header */}
          <div className="section-header section-header-blue">Asset Photos</div>

          {/* Asset Photos Grid */}
          <div className="photo-grid">
            {pictures && pictures.map((pic, index) => (
              <div key={index} className="photo-cell photo-cell-blue">
                <img src={pic.url} alt={`Picture ${index + 1}`} />
                {pic.comment && <div className="photo-label">{pic.comment}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* PAGE 2: As Found Photos */}
        <div className="page-break">
          {/* As Found Photos Section Header */}
          <div className="section-header section-header-green">
            As Found Condition
            <div className="section-subtitle">Condition before work commenced</div>
          </div>

          {/* As Found Photos Grid */}
          <div className="photo-grid">
            {asFound && asFound.map((pic, index) => (
              <div key={index} className="photo-cell photo-cell-green">
                <img src={pic.url} alt={`As Found ${index + 1}`} />
                {pic.comment && <div className="photo-label">{pic.comment}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* PAGE 3: As Left Photos */}
        <div className="page-break">
          {/* As Left Photos Section Header */}
          <div className="section-header section-header-blue">
            As Left Condition
            <div className="section-subtitle">Condition after work completed</div>
          </div>

          {/* As Left Photos Grid */}
          <div className="photo-grid">
            {asLeft && asLeft.map((pic, index) => (
              <div key={index} className="photo-cell photo-cell-blue">
                <img src={pic.url} alt={`As Left ${index + 1}`} />
                {pic.comment && <div className="photo-label">{pic.comment}</div>}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="report-footer">
            <div className="footer-line"></div>
            <div className="footer-text">End of Report - Asset Tag: {asset.assetTag}</div>
            <div className="footer-text">Asset Database Management System</div>
          </div>
        </div>
      </div>
    </>
  );
}