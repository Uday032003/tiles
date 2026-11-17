import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import {
  parseDimensionToFeet,
  calculateMeasurement,
  calculateStaircase,
  formatFeetAsFeetInches,
} from '../src/utils/measurementCalculator.js';

test('parseDimensionToFeet distinguishes 13.6 decimal feet from 13 feet 6 inches', () => {
  assert.equal(parseDimensionToFeet('13.6', 'DECIMAL_FEET'), 13.6);
  assert.equal(parseDimensionToFeet("13'6\"", 'FEET_INCHES'), 13.5);
  assert.equal(parseDimensionToFeet('13-6', 'FEET_INCHES'), 13.5);
  assert.equal(parseDimensionToFeet('13 6', 'FEET_INCHES'), 13.5);
  assert.equal(parseDimensionToFeet('18', 'INCHES'), 1.5);
  assert.equal(formatFeetAsFeetInches(13.5), '13\'6"');

  // Reject dotted decimal string in FEET_INCHES mode to prevent silent mistakes
  assert.throws(() => parseDimensionToFeet('13.6', 'FEET_INCHES'));
  // Reject >= 12 inches in FEET_INCHES mode
  assert.throws(() => parseDimensionToFeet("10'14\"", 'FEET_INCHES'));
  // Reject negative values
  assert.throws(() => parseDimensionToFeet('-5', 'DECIMAL_FEET'));
});

test('calculateMeasurement handles floor area, wall area, and direct area', () => {
  const floor = calculateMeasurement({
    inputMethod: 'DIMENSIONS',
    dimensionUnit: 'DECIMAL_FEET',
    outputUnit: 'SQ_FT',
    surfaceRole: 'FLOOR',
    lengthRaw: '12',
    widthRaw: '10',
    quantity: 1,
  });
  assert.equal(floor.grossArea, 120);
  assert.equal(floor.netArea, 120);
  assert.equal(floor.billableQuantity, 120);

  // Master Bathroom example from spec: Walls 18.6 x 7 = 130.2 sq ft
  const bathWalls = calculateMeasurement({
    inputMethod: 'DIMENSIONS',
    dimensionUnit: 'DECIMAL_FEET',
    outputUnit: 'SQ_FT',
    surfaceRole: 'WALL',
    lengthRaw: '18.6',
    heightRaw: '7',
    quantity: 1,
  });
  assert.equal(bathWalls.heightFt, 7);
  assert.equal(bathWalls.grossArea, 130.2);

  // Direct area entry: Kitchen Walls = 45 sq ft
  const direct = calculateMeasurement({
    inputMethod: 'DIRECT_AREA',
    dimensionUnit: 'NA',
    outputUnit: 'SQ_FT',
    surfaceRole: 'WALL',
    directArea: 45,
  });
  assert.equal(direct.grossArea, 45);
  assert.equal(direct.netArea, 45);
});

test('calculateMeasurement handles multiple segments (Kitchen Platform)', () => {
  // Kitchen Platform: Section 1: 8 x 2, Section 2: 5 x 2 -> 26 sq ft
  const platform = calculateMeasurement({
    inputMethod: 'SEGMENTS',
    dimensionUnit: 'DECIMAL_FEET',
    outputUnit: 'SQ_FT',
    surfaceRole: 'GRANITE',
    segments: [
      { label: 'Main Counter', dimensionUnit: 'DECIMAL_FEET', lengthRaw: '8', widthRaw: '2', quantity: 1 },
      { label: 'L-Return', dimensionUnit: 'FEET_INCHES', lengthRaw: "5'0\"", widthRaw: "2'0\"", quantity: 1 },
    ],
  });
  assert.equal(platform.grossArea, 26);
  assert.equal(platform.netArea, 26);
});

test('calculateMeasurement computes mixed-unit segments and deductions accurately', () => {
  const result = calculateMeasurement({
    inputMethod: 'SEGMENTS',
    dimensionUnit: 'DECIMAL_FEET',
    outputUnit: 'SQ_FT',
    surfaceRole: 'GRANITE',
    segments: [
      { label: 'Main Counter', dimensionUnit: 'DECIMAL_FEET', lengthRaw: '8', widthRaw: '2', quantity: 1 },
      { label: 'Side Counter', dimensionUnit: 'INCHES', lengthRaw: '60', widthRaw: '24', quantity: 1 },
    ],
    deductions: [
      {
        label: 'Sink Cutout',
        deductionType: 'SINK_CUTOUT',
        dimensionUnit: 'INCHES',
        lengthRaw: '24',
        widthRaw: '18',
        quantity: 1,
      },
    ],
    billableQuantity: 25,
  });

  // 8*2 = 16; 60"=5ft * 24"=2ft = 10 => gross = 26
  // Sink cutout: 24"=2ft * 18"=1.5ft = 3 => net = 23
  assert.equal(result.grossArea, 26);
  assert.equal(result.deductionArea, 3);
  assert.equal(result.netArea, 23);
  assert.equal(result.billableQuantity, 25);
});

