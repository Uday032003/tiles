import { jsPDF } from 'jspdf';
import { formatArea, getOutputUnitLabel } from './formatters.js';

const STANDARD_ROOM_DEFAULTS = {
  hall: { length: 10, width: 10 },
  kitchen: { length: 10, width: 12 },
  'master bedroom': { length: 10, width: 12 },
  'master bathroom': { length: 5, width: 8 },
  'children bedroom': { length: 10, width: 12 },
  'children bathroom': { length: 5, width: 7 },
  parking: { length: 12, width: 16 },
  balcony: { length: 5, width: 10 },
  elevation: { length: 10, width: 15 },
  'front elevation': { length: 10, width: 15 },
  'elevation tiles': { length: 10, width: 15 },
  'pooja room': { length: 6, width: 6 },
  dining: { length: 10, width: 10 },
  'outside bathroom': { length: 4, width: 5 },
  terrace: { length: 15, width: 20 },
};

export function formatMeasurementDimensionsForExport(m) {
  if (!m) return '-';
  if (m.isStaircase || m.staircase || m.surfaceRole === 'STAIRCASE' || m.workTypeCode === 'GRANITE_STAIRCASE') {
    const s = m.staircase || m;
    const steps = s.treadCount ?? s.tread_count ?? s.stepCount ?? s.stepsCount ?? m.lengthRaw ?? 0;
    return `${steps} steps`;
  }
  if (m.segments && m.segments.length > 0) {
    return m.segments
      .map((seg) => {
        const l = seg.lengthRaw ?? (seg.lengthFt != null ? seg.lengthFt : '') ?? seg.length ?? '';
        const w = seg.widthRaw ?? (seg.widthFt != null ? seg.widthFt : '') ?? seg.width ?? '';
        return l && w ? `${l} x ${w} ft` : l || w || '';
      })
      .filter(Boolean)
      .join(', ');
  }

  const rawLen = m.lengthRaw ?? (m.lengthFt !== null && m.lengthFt !== undefined ? m.lengthFt : '') ?? m.length ?? '';
  const rawWid = m.widthRaw ?? (m.widthFt !== null && m.widthFt !== undefined ? m.widthFt : '') ?? m.width ?? '';
  const qty = Number(m.quantity || 1);
  const qtyStr = qty > 1 ? ` (qty ${qty})` : '';

  const lenStr = String(rawLen).trim();
  const widStr = String(rawWid).trim();

  if (lenStr && widStr) {
    return `${lenStr} x ${widStr} ft${qtyStr}`;
  }
  if (lenStr) {
    return `${lenStr} ft${qtyStr}`;
  }
  if (widStr) {
    return `${widStr} ft${qtyStr}`;
  }
  return '-';
}

