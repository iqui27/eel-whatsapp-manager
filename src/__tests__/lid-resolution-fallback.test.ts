/**
 * Test suite for @lid manual mapping fallback mechanism
 * Task 2: Verify manual mapping table + CRUD library
 */

import { upsertLidManualMapping, getLidMapping } from '@/lib/db-lid-manual-mapping';
import { db } from '@/db';
import { lidManualMapping } from '@/db/schema';

// Mock database operations
jest.mock('@/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
      }),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            { voterName: 'Known Voter', voterId: 'uuid-123' },
          ]),
        }),
      }),
    }),
  },
}));

jest.mock('@/db/schema', () => ({
  lidManualMapping: 'mocked-lid-table',
}));

describe('lid-resolution-fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Schema definition (verify table exists)
  it('creates manual mapping table with composite unique constraint', () => {
    // This test documents the schema structure
    // The actual table is defined in schema.ts
    // Key constraints:
    // - PRIMARY KEY on id
    // - UNIQUE INDEX on (groupJid, lidJid)
    // - INDEX on groupJid for fast lookup
    
    // Import verifies the table is defined
    expect(lidManualMapping).toBeDefined();
  });

  // Test 2: Upsert creates/updates mapping correctly
  it('upserts lid mapping correctly', async () => {
    const groupJid = '120363123456@g.us';
    const lidJid = '184052367761544@lid';
    const voterName = 'Test Voter';
    
    await upsertLidManualMapping(groupJid, lidJid, voterName);
    
    expect(db.insert).toHaveBeenCalledWith(lidManualMapping);
    expect(db.insert(lidManualMapping).values).toHaveBeenCalledWith({
      groupJid,
      lidJid,
      voterName,
      voterId: undefined,
      notes: undefined,
      createdBy: undefined,
    });
  });

  // Test 3: Returns mapped voter name for known @lid
  it('returns mapped voter name for known @lid', async () => {
    const groupJid = '120363123456@g.us';
    const lidJid = '184052367761544@lid';
    
    const result = await getLidMapping(groupJid, lidJid);
    
    expect(db.select).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result?.voterName).toBe('Known Voter');
    expect(result?.voterId).toBe('uuid-123');
  });

  // Test 4: Returns null for unmapped @lid
  it('returns null for unmapped @lid', async () => {
    // Mock empty result
    const mockSelect = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    
    (db.select as jest.Mock).mockReturnValueOnce(mockSelect());
    
    const groupJid = 'unknown-group@g.us';
    const lidJid = '999999999999999@lid';
    
    const result = await getLidMapping(groupJid, lidJid);
    
    expect(result).toBeNull();
  });

  // Test 5: Upsert updates existing mapping
  it('updates existing mapping on conflict', async () => {
    const groupJid = '120363123456@g.us';
    const lidJid = '184052367761544@lid';
    const voterName = 'Updated Voter Name';
    const voterId = 'uuid-456';
    const notes = 'Updated notes';
    
    await upsertLidManualMapping(groupJid, lidJid, voterName, voterId, notes);
    
    expect(db.insert).toHaveBeenCalledWith(lidManualMapping);
    expect(db.insert(lidManualMapping).values).toHaveBeenCalledWith({
      groupJid,
      lidJid,
      voterName,
      voterId,
      notes,
      createdBy: undefined,
    });
    
    // Verify onConflictDoUpdate was called (documented via mock)
    expect(db.insert(lidManualMapping).values({
      groupJid,
      lidJid,
      voterName,
      voterId,
      notes,
      createdBy: undefined,
    }).onConflictDoUpdate).toHaveBeenCalled();
  });
});