test('calculateMeasurement rejects deductions exceeding gross area and zero/negative inputs', () => {
  assert.throws(() =>
    calculateMeasurement({
      inputMethod: 'DIMENSIONS',
      dimensionUnit: 'DECIMAL_FEET',
      outputUnit: 'SQ_FT',
      surfaceRole: 'WALL',
      lengthRaw: '5',
      heightRaw: '4',
      deductions: [
        { label: 'Huge Door', dimensionUnit: 'DECIMAL_FEET', lengthRaw: '6', widthRaw: '4' },
      ],
    })
  );

  assert.throws(() =>
    calculateMeasurement({
      inputMethod: 'DIMENSIONS',
      dimensionUnit: 'DECIMAL_FEET',
      outputUnit: 'SQ_FT',
      surfaceRole: 'FLOOR',
      lengthRaw: '0',
      widthRaw: '10',
    })
  );

  assert.throws(() =>
    calculateMeasurement({
      inputMethod: 'DIMENSIONS',
      dimensionUnit: 'DECIMAL_FEET',
      outputUnit: 'SQ_FT',
      surfaceRole: 'FLOOR',
      lengthRaw: '10',
      widthRaw: '10',
      billableQuantity: -2,
    })
  );
});

test('calculateMeasurement handles granite running feet and pieces', () => {
  const skirting = calculateMeasurement({
    inputMethod: 'DIMENSIONS',
    dimensionUnit: 'FEET_INCHES',
    outputUnit: 'RUNNING_FT',
    surfaceRole: 'SKIRTING',
    lengthRaw: "12'6\"",
    quantity: 2,
  });
  assert.equal(skirting.grossArea, 25);

  const thresholds = calculateMeasurement({
    inputMethod: 'DIMENSIONS',
    dimensionUnit: 'NA',
    outputUnit: 'PIECES',
    surfaceRole: 'GRANITE',
    quantity: 4,
  });
  assert.equal(thresholds.grossArea, 4);
  assert.equal(thresholds.netArea, 4);
});

test('calculateStaircase supports uniform steps with differing tread/riser counts and non-uniform steps', () => {
  const uniform = calculateStaircase({
    isUniformSteps: true,
    treadCount: 10,
    riserCount: 11,
    treadWidthFt: 3.5,
    treadDepthFt: 1,
    riserHeightFt: 0.5,
    landingLengthFt: 6,
    landingWidthFt: 3.5,
    skirtingLengthFt: 18,
  });
  // Tread: 3.5 * 1 * 10 = 35
  // Riser: 3.5 * 0.5 * 11 = 19.25
  // Landing: 6 * 3.5 = 21
  // Total: 75.25
  assert.equal(uniform.treadAreaSqft, 35);
  assert.equal(uniform.riserAreaSqft, 19.25);
  assert.equal(uniform.landingAreaSqft, 21);
  assert.equal(uniform.totalAreaSqft, 75.25);

  const nonUniform = calculateStaircase({
    isUniformSteps: false,
    landingLengthFt: 4,
    landingWidthFt: 3,
    stepsData: [
      { treadWidthFt: 3, treadDepthFt: 1.5, riserHeightFt: 0.5, hasTread: true, hasRiser: true },
      { treadWidthFt: 3.5, treadDepthFt: 1, riserHeightFt: 0.5, hasTread: true, hasRiser: true },
      { treadWidthFt: 3.5, treadDepthFt: 0, riserHeightFt: 0.5, hasTread: false, hasRiser: true },
    ],
  });
  // Treads: 4.5 + 3.5 + 0 = 8 (count 2)
  // Risers: 1.5 + 1.75 + 1.75 = 5 (count 3)
  // Landing: 12
  // Total: 25
  assert.equal(nonUniform.treadCount, 2);
  assert.equal(nonUniform.riserCount, 3);
  assert.equal(nonUniform.treadAreaSqft, 8);
  assert.equal(nonUniform.riserAreaSqft, 5);
  assert.equal(nonUniform.totalAreaSqft, 25);
});