export function generateMeasurementPdf({ building, floors = [], totalArea = 0, staircase = null }) {
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

    // Collect measurements for this floor, resolving dimensions cleanly
    const floorMeasurements = (floor.rooms || [])
      .filter((r) => !r.name?.toLowerCase().includes('stair'))
      .flatMap((r) => {
        const rMeas = (r.measurements || []).filter(
          (m) => !m.isStaircase && m.surfaceRole !== 'STAIRCASE' && m.workTypeCode !== 'GRANITE_STAIRCASE'
        );

        if (rMeas.length > 0) {
          return rMeas.map((m) => {
            const def = STANDARD_ROOM_DEFAULTS[r.name?.toLowerCase()?.trim()];
            const resolvedLen = m.lengthRaw || (m.lengthFt != null ? m.lengthFt : '') || m.length || def?.length || '';
            const resolvedWid = m.widthRaw || (m.widthFt != null ? m.widthFt : '') || m.width || def?.width || '';
            return {
              ...m,
              roomName: r.name,
              lengthRaw: resolvedLen,
              widthRaw: resolvedWid,
            };
          });
        }

        // Fallback for room created with default dimensions
        const def = STANDARD_ROOM_DEFAULTS[r.name?.toLowerCase()?.trim()];
        const w = r.widthRaw || r.width || def?.width || '';
        const l = r.lengthRaw || r.length || def?.length || '';
        const area = Number(r.totalMeasuredArea || (w && l ? Number(w) * Number(l) : 0));

        return [
          {
            id: r.id,
            roomName: r.name,
            workTypeName: 'Floor Tiles',
            surfaceRole: 'FLOOR',
            outputUnit: 'SQ_FT',
            lengthRaw: l ? String(l) : '',
            widthRaw: w ? String(w) : '',
            netArea: area,
          },
        ];
      });

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

  // Building Staircase Section (One same staircase for all floors)
  const stairSteps = staircase ? Number(staircase.treadCount ?? staircase.stepCount ?? staircase.tread_count ?? 0) : 0;
  if (stairSteps > 0) {
    if (y > pageHeight - 90) {
      doc.addPage();
      y = 40;
    }

    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('STAIRCASE (All Floors)', margin + 10, y + 16);

    const stairArea = Number(staircase.totalAreaSqft || stairSteps * 5.25).toFixed(2);
    doc.setTextColor(20, 184, 166);
    doc.text(`${stairSteps} Steps`, pageWidth - margin - 10, y + 16, { align: 'right' });

    y += 28;

    // Table Header Row
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Item Description', margin + 10, y + 12);
    doc.text('Step Count', margin + 260, y + 12);
    doc.text('Area', pageWidth - margin - 10, y + 12, { align: 'right' });

    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(staircase.name || 'Main Staircase', margin + 10, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${stairSteps} steps`, margin + 260, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${stairArea} sq ft`, pageWidth - margin - 10, y + 10, { align: 'right' });

    y += 26;
  }

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

export async function shareMeasurementsOnWhatsApp({ building, floors = [], totalArea = 0, staircase = null, showToast }) {
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
    const measurements = (floor.rooms || [])
      .filter((r) => !r.name?.toLowerCase().includes('stair'))
      .flatMap((r) => {
        const rMeas = (r.measurements || []).filter(
          (m) => !m.isStaircase && m.surfaceRole !== 'STAIRCASE' && m.workTypeCode !== 'GRANITE_STAIRCASE'
        );
        if (rMeas.length > 0) {
          return rMeas.map((m) => {
            const def = STANDARD_ROOM_DEFAULTS[r.name?.toLowerCase()?.trim()];
            return {
              ...m,
              roomName: r.name,
              lengthRaw: m.lengthRaw || (m.lengthFt != null ? m.lengthFt : '') || m.length || def?.length || '',
              widthRaw: m.widthRaw || (m.widthFt != null ? m.widthFt : '') || m.width || def?.width || '',
            };
          });
        }
        const def = STANDARD_ROOM_DEFAULTS[r.name?.toLowerCase()?.trim()];
        const w = r.widthRaw || r.width || def?.width || '';
        const l = r.lengthRaw || r.length || def?.length || '';
        const area = Number(r.totalMeasuredArea || (w && l ? Number(w) * Number(l) : 0));
        return [
          {
            roomName: r.name,
            workTypeName: 'Floor Tiles',
            lengthRaw: l ? String(l) : '',
            widthRaw: w ? String(w) : '',
            netArea: area,
            outputUnit: 'SQ_FT',
          },
        ];
      });

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

  const stairSteps = staircase ? Number(staircase.treadCount ?? staircase.stepCount ?? staircase.tread_count ?? 0) : 0;
  if (stairSteps > 0) {
    const stairArea = Number(staircase.totalAreaSqft || stairSteps * 5.25).toFixed(2);
    text += `\n*STAIRCASE (All Floors)*\n`;
    text += `• ${staircase.name || 'Main Staircase'}: ${stairSteps} steps = *${stairArea} sq ft*\n`;
  }

  text += `---------------------------------\n`;
  text += `*TOTAL MEASURED: ${Number(totalArea || 0).toFixed(2)} SQ FT*\n`;

  // 2. Generate PDF document
  const doc = generateMeasurementPdf({ building, floors, totalArea, staircase });
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
