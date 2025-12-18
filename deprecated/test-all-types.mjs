#!/usr/bin/env node
/**
 * Test all supported datapack types by importing the validation function directly
 */

import { validateDatapackJson } from '../src/index.ts';

const testCases = [
  {
    name: 'recipe',
    content: JSON.stringify({
      type: 'minecraft:crafting_shaped',
      pattern: ['###', '# #', '###'],
      key: { '#': { item: 'minecraft:diamond' } },
      result: { id: 'minecraft:diamond_block', count: 1 }
    })
  },
  {
    name: 'loot_table',
    content: JSON.stringify({
      type: 'minecraft:block',
      pools: [{
        rolls: 1,
        entries: [{ type: 'minecraft:item', name: 'minecraft:diamond' }]
      }]
    })
  },
  {
    name: 'predicate',
    content: JSON.stringify({
      condition: 'minecraft:entity_properties',
      entity: 'this',
      predicate: { type: 'minecraft:player' }
    })
  },
  {
    name: 'advancement',
    content: JSON.stringify({
      criteria: {
        tick: {
          trigger: 'minecraft:tick'
        }
      }
    })
  },
  {
    name: 'item_modifier',
    content: JSON.stringify({
      function: 'minecraft:set_count',
      count: 1
    })
  },
  {
    name: 'text_component',
    content: JSON.stringify({
      text: 'Hello World',
      color: 'red'
    })
  },
  {
    name: 'damage_type',
    content: JSON.stringify({
      message_id: 'test',
      scaling: 'when_caused_by_living_non_player',
      exhaustion: 0.1
    })
  },
  {
    name: 'dimension_type',
    content: JSON.stringify({
      ambient_light: 0.0,
      bed_works: true,
      coordinate_scale: 1.0,
      effects: 'minecraft:overworld',
      has_ceiling: false,
      has_raids: true,
      has_skylight: true,
      height: 384,
      infiniburn: '#minecraft:infiniburn_overworld',
      logical_height: 384,
      min_y: -64,
      monster_spawn_block_light_limit: 0,
      monster_spawn_light_level: 0,
      natural: true,
      piglin_safe: false,
      respawn_anchor_works: false,
      ultrawarm: false
    })
  },
  {
    name: 'worldgen/biome',
    content: JSON.stringify({
      has_precipitation: true,
      temperature: 0.8,
      downfall: 0.4,
      effects: {
        fog_color: 12638463,
        sky_color: 7907327,
        water_color: 4159204,
        water_fog_color: 329011
      }
    })
  },
  {
    name: 'worldgen/configured_feature',
    content: JSON.stringify({
      type: 'minecraft:tree',
      config: {
        trunk_provider: {
          type: 'minecraft:simple_state_provider',
          state: { Name: 'minecraft:oak_log' }
        },
        foliage_provider: {
          type: 'minecraft:simple_state_provider',
          state: { Name: 'minecraft:oak_leaves' }
        },
        trunk_placer: {
          type: 'minecraft:straight_trunk_placer',
          base_height: 4,
          height_rand_a: 2,
          height_rand_b: 0
        },
        foliage_placer: {
          type: 'minecraft:blob_foliage_placer',
          radius: 2,
          offset: 0,
          height: 3
        }
      }
    })
  },
  {
    name: 'worldgen/placed_feature',
    content: JSON.stringify({
      feature: 'minecraft:oak',
      placement: []
    })
  },
  {
    name: 'tags/block',
    content: JSON.stringify({
      values: ['minecraft:dirt', 'minecraft:grass_block']
    })
  },
  {
    name: 'tags/item',
    content: JSON.stringify({
      values: ['minecraft:diamond', 'minecraft:emerald']
    })
  },
  {
    name: 'tags/entity_type',
    content: JSON.stringify({
      values: ['minecraft:zombie', 'minecraft:skeleton']
    })
  }
];

// Test all types sequentially
for (const testCase of testCases) {
  console.log(`Testing ${testCase.name}...`);
  try {
    const result = await validateDatapackJson({
      type: testCase.name,
      content: testCase.content,
      packFormat: 48
    });
    
    if (result.valid) {
      console.log(`✅ ${testCase.name}: Valid`);
    } else {
      console.log(`❌ ${testCase.name}: Invalid`);
      result.errors.forEach(err => console.log(`   ${err}`));
    }
  } catch (error) {
    console.log(`❌ ${testCase.name}: Caught exception - ${error.message}`);
    console.error('Full error:', error);
  }
  console.log();
}

console.log('All tests completed.');
process.exit(0);
