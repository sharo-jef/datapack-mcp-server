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
console.log('Valid result:', validResult.content[0].text);

console.log('\nTesting INVALID advancement (missing trigger)...');
const invalidResult = await client.callTool('validate_datapack_json', {
  type: 'advancement',
  version: '1.21.4',
  content: JSON.stringify({
    criteria: {
      tick: {
        // missing trigger field
      }
    }
  })
});
console.log('Invalid result:', invalidResult.content[0].text);

console.log('\nTesting INVALID advancement (malformed JSON)...');
try {
  const malformedResult = await client.callTool('validate_datapack_json', {
    type: 'advancement',
    version: '1.21.4',
    content: '{ "criteria": { "tick": { invalid json'
  });
  console.log('Malformed result:', malformedResult.content[0].text);
} catch (error) {
  console.log('Malformed result: Error caught -', error.message);
}

console.log('\nTesting INVALID advancement (wrong field type)...');
const wrongTypeResult = await client.callTool('validate_datapack_json', {
  type: 'advancement',
  version: '1.21.4',
  content: JSON.stringify({
    criteria: "this should be an object"
  })
});
console.log('Wrong type result:', wrongTypeResult.content[0].text);

await client.close();
process.exit(0);
