/**
 * DM Tiles — Pure Measurement & Staircase Calculation Engine
 * All dimension normalization and area calculations are decimal-safe and independent of UI/DB.
 */

export const DIMENSION_UNITS = ['FEET_INCHES', 'DECIMAL_FEET', 'INCHES', 'NA'];
export const OUTPUT_UNITS = ['SQ_FT', 'RUNNING_FT', 'PIECES', 'FIXED'];
export const INPUT_METHODS = ['DIMENSIONS', 'DIRECT_AREA', 'SEGMENTS'];

export function roundTo(value, decimals = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** decimals;
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Parses a raw dimension value into decimal feet according to the EXPLICIT dimensionUnit.
 * - DECIMAL_FEET: "13.6" => 13.6 ft (13 and 6/10 feet)
 * - FEET_INCHES: "13'6\"", "13-6", "13 6", "13' 6.5\"" => 13 + 6/12 = 13.5 ft
 *   Note: In FEET_INCHES mode, a dotted value like "13.6" without quote/dash is rejected or treated carefully:
 *   We explicitly forbid ambiguous "13.6" in FEET_INCHES mode unless formatted as feet'inches" (or whole feet),
 *   preventing silent 13.6 vs 13'6" mistakes!
 * - INCHES: "18" => 1.5 ft
 */
export function parseDimensionToFeet(rawValue, dimensionUnit = 'DECIMAL_FEET') {
  if (dimensionUnit === 'NA') return null;

  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    throw new Error('Dimension value is required');
  }

  const str = String(rawValue).trim();

  if (dimensionUnit === 'DECIMAL_FEET') {
    if (!/^\d+(\.\d+)?$/.test(str)) {
      throw new Error(`Invalid decimal feet value "${str}". Use numbers like 13.6`);
    }
    const val = Number(str);
    if (!Number.isFinite(val) || val < 0) {
      throw new Error('Dimension cannot be negative');
    }
    return roundTo(val, 4);
  }

  if (dimensionUnit === 'INCHES') {
    const cleaned = str.replace(/["”in]/gi, '').trim();
    if (!/^\d+(\.\d+)?$/.test(cleaned)) {
      throw new Error(`Invalid inches value "${str}". Use numbers like 18 or 24.5`);
    }
    const inches = Number(cleaned);
    if (!Number.isFinite(inches) || inches < 0) {
      throw new Error('Inches value cannot be negative');
    }
    return roundTo(inches / 12, 4);
  }

  if (dimensionUnit === 'FEET_INCHES') {
    // Support formats: 13'6", 13' 6", 13'6.5", 13-6, 13 6, 13', 13
    const feetInchesRegex = /^(\d+)\s*(?:'|ft|feet|-|\s)\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches)?$/i;
    const match = str.match(feetInchesRegex);
    if (match) {
      const feet = Number(match[1]);
      const inches = Number(match[2]);
      if (inches >= 12) {
        throw new Error(`Inches in "${str}" must be less than 12 (use e.g. 13'6" or switch to Inches mode)`);
      }
      return roundTo(feet + inches / 12, 4);
    }

    const feetOnlyRegex = /^(\d+)\s*(?:'|ft|feet)?$/i;
    const feetMatch = str.match(feetOnlyRegex);
    if (feetMatch) {
      return roundTo(Number(feetMatch[1]), 4);
    }

    throw new Error(
      `Invalid feet & inches format "${str}". Use formats like 13'6", 13-6, or 13 6 (or switch to Decimal Feet mode for ${str})`
    );
  }

  throw new Error(`Unsupported dimension unit: ${dimensionUnit}`);
}

export function formatFeetAsFeetInches(decimalFeet) {
  const num = Number(decimalFeet);
  if (!Number.isFinite(num) || num < 0) return '0\'0"';
  const totalInches = Math.round(num * 12 * 100) / 100;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round((totalInches - feet * 12) * 10) / 10;
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return `${feet}'${inches}"`;
}

export function calculateSegmentArea({ dimensionUnit, lengthRaw, widthRaw, quantity = 1 }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  const lengthFt = parseDimensionToFeet(lengthRaw, dimensionUnit);
  const widthFt = parseDimensionToFeet(widthRaw, dimensionUnit);
  if (lengthFt <= 0 || widthFt <= 0) {
    throw new Error('Segment length and width must be greater than zero');
  }
  const areaSqft = roundTo(lengthFt * widthFt * qty, 4);
  return { lengthFt, widthFt, quantity: roundTo(qty, 4), areaSqft };
}

export function calculateDeductionArea({ dimensionUnit, lengthRaw, widthRaw, quantity = 1 }) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Deduction quantity must be greater than zero');
  }
  const lengthFt = parseDimensionToFeet(lengthRaw, dimensionUnit);
  const widthFt = parseDimensionToFeet(widthRaw, dimensionUnit);
  if (lengthFt <= 0 || widthFt <= 0) {
    throw new Error('Deduction dimensions must be greater than zero');
  }
  const areaSqft = roundTo(lengthFt * widthFt * qty, 4);
  return { lengthFt, widthFt, quantity: roundTo(qty, 4), areaSqft };
}

/**
 * Computes full server-authoritative measurement totals.
 */
export function calculateMeasurement(input) {
  const {
    inputMethod,
    dimensionUnit = 'DECIMAL_FEET',
    outputUnit = 'SQ_FT',
    surfaceRole = 'OTHER',
    lengthRaw,
    widthRaw,
    heightRaw,
    quantity = 1,
    directArea,
    segments = [],
    deductions = [],
    billableQuantity,
  } = input;

  const qty = Number(quantity ?? 1);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than zero');
  }

  let lengthFt = null;
  let widthFt = null;
  let heightFt = null;
  let grossArea = 0;
  let normalizedDirectArea = null;
  const computedSegments = [];
  const computedDeductions = [];

  if (inputMethod === 'DIMENSIONS') {
    if (outputUnit === 'PIECES' || outputUnit === 'FIXED') {
      grossArea = roundTo(qty, 4);
      if (lengthRaw) lengthFt = parseDimensionToFeet(lengthRaw, dimensionUnit);
      if (widthRaw) widthFt = parseDimensionToFeet(widthRaw, dimensionUnit);
    } else if (outputUnit === 'RUNNING_FT') {
      lengthFt = parseDimensionToFeet(lengthRaw, dimensionUnit);
      if (lengthFt <= 0) {
        throw new Error('Length must be greater than zero for running feet measurements');
      }
      grossArea = roundTo(lengthFt * qty, 4);
    } else {
      // SQ_FT
      lengthFt = parseDimensionToFeet(lengthRaw, dimensionUnit);
      const isWallLike = surfaceRole === 'WALL' || surfaceRole === 'ELEVATION';
      const secondRaw = isWallLike ? heightRaw ?? widthRaw : widthRaw ?? heightRaw;
      const secondFt = parseDimensionToFeet(secondRaw, dimensionUnit);

      if (isWallLike) {
        heightFt = secondFt;
      } else {
        widthFt = secondFt;
      }

      if (lengthFt <= 0 || secondFt <= 0) {
        throw new Error('Dimensions must be greater than zero');
      }
      grossArea = roundTo(lengthFt * secondFt * qty, 4);
    }
  } else if (inputMethod === 'DIRECT_AREA') {
    const val = Number(directArea);
    if (!Number.isFinite(val) || val <= 0) {
      throw new Error('Direct area / quantity must be greater than zero');
    }
    normalizedDirectArea = roundTo(val, 4);
    grossArea = roundTo(normalizedDirectArea * qty, 4);
  } else if (inputMethod === 'SEGMENTS') {
    if (!Array.isArray(segments) || segments.length === 0) {
      throw new Error('At least one segment is required for multiple-segment entry');
    }
    let sum = 0;
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];
      const segUnit = seg.dimensionUnit || dimensionUnit;
      const calc = calculateSegmentArea({
        dimensionUnit: segUnit === 'NA' ? 'DECIMAL_FEET' : segUnit,
        lengthRaw: seg.lengthRaw,
        widthRaw: seg.widthRaw,
        quantity: seg.quantity ?? 1,
      });
      computedSegments.push({
        label: seg.label || `Section ${i + 1}`,
        dimensionUnit: segUnit === 'NA' ? 'DECIMAL_FEET' : segUnit,
        lengthRaw: String(seg.lengthRaw).trim(),
        widthRaw: String(seg.widthRaw).trim(),
        lengthFt: calc.lengthFt,
        widthFt: calc.widthFt,
        quantity: calc.quantity,
        areaSqft: calc.areaSqft,
        displayOrder: i,
      });
      sum += calc.areaSqft;
    }
    grossArea = roundTo(sum, 4);
  } else {
    throw new Error(`Unsupported input method: ${inputMethod}`);
  }

  let deductionArea = 0;
  if (Array.isArray(deductions) && deductions.length > 0) {
    if (outputUnit !== 'SQ_FT') {
      throw new Error('Deductions are only supported on square-foot area measurements');
    }
    for (const ded of deductions) {
      const dedUnit = ded.dimensionUnit || (dimensionUnit === 'NA' ? 'DECIMAL_FEET' : dimensionUnit);
      const calc = calculateDeductionArea({
        dimensionUnit: dedUnit,
        lengthRaw: ded.lengthRaw,
        widthRaw: ded.widthRaw,
        quantity: ded.quantity ?? 1,
      });
      computedDeductions.push({
        label: ded.label || 'Deduction',
        deductionType: ded.deductionType || 'OPENING',
        dimensionUnit: dedUnit,
        lengthRaw: String(ded.lengthRaw).trim(),
        widthRaw: String(ded.widthRaw).trim(),
        lengthFt: calc.lengthFt,
        widthFt: calc.widthFt,
        quantity: calc.quantity,
        areaSqft: calc.areaSqft,
      });
      deductionArea += calc.areaSqft;
    }
    deductionArea = roundTo(deductionArea, 4);
  }

  if (deductionArea > grossArea) {
    throw new Error(
      `Total deductions (${deductionArea} sq ft) cannot exceed gross area (${grossArea} sq ft)`
    );
  }

  const netArea = roundTo(grossArea - deductionArea, 4);
  const resolvedBillable =
    billableQuantity !== undefined && billableQuantity !== null && billableQuantity !== ''
      ? roundTo(Number(billableQuantity), 4)
      : netArea;

  if (!Number.isFinite(resolvedBillable) || resolvedBillable < 0) {
    throw new Error('Billable quantity cannot be negative');
  }

  return {
    lengthFt,
    widthFt,
    heightFt,
    quantity: roundTo(qty, 4),
    directArea: normalizedDirectArea,
    grossArea,
    deductionArea,
    netArea,
    billableQuantity: resolvedBillable,
    segments: computedSegments,
    deductions: computedDeductions,
  };
}

