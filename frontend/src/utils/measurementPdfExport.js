import { jsPDF } from 'jspdf';
import { formatArea, getOutputUnitLabel } from './formatters.js';

export function formatMeasurementDimensionsForExport(m) {
  if (!m) return '-';
  if (m.staircase) {
    const s = m.staircase;
    return `${s.stepsCount || 0} steps (${s.stepTread || ''}" T x ${s.stepRiser || ''}" R x ${s.stepWidth || ''}" W)`;
  }
  if (m.segments && m.segments.length > 0) {
    return m.segments
      .map((seg) => `${seg.length ?? ''} x ${seg.width ?? ''}`)
      .filter(Boolean)
      .join(', ');
  }
  if (m.length && m.width) {
    const qtyStr = Number(m.quantity || 1) > 1 ? ` x ${m.quantity}` : '';
    return `${m.length} x ${m.width}${qtyStr}`;
  }
  if (m.length) {
    return `${m.length} R.ft`;
  }
  return '-';
}

export function generateMeasurementPdf({ building, floors = [], totalArea = 0 }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  let y = 32;

  // Header Banner (Dark Emerald/Teal Theme)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 75, 'F');

  // Accent Line
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(0, 72, pageWidth, 3, 'F');

  doc.setTextColor(20, 184, 166);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('DM TILES', margin, 36);

  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Measurement & Estimation Summary Sheet', margin, 52);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated: ${printDate}`, pageWidth - margin, 46, { align: 'right' });

  // Building Information Card
  y = 90;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, contentWidth, 72, 4, 4, 'FD');

  // Left building details
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(building?.name || 'Building Measurement', margin + 14, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const codeText = building?.buildingCode ? `Code: ${building.buildingCode}` : '';
  const customerText = building?.customerName ? `Customer: ${building.customerName}` : '';
  const phoneText = building?.customerPhone ? `Phone: ${building.customerPhone}` : '';
  const locText = building?.location ? `Location: ${building.location}` : '';

  doc.text([customerText, phoneText].filter(Boolean).join('  |  '), margin + 14, y + 40);
  doc.text([codeText, locText].filter(Boolean).join('  |  '), margin + 14, y + 56);

  // Right Total Area Pill
  const pillW = 145;
  const pillH = 48;
  const pillX = pageWidth - margin - pillW - 12;
  const pillY = y + 12;

  doc.setFillColor(20, 184, 166);
  doc.roundedRect(pillX, pillY, pillW, pillH, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL MEASURED AREA', pillX + pillW / 2, pillY + 16, { align: 'center' });

  doc.setFontSize(13);
  doc.text(`${Number(totalArea || 0).toFixed(2)} sq ft`, pillX + pillW / 2, pillY + 36, { align: 'center' });

  y += 88;

  // Render Floors
  if (!floors || floors.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('No floors or measurements added yet.', margin, y + 20);
    return doc;
  }

  floors.forEach((floor, fIdx) => {
    // Check if new page is needed for floor header
    if (y > pageHeight - 90) {
      doc.addPage();
      y = 40;
    }

    // Floor Header Banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`${floor.name || `Floor ${fIdx + 1}`}`, margin + 10, y + 16);

    const floorTotal = Number(floor.totalMeasuredArea || 0).toFixed(2);
    doc.setTextColor(20, 184, 166);
    doc.text(`Subtotal: ${floorTotal} sq ft`, pageWidth - margin - 10, y + 16, { align: 'right' });

    y += 28;

    const floorMeasurements = (floor.rooms || []).flatMap((r) =>
      (r.measurements || []).map((m) => ({
        ...m,
        roomName: r.name,
      }))
    );

    if (floorMeasurements.length === 0) {
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text(`No measurements recorded for ${floor.name}.`, margin + 10, y + 12);
      y += 22;
    } else {
      // Table Header Row
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y, contentWidth, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Room & Work Description', margin + 10, y + 12);
      doc.text('Dimensions (L x W)', margin + 260, y + 12);
      doc.text('Area', pageWidth - margin - 10, y + 12, { align: 'right' });

      y += 20;

      floorMeasurements.forEach((m) => {
        // Page break check
        if (y > pageHeight - 45) {
          doc.addPage();
          y = 40;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        const workLabel = m.workTypeName || m.surfaceRole || 'Tiles';
        const label = `${m.roomName} - ${workLabel}`;
        const dims = formatMeasurementDimensionsForExport(m);
        const areaStr = `${Number(m.netArea || 0).toFixed(2)} ${getOutputUnitLabel(m.outputUnit)}`;

        doc.text(label, margin + 10, y + 10);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(dims, margin + 260, y + 10);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(areaStr, pageWidth - margin - 10, y + 10, { align: 'right' });

        y += 18;
        // Subtle divider
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, pageWidth - margin, y);
      });

      y += 8;
    }

    y += 10;
  });

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `DM Tiles Management • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 16,
      { align: 'center' }
    );
  }

  return doc;
}

export async function shareMeasurementsOnWhatsApp({ building, floors = [], totalArea = 0, showToast }) {
  // 1. Build formatted text summary
  let text = `*DM TILES - MEASUREMENT SUMMARY*\n`;
  text += `Building: *${building?.name || 'Building'}*`;
  if (building?.buildingCode) text += ` (${building.buildingCode})`;
  text += `\n`;
  if (building?.customerName) {
    text += `Customer: ${building.customerName}${building.customerPhone ? ` (${building.customerPhone})` : ''}\n`;
  }
  if (building?.location) text += `Location: ${building.location}\n`;
  text += `---------------------------------\n`;

  floors.forEach((floor) => {
    text += `\n*${(floor.name || 'Floor').toUpperCase()}*\n`;
    const measurements = (floor.rooms || []).flatMap((r) =>
      (r.measurements || []).map((m) => ({ ...m, roomName: r.name }))
    );

    if (measurements.length === 0) {
      text += `  (No measurements yet)\n`;
    } else {
      measurements.forEach((m) => {
        const label = `${m.roomName} ${m.workTypeName || m.surfaceRole || 'Floor'}`;
        const dims = formatMeasurementDimensionsForExport(m);
        const areaStr = `${Number(m.netArea || 0).toFixed(2)} ${getOutputUnitLabel(m.outputUnit)}`;
        text += `• ${label}: ${dims} = *${areaStr}*\n`;
      });
    }
    const floorSubtotal = Number(floor.totalMeasuredArea || 0).toFixed(2);
    text += `Subtotal: *${floorSubtotal} sq ft*\n`;
  });

  text += `---------------------------------\n`;
  text += `*TOTAL MEASURED: ${Number(totalArea || 0).toFixed(2)} SQ FT*\n`;

  // 2. Generate PDF document
  const doc = generateMeasurementPdf({ building, floors, totalArea });
  const rawName = (building?.name || 'Building').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${rawName}_Measurements.pdf`;

  // 3. Web Share API (native mobile share sheet directly shares PDF to WhatsApp!)
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: `${building?.name || 'Building'} - Measurements`,
        text: text,
        files: [pdfFile],
      });
      if (showToast) {
        showToast('Measurement PDF ready to share!', 'success');
      }
      return;
    } catch (shareErr) {
      if (shareErr.name === 'AbortError') {
        return; // User canceled the picker
      }
      console.warn('Web Share failed, using direct WhatsApp link fallback:', shareErr);
    }
  }

  // 4. Fallback (Desktop / non-file Web Share):
  // Download the PDF automatically
  doc.save(filename);
  if (showToast) {
    showToast('PDF downloaded! Opening WhatsApp...', 'info');
  }

  // Open WhatsApp with text
  const phoneDigits = building?.customerPhone ? building.customerPhone.replace(/[^0-9]/g, '') : '';
  const waUrl = phoneDigits
    ? `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(text + '\n\n(PDF summary sheet downloaded to attach)')}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n\n(PDF summary sheet downloaded to attach)')}`;

  window.open(waUrl, '_blank');
}

