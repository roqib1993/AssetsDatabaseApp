import { jsPDF } from "jspdf";
import JSZip from "jszip";
import companyLogo from "figma:asset/bbe538ebbc683fd4468cd8b0dad80b71648785ad.png";

interface ImageWithComment {
  url: string;
  comment: string;
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

interface Asset {
  assetTag: string;
  description: string;
  location: string;
  createdBy: string;
  createdAt: string;
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

type RGB = [number, number, number];

const BLUE: RGB = [37, 99, 235];
const BLUE_BG: RGB = [239, 246, 255];
const BLUE_TEXT: RGB = [30, 64, 175];
const GREEN: RGB = [22, 163, 74];
const GREEN_BG: RGB = [240, 253, 244];
const GREEN_TEXT: RGB = [21, 128, 61];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Fetch a remote (signed URL) image and convert it to a data URL, also
// returning its natural dimensions so we can scale it into the PDF.
const loadImage = async (url: string): Promise<LoadedImage | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const dims: { width: number; height: number } = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });

    return { dataUrl, ...dims };
  } catch (error) {
    console.error(`Failed to load image for PDF export: ${url}`, error);
    return null;
  }
};

// Build a single-asset PDF containing all of its reports, each laid out to
// match the individual report print preview (AssetReportView).
const buildAssetPdf = async (
  asset: Asset,
  reports: Report[],
  logo: LoadedImage | null
): Promise<Blob> => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const gap = 12;
  let y = margin;

  const now = new Date();
  const genDate = `${now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}, ${now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const headerBar = () => {
    const barH = 40;
    if (logo) {
      const lh = 30;
      const lw = Math.min((logo.width / logo.height) * lh, 130);
      try {
        doc.addImage(logo.dataUrl, "PNG", margin, y, lw, lh, undefined, "FAST");
      } catch {
        /* ignore logo failure */
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Asset Inspection Report", pageWidth / 2, y + 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated on ${genDate}`, pageWidth - margin, y + 20, { align: "right" });
    y += barH;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.2);
    y += 18;
  };

  const sectionHeader = (title: string, subtitle: string | null, accent: RGB, bg: RGB) => {
    const hh = subtitle ? 38 : 26;
    ensureSpace(hh + 14);
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, contentWidth, hh, "F");
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(margin, y, 4, hh, "F");
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, margin + 14, subtitle ? y + 17 : y + 17);
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(subtitle, margin + 14, y + 30);
    }
    doc.setTextColor(0, 0, 0);
    y += hh + 14;
  };

  const infoFull = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value || "N/A", contentWidth);
    ensureSpace(13 + lines.length * 12 + 8);
    doc.text(lines, margin, y + 13);
    y += 13 + lines.length * 12 + 8;
  };

  const infoTwoCol = (l1: string, v1: string, l2: string, v2: string) => {
    const colW = contentWidth / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(l1, margin, y);
    doc.text(l2, margin + colW, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const ln1 = doc.splitTextToSize(v1 || "N/A", colW - 12);
    const ln2 = doc.splitTextToSize(v2 || "N/A", colW - 12);
    doc.text(ln1, margin, y + 13);
    doc.text(ln2, margin + colW, y + 13);
    y += 13 + Math.max(ln1.length, ln2.length) * 12 + 8;
  };

  const personTwoCol = (
    l1: string,
    name1: string,
    date1: string,
    l2: string,
    name2: string,
    date2: string
  ) => {
    const colW = contentWidth / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(l1, margin, y);
    doc.text(l2, margin + colW, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(name1 || "N/A", margin, y + 13);
    doc.text(name2 || "N/A", margin + colW, y + 13);
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(date1, margin, y + 25);
    doc.text(date2, margin + colW, y + 25);
    doc.setTextColor(0, 0, 0);
    y += 34;
  };

  const emptyBox = (text: string) => {
    ensureSpace(50);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 40, "F");
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(10);
    doc.text(text, pageWidth / 2, y + 24, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 54;
  };

  const drawPhotoGrid = async (photos: ImageWithComment[], accent: RGB) => {
    const colW = (contentWidth - gap) / 2;
    const pad = 10;
    const imgAreaW = colW - pad * 2;

    for (let i = 0; i < photos.length; i += 2) {
      const pair = photos.slice(i, i + 2);
      const loaded = await Promise.all(pair.map((p) => loadImage(p.url)));

      const cells = pair.map((p, idx) => {
        const L = loaded[idx];
        let imgW = imgAreaW;
        let imgH = 0;
        if (L) {
          imgH = (L.height / L.width) * imgW;
          const maxH = 200;
          if (imgH > maxH) {
            imgH = maxH;
            imgW = (L.width / L.height) * imgH;
          }
        }
        const commentLines = p.comment ? doc.splitTextToSize(p.comment, imgAreaW) : [];
        const commentH = commentLines.length ? commentLines.length * 11 + 6 : 0;
        const h = pad + (L ? imgH : 20) + commentH + pad;
        return { L, imgW, imgH, commentLines, h };
      });

      const rowH = Math.max(...cells.map((c) => c.h), 60);
      ensureSpace(rowH + gap);

      pair.forEach((_p, idx) => {
        const x = margin + idx * (colW + gap);
        const c = cells[idx];
        doc.setDrawColor(accent[0], accent[1], accent[2]);
        doc.setLineWidth(1.5);
        doc.rect(x, y, colW, rowH);
        doc.setLineWidth(0.2);

        let cy = y + pad;
        if (c.L) {
          const imgX = x + (colW - c.imgW) / 2;
          try {
            doc.addImage(c.L.dataUrl, "JPEG", imgX, cy, c.imgW, c.imgH, undefined, "FAST");
          } catch {
            /* ignore individual image failure */
          }
          cy += c.imgH + 6;
        }
        if (c.commentLines.length) {
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(c.commentLines, x + pad, cy + 4);
          doc.setTextColor(0, 0, 0);
        }
      });

      y += rowH + gap;
    }
  };

  const footer = () => {
    y += 16;
    ensureSpace(40);
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.2);
    y += 16;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`End of Report - Asset Tag: ${asset.assetTag}`, pageWidth / 2, y, {
      align: "center",
    });
    y += 12;
    doc.text("Asset Database Management System", pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
  };

  const sorted = [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  for (let r = 0; r < sorted.length; r++) {
    const report = sorted[r];
    if (r > 0) {
      doc.addPage();
      y = margin;
    }

    // ---- Header bar ----
    headerBar();

    // ---- Asset Details ----
    sectionHeader("Asset Details", null, BLUE, BLUE_BG);
    infoTwoCol("Asset Tag", asset.assetTag, "Location", asset.location);
    infoFull("Description", asset.description);
    infoFull("High Level Info", report.highLevelInfo);
    personTwoCol(
      "Created By",
      report.createdBy,
      formatDate(report.createdAt),
      "Last Updated By",
      report.createdBy,
      formatDate(report.createdAt)
    );

    // ---- Asset Photos ----
    sectionHeader("Asset Photos", null, BLUE, BLUE_BG);
    if (report.pictures && report.pictures.length > 0) {
      await drawPhotoGrid(report.pictures, BLUE);
    } else {
      emptyBox('No asset photos available');
    }

    // ---- As Found ----
    doc.addPage();
    y = margin;
    sectionHeader("As Found Condition", "Condition before work commenced", GREEN, GREEN_BG);
    if (report.asFound && report.asFound.length > 0) {
      await drawPhotoGrid(report.asFound, GREEN);
    } else {
      emptyBox('No "As Found" photos available');
    }

    // ---- As Left ----
    doc.addPage();
    y = margin;
    sectionHeader("As Left Condition", "Condition after work completed", BLUE, BLUE_BG);
    if (report.asLeft && report.asLeft.length > 0) {
      await drawPhotoGrid(report.asLeft, BLUE);
    } else {
      emptyBox('No "As Left" photos available');
    }

    footer();
  }

  return doc.output("blob");
};

export interface ExportProgress {
  current: number;
  total: number;
}

// Export every asset that has at least one report as its own PDF, bundled in a
// single ZIP file. Calls onProgress after each asset PDF is generated.
export const exportAllReportsToZip = async (
  assets: Asset[],
  reportsByAsset: Record<string, Report[]>,
  onProgress?: (progress: ExportProgress) => void
): Promise<void> => {
  const assetsWithReports = assets.filter(
    (a) => (reportsByAsset[a.assetTag] || []).length > 0
  );

  if (assetsWithReports.length === 0) {
    throw new Error("There are no reports to export.");
  }

  // Load the company logo once and reuse across all PDFs.
  const logo = await loadImage(companyLogo);

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (let i = 0; i < assetsWithReports.length; i++) {
    const asset = assetsWithReports[i];
    const reports = reportsByAsset[asset.assetTag] || [];
    const pdfBlob = await buildAssetPdf(asset, reports, logo);

    // Safe unique filename per asset.
    const base = asset.assetTag.replace(/[^a-zA-Z0-9_-]/g, "_");
    let name = `${base}.pdf`;
    let counter = 2;
    while (usedNames.has(name)) {
      name = `${base}_${counter}.pdf`;
      counter++;
    }
    usedNames.add(name);

    zip.file(name, pdfBlob);
    onProgress?.({ current: i + 1, total: assetsWithReports.length });
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const url = window.URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Asset_Reports_${stamp}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