/**
 * Calculates uniform or step-by-step staircase tread, riser, landing, and total areas.
 */
export function calculateStaircase(input) {
  const {
    isUniformSteps = true,
    treadCount = 0,
    riserCount = 0,
    treadWidthFt = 0,
    treadDepthFt = 0,
    riserHeightFt = 0,
    landingLengthFt = 0,
    landingWidthFt = 0,
    skirtingLengthFt = 0,
    stepsData = [],
  } = input;

  const nonNeg = (v, label) => {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`${label} cannot be negative`);
    }
    return n;
  };

  const lLen = nonNeg(landingLengthFt, 'Landing length');
  const lWid = nonNeg(landingWidthFt, 'Landing width');
  const skirt = nonNeg(skirtingLengthFt, 'Skirting length');
  const landingAreaSqft = roundTo(lLen * lWid, 4);

  let treadAreaSqft = 0;
  let riserAreaSqft = 0;
  let resolvedTreadCount = 0;
  let resolvedRiserCount = 0;
  let normalizedSteps = [];

  if (isUniformSteps) {
    resolvedTreadCount = Math.trunc(nonNeg(treadCount, 'Tread count'));
    resolvedRiserCount = Math.trunc(nonNeg(riserCount, 'Riser count'));
    const tWidth = nonNeg(treadWidthFt, 'Tread width');
    const tDepth = nonNeg(treadDepthFt, 'Tread depth');
    const rHeight = nonNeg(riserHeightFt, 'Riser height');

    treadAreaSqft = roundTo(tWidth * tDepth * resolvedTreadCount, 4);
    riserAreaSqft = roundTo(tWidth * rHeight * resolvedRiserCount, 4);
  } else {
    if (!Array.isArray(stepsData) || stepsData.length === 0) {
      throw new Error('Individual step dimensions are required for non-uniform staircases');
    }
    normalizedSteps = stepsData.map((step, idx) => {
      const w = nonNeg(step.treadWidthFt, `Step ${idx + 1} width`);
      const d = nonNeg(step.treadDepthFt, `Step ${idx + 1} tread depth`);
      const h = nonNeg(step.riserHeightFt, `Step ${idx + 1} riser height`);
      const hasTread = step.hasTread !== false;
      const hasRiser = step.hasRiser !== false;

      const stepTreadArea = hasTread ? roundTo(w * d, 4) : 0;
      const stepRiserArea = hasRiser ? roundTo(w * h, 4) : 0;

      if (hasTread) resolvedTreadCount += 1;
      if (hasRiser) resolvedRiserCount += 1;
      treadAreaSqft += stepTreadArea;
      riserAreaSqft += stepRiserArea;

      return {
        stepNumber: idx + 1,
        treadWidthFt: roundTo(w, 4),
        treadDepthFt: roundTo(d, 4),
        riserHeightFt: roundTo(h, 4),
        hasTread,
        hasRiser,
        treadAreaSqft: stepTreadArea,
        riserAreaSqft: stepRiserArea,
      };
    });

    treadAreaSqft = roundTo(treadAreaSqft, 4);
    riserAreaSqft = roundTo(riserAreaSqft, 4);
  }

  const totalAreaSqft = roundTo(treadAreaSqft + riserAreaSqft + landingAreaSqft, 4);

  return {
    isUniformSteps,
    treadCount: resolvedTreadCount,
    riserCount: resolvedRiserCount,
    treadWidthFt: roundTo(nonNeg(treadWidthFt, 'Tread width'), 4),
    treadDepthFt: roundTo(nonNeg(treadDepthFt, 'Tread depth'), 4),
    riserHeightFt: roundTo(nonNeg(riserHeightFt, 'Riser height'), 4),
    landingLengthFt: roundTo(lLen, 4),
    landingWidthFt: roundTo(lWid, 4),
    skirtingLengthFt: roundTo(skirt, 4),
    treadAreaSqft,
    riserAreaSqft,
    landingAreaSqft,
    totalAreaSqft,
    stepsData: normalizedSteps,
  };
}

