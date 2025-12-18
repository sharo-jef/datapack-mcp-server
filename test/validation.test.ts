import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateDatapackJson } from '../src/index.ts';

describe('Datapack JSON Validation', () => {
  describe('recipe', () => {
    it('should validate correct shaped recipe', async () => {
      const result = await validateDatapackJson({
        type: 'recipe',
        version: '1.20.4',
        content: JSON.stringify({
          type: 'minecraft:crafting_shaped',
          pattern: ['###', '# #', '###'],
          key: { '#': { item: 'minecraft:diamond' } },
          result: { item: 'minecraft:diamond_block', count: 1 }
        })
      });
      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('should reject recipe with wrong type', async () => {
      const result = await validateDatapackJson({
        type: 'recipe',
        version: '1.20.4',
        content: JSON.stringify({
          type: 123, // should be string
          pattern: ['###'],
          key: { '#': { item: 'minecraft:diamond' } },
          result: { item: 'minecraft:diamond_block' }
        })
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('loot_table', () => {
    it('should validate correct loot table', async () => {
      const result = await validateDatapackJson({
        type: 'loot_table',
        version: '1.20.4',
        content: JSON.stringify({
          type: 'minecraft:block',
          pools: [{
            rolls: 1,
            entries: [{ type: 'minecraft:item', name: 'minecraft:diamond' }]
          }]
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('should reject loot table with wrong structure', async () => {
      const result = await validateDatapackJson({
        type: 'loot_table',
        version: '1.20.4',
        content: JSON.stringify({
          pools: "should be array" // wrong type
        })
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('predicate', () => {
    it('should validate correct predicate', async () => {
      const result = await validateDatapackJson({
        type: 'predicate',
        version: '1.20.4',
        content: JSON.stringify({
          condition: 'minecraft:entity_properties',
          entity: 'this',
          predicate: { type: 'minecraft:player' }
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('advancement', () => {
    // SKIP: Spyglass has a bug where advancement criteria binding throws uncaughtException
    // "Cannot create the symbol map" which Node.js test runner detects as test failure.
    // The validation works correctly in standalone scripts (see deprecated/test-all-types.mjs)
    // but fails in test runner due to its uncaughtException monitoring.
    it.skip('should validate correct advancement', async () => {
      const result = await validateDatapackJson({
        type: 'advancement',
        version: '1.21.4',
        content: JSON.stringify({
          criteria: {
            tick: {
              trigger: 'minecraft:tick'
            }
          }
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('should reject advancement with wrong criteria type', async () => {
      const result = await validateDatapackJson({
        type: 'advancement',
        version: '1.20.4',
        content: JSON.stringify({
          criteria: "should be object"
        })
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    // Note: Spyglass limitation - deep field validation (like missing trigger) is not performed
  });

  describe('item_modifier', () => {
    it('should validate correct item modifier', async () => {
      const result = await validateDatapackJson({
        type: 'item_modifier',
        version: '1.20.4',
        content: JSON.stringify({
          function: 'minecraft:set_count',
          count: 1
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('text_component', () => {
    it('should validate correct text component', async () => {
      const result = await validateDatapackJson({
        type: 'text_component',
        version: '1.20.4',
        content: JSON.stringify({
          text: 'Hello, world!'
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('damage_type', () => {
    it('should validate correct damage type', async () => {
      const result = await validateDatapackJson({
        type: 'damage_type',
        version: '1.20.4',
        content: JSON.stringify({
          message_id: 'test',
          scaling: 'never',
          exhaustion: 0.0
        })
      });
      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('dimension_type', () => {
    it('should validate correct dimension type', async () => {
      const result = await validateDatapackJson({
        type: 'dimension_type',
        version: '1.20.4',
        content: JSON.stringify({
          ultrawarm: false,
          natural: true,
          coordinate_scale: 1.0,
          has_skylight: true,
          has_ceiling: false,
          ambient_light: 0.0,
          fixed_time: 6000,
          monster_spawn_light_level: 0,
          monster_spawn_block_light_limit: 0,
          piglin_safe: false,
          bed_works: true,
          respawn_anchor_works: false,
          has_raids: true,
          logical_height: 256,
          min_y: -64,
          height: 384,
          infiniburn: '#minecraft:infiniburn_overworld'
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('worldgen/placed_feature', () => {
    it('should validate correct placed feature', async () => {
      const result = await validateDatapackJson({
        type: 'worldgen/placed_feature',
        version: '1.20.4',
        content: JSON.stringify({
          feature: 'minecraft:oak',
          placement: []
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('tags', () => {
    it('should validate tag/block', async () => {
      const result = await validateDatapackJson({
        type: 'tag/block',
        version: '1.20.4',
        content: JSON.stringify({
          values: ['minecraft:stone', 'minecraft:dirt']
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('should validate tag/item', async () => {
      const result = await validateDatapackJson({
        type: 'tag/item',
        version: '1.20.4',
        content: JSON.stringify({
          values: ['minecraft:diamond']
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });

    it('should validate tag/entity_type', async () => {
      const result = await validateDatapackJson({
        type: 'tag/entity_type',
        version: '1.20.4',
        content: JSON.stringify({
          values: ['minecraft:zombie']
        })
      });
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  describe('error handling', () => {
    it('should reject invalid JSON syntax', async () => {
      const result = await validateDatapackJson({
        type: 'recipe',
        version: '1.20.4',
        content: '{ invalid json'
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it('should reject both version and packFormat', async () => {
      const result = await validateDatapackJson({
        type: 'recipe',
        version: '1.20.4',
        packFormat: 41,
        content: '{}'
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Cannot specify both')));
    });

    it('should reject missing version and packFormat', async () => {
      const result = await validateDatapackJson({
        type: 'recipe',
        content: '{}'
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('Must specify either')));
    });
  });

  describe('packFormat support', () => {
    it('should accept packFormat instead of version', async () => {
      const result = await validateDatapackJson({
        type: 'recipe',
        packFormat: 41, // 1.20.5+ format
        content: JSON.stringify({
          type: 'minecraft:crafting_shaped',
          pattern: ['###'],
          key: { '#': { item: 'minecraft:diamond' } },
          result: { id: 'minecraft:diamond_block', count: 1 }
        })
      });
      if (!result.valid) {
        console.error('Validation errors:', result.errors);
      }
      assert.equal(result.valid, true);
    });
  });
});
