import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import {
  createBuildingSchema,
  listBuildingsQuerySchema,
  updateBuildingSchema,
} from '../src/validators/buildingValidator.js';
import {
  createFloorSchema,
  duplicateFloorSchema,
  reorderFloorsSchema,
} from '../src/validators/floorValidator.js';
import { createRoomSchema, reorderRoomsSchema } from '../src/validators/roomValidator.js';
import { mapBuildingRow } from '../src/repositories/buildingsRepository.js';
import { mapFloorRow } from '../src/repositories/floorsRepository.js';
import { mapRoomRow } from '../src/repositories/roomsRepository.js';

test('building validators normalize optional fields and enforce valid sort', () => {
  const created = createBuildingSchema.safeParse({
    name: 'Sri Lakshmi Residency',
    customerName: 'Mr. Prasad',
    customerPhone: '',
    location: 'Rajahmundry',
    startDate: '2026-11-11',
  });
  assert.equal(created.success, true);
  assert.equal(created.data.customerPhone, null);

  const badDate = createBuildingSchema.safeParse({
    name: 'Site B',
    customerName: 'Kumar',
    location: 'Kakinada',
    startDate: '11-11-2026',
  });
  assert.equal(badDate.success, false);

  const query = listBuildingsQuerySchema.safeParse({
    search: 'Prasad',
    sortBy: 'total_area',
    sortOrder: 'asc',
  });
  assert.equal(query.success, true);
  assert.equal(query.data.page, 1);

  const patch = updateBuildingSchema.safeParse({ name: 'Updated Residency' });
  assert.equal(patch.success, true);
});

test('floor & room validators validate UUID arrays and floor duplication options', () => {
  const validFloor = createFloorSchema.safeParse({ name: 'Ground Floor', floorNumber: 0 });
  assert.equal(validFloor.success, true);

  const dup = duplicateFloorSchema.safeParse({ name: 'Second Floor' });
  assert.equal(dup.success, true);
  assert.equal(dup.data.copyMeasurements, true);

  const badReorder = reorderFloorsSchema.safeParse({ floorIds: ['not-a-uuid'] });
  assert.equal(badReorder.success, false);

  const validRoom = createRoomSchema.safeParse({
    name: 'Outside Bathroom 2',
    roomTypeId: '',
  });
  assert.equal(validRoom.success, true);
  assert.equal(validRoom.data.roomTypeId, null);

  const validRoomReorder = reorderRoomsSchema.safeParse({
    roomIds: ['11111111-1111-4111-8111-111111111111'],
  });
  assert.equal(validRoomReorder.success, true);
});

test('row mappers convert numeric strings safely to numbers and camelCase DTOs', () => {
  const b = mapBuildingRow({
    id: 'b-1',
    owner_id: 'u-1',
    building_code: 'BLD-1001',
    name: 'Sri Lakshmi Residency',
    customer_name: 'Mr. Prasad',
    location: 'Rajahmundry',
    floor_count: '3',
    room_count: '12',
    floor_tile_area: '1450.50',
    wall_tile_area: '620.25',
    granite_area: '120.00',
    total_measured_area: '2190.75',
  });
  assert.equal(b.buildingCode, 'BLD-1001');
  assert.equal(b.floorCount, 3);
  assert.equal(b.totalMeasuredArea, 2190.75);

  const f = mapFloorRow({
    id: 'f-1',
    building_id: 'b-1',
    floor_number: 1,
    name: 'First Floor',
    display_order: 1,
    room_count: '5',
    total_measured_area: '810.5',
  });
  assert.equal(f.floorNumber, 1);
  assert.equal(f.roomCount, 5);
  assert.equal(f.totalMeasuredArea, 810.5);

  const r = mapRoomRow({
    id: 'r-1',
    floor_id: 'f-1',
    room_type_id: 'rt-1',
    room_type_name: 'Master Bathroom',
    name: 'Master Bathroom 1',
    display_order: 0,
    measurement_count: '4',
    floor_tile_area: '28',
    wall_tile_area: '130.2',
    total_measured_area: '158.2',
  });
  assert.equal(r.measurementCount, 4);
  assert.equal(r.totalMeasuredArea, 158.2);
});

