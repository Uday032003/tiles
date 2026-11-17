/**
 * DM Tiles — Frontend Measurement & Staircase Preview Calculator
 * Mirrors backend measurementCalculator.js for instant UI previews.
 * All submitted values are independently validated and recomputed on the server.
 */

export function roundTo(value, decimals = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** decimals;
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function parseDimensionToFeet(rawValue, dimensionUnit = 'DECIMAL_FEET') {
  if (dimensionUnit === 'NA') return null;
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    throw new Error('Dimension value is required');
  }

  const str = String(rawValue).trim();

  if (dimensionUnit === 'DECIMAL_FEET') {
    if (!/^\d+(\.\d+)?$/.test(str)) {
      throw new Error(`Invalid decimal feet "${str}". Example: 13.6`);
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
      throw new Error(`Invalid inches "${str}". Example: 18`);
    }
    const inches = Number(cleaned);
    if (!Number.isFinite(inches) || inches < 0) {
      throw new Error('Inches cannot be negative');
    }
    return roundTo(inches / 12, 4);
  }

  if (dimensionUnit === 'FEET_INCHES') {
    const feetInchesRegex = /^(\d+)\s*(?:'|ft|feet|-|\s)\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches)?$/i;
    const match = str.match(feetInchesRegex);
    if (match) {
      const feet = Number(match[1]);
      const inches = Number(match[2]);
      if (inches >= 12) {
        throw new Error(`Inches in "${str}" must be less than 12`);
      }
      return roundTo(feet + inches / 12, 4);
    }

    const feetOnlyRegex = /^(\d+)\s*(?:'|ft|feet)?$/i;
    const feetMatch = str.match(feetOnlyRegex);
    if (feetMatch) {
      return roundTo(Number(feetMatch[1]), 4);
    }

    throw new Error(`Use Feet & Inches format like 13'6" or 13-6 (or switch to Decimal Feet)`);
  }

  throw new Error(`Unsupported unit: ${dimensionUnit}`);
}

export function calculateMeasurementPreview(input) {
  try {
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
    } = input;

    const qty = Number(quantity ?? 1);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { error: 'Quantity must be greater than zero' };
    }

    let grossArea = 0;

    if (inputMethod === 'DIMENSIONS') {
      if (outputUnit === 'PIECES' || outputUnit === 'FIXED') {
        grossArea = roundTo(qty, 4);
      } else if (outputUnit === 'RUNNING_FT') {
        const lenFt = parseDimensionToFeet(lengthRaw, dimensionUnit);
        if (lenFt <= 0) return { error: 'Length must be greater than zero' };
        grossArea = roundTo(lenFt * qty, 4);
      } else {
        const lenFt = parseDimensionToFeet(lengthRaw, dimensionUnit);
        const isWall = surfaceRole === 'WALL' || surfaceRole === 'ELEVATION';
        const secondRaw = isWall ? heightRaw || widthRaw : widthRaw || heightRaw;
        const secondFt = parseDimensionToFeet(secondRaw, dimensionUnit);
        if (lenFt <= 0 || secondFt <= 0) {
          return { error: 'Dimensions must be greater than zero' };
        }
        grossArea = roundTo(lenFt * secondFt * qty, 4);
      }
    } else if (inputMethod === 'DIRECT_AREA') {
      const val = Number(directArea);
      if (!Number.isFinite(val) || val <= 0) {
        return { error: 'Enter a positive direct area / quantity' };
      }
      grossArea = roundTo(val * qty, 4);
    } else if (inputMethod === 'SEGMENTS') {
      if (!segments.length) {
        return { error: 'Add at least one rectangular segment' };
      }
      let sum = 0;
      for (const seg of segments) {
        const unit = seg.dimensionUnit || 'DECIMAL_FEET';
        const l = parseDimensionToFeet(seg.lengthRaw, unit);
        const w = parseDimensionToFeet(seg.widthRaw, unit);
        const q = Number(seg.quantity ?? 1);
        if (l <= 0 || w <= 0 || q <= 0) {
          return { error: 'Each segment needs positive dimensions and quantity' };
        }
        sum += roundTo(l * w * q, 4);
      }
      grossArea = roundTo(sum, 4);
    }

    let deductionArea = 0;
    if (outputUnit === 'SQ_FT' && deductions.length > 0) {
      for (const ded of deductions) {
        const unit = ded.dimensionUnit || 'DECIMAL_FEET';
        const l = parseDimensionToFeet(ded.lengthRaw, unit);
        const w = parseDimensionToFeet(ded.widthRaw, unit);
        const q = Number(ded.quantity ?? 1);
        if (l <= 0 || w <= 0 || q <= 0) {
          return { error: 'Each deduction needs positive dimensions and quantity' };
        }
        deductionArea += roundTo(l * w * q, 4);
      }
      deductionArea = roundTo(deductionArea, 4);
    }

    if (deductionArea > grossArea) {
      return {
        error: `Deductions (${deductionArea}) cannot exceed gross area (${grossArea})`,
        grossArea,
        deductionArea,
        netArea: 0,
      };
    }

    return {
      error: null,
      grossArea,
      deductionArea,
      netArea: roundTo(grossArea - deductionArea, 4),
    };
  } catch (err) {
    return { error: err.message };
  }
}

export function calculateStaircasePreview(input) {
  const num = (v) => {
    const n = Number(v || 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const landingAreaSqft = roundTo(num(input.landingLengthFt) * num(input.landingWidthFt), 4);
  let treadAreaSqft = 0;
  let riserAreaSqft = 0;

  if (input.isUniformSteps !== false) {
    const w = num(input.treadWidthFt);
    treadAreaSqft = roundTo(w * num(input.treadDepthFt) * Math.trunc(num(input.treadCount)), 4);
    riserAreaSqft = roundTo(w * num(input.riserHeightFt) * Math.trunc(num(input.riserCount)), 4);
  } else {
    for (const step of input.stepsData || []) {
      const w = num(step.treadWidthFt);
      if (step.hasTread !== false) {
        treadAreaSqft += roundTo(w * num(step.treadDepthFt), 4);
      }
      if (step.hasRiser !== false) {
        riserAreaSqft += roundTo(w * num(step.riserHeightFt), 4);
      }
    }
    treadAreaSqft = roundTo(treadAreaSqft, 4);
    riserAreaSqft = roundTo(riserAreaSqft, 4);
  }

  return {
    treadAreaSqft,
    riserAreaSqft,
    landingAreaSqft,
    totalAreaSqft: roundTo(treadAreaSqft + riserAreaSqft + landingAreaSqft, 4),
  };
}

