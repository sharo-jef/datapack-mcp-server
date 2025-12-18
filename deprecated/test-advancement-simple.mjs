import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['--experimental-strip-types', 'src/index.ts'],
});

const client = new Client(
  {
    name: 'test-client',
    version: '1.0.0',
  },
  {
    capabilities: {},
  }
);

await client.connect(transport);

console.log('Testing VALID advancement...');
const validResult = await client.callTool('validate_datapack_json', {
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
console.log('✅ Valid result:', JSON.parse(validResult.content[0].text));

console.log('\nTesting INVALID advancement (missing trigger)...');
const invalidResult = await client.callTool('validate_datapack_json', {
  type: 'advancement',
  version: '1.21.4',
  content: JSON.stringify({
    criteria: {
      tick: {}
    }
  })
});
const invalidParsed = JSON.parse(invalidResult.content[0].text);
console.log(invalidParsed.valid ? '❌ Should be invalid!' : '✅ Correctly invalid:');
console.log(invalidParsed);

await client.close();
process.exit(0);
