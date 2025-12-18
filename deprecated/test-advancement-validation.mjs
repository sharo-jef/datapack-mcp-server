#!/usr/bin/env node
import { validateDatapackJson } from './src/index.ts';

console.log('Testing VALID advancement...');
const validResult = await validateDatapackJson({
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
console.log('✅ Valid result:', validResult);

console.log('\nTesting INVALID advancement (missing trigger)...');
const invalidResult = await validateDatapackJson({
  type: 'advancement',
  version: '1.21.4',
  content: JSON.stringify({
    criteria: {
      tick: {}
    }
  })
});
console.log(invalidResult.valid ? '❌ Should be invalid!' : '✅ Correctly invalid:');
console.log(invalidResult);

console.log('\nTesting INVALID advancement (wrong field type)...');
const wrongTypeResult = await validateDatapackJson({
  type: 'advancement',
  version: '1.21.4',
  content: JSON.stringify({
    criteria: "should be object"
  })
});
console.log(wrongTypeResult.valid ? '❌ Should be invalid!' : '✅ Correctly invalid:');
console.log(wrongTypeResult);

process.exit(0);
