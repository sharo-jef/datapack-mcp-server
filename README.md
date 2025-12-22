# Datapack MCP Server

> [!WARNING]
> This project was created using GitHub Copilot Chat's Agent mode. Please use with caution and verify the functionality thoroughly.

MCP (Model Context Protocol) Server for validating Minecraft datapack JSON files using Spyglass.

This server allows AI agents to validate Minecraft datapack JSON files (recipes, advancements, loot tables, predicates, etc.) against the official Minecraft data formats.

## Features

- ✅ Validates datapack JSON files using Spyglass' mcdoc type system
- 🎯 Supports all datapack JSON types (recipes, advancements, loot tables, predicates, etc.)
- 🔄 Supports any Minecraft version or pack format
- 🚀 Easy to use with MCP-compatible AI agents

## Installation

### Using npx (Recommended)

You can run this server directly from GitHub without installing:

```bash
npx github:sharo-jef/datapack-mcp-server
```

### Local Installation

```bash
git clone https://github.com/sharo-jef/datapack-mcp-server.git
cd datapack-mcp-server
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "datapack-validator": {
      "command": "npx",
      "args": ["-y", "github:sharo-jef/datapack-mcp-server"]
    }
  }
}
```

Or if you have it installed locally:

```json
{
  "mcpServers": {
    "datapack-validator": {
      "command": "node",
      "args": [
        "--experimental-strip-types",
        "/path/to/datapack-mcp-server/src/index.ts"
      ]
    }
  }
}
```

### With Other MCP Clients

Any MCP-compatible client can connect to this server using stdio transport.

## Tool: validate_datapack_json

Validates Minecraft datapack JSON files.

### Parameters

- `type` (required): The type of datapack file
  - Supported types: `advancement`, `loot_table`, `predicate`, `item_modifier`, `recipe`, `text_component`, `chat_type`, `damage_type`, `dialog`, `dimension`, `dimension_type`, `worldgen/biome`, `worldgen/carver`, `worldgen/configured_feature`, `worldgen/placed_feature`, `worldgen/density_function`, `worldgen/noise`, `worldgen/noise_settings`, `worldgen/structure`, `worldgen/structure_set`, `worldgen/template_pool`, `tags/block`, `tags/item`, `tags/entity_type`, `tags/function`
- `content` (required): The JSON content to validate (as a string, must be valid JSON parseable by JSON.parse)
- `version` (optional): Minecraft version (e.g., `1.21.11`)
- `packFormat` (optional): Data pack format number (e.g., `48` for 1.21.4-1.21.11)
  - Prefer `packFormat` over `version` when available - it is more precise as multiple Minecraft versions can share the same pack format

**Note**: Either `version` or `packFormat` must be specified.

### Example Usage

```typescript
// Example request from an AI agent
{
  "type": "recipe",
  "content": "{\"type\":\"minecraft:crafting_shaped\",\"pattern\":[\"###\",\"# #\",\"###\"],\"key\":{\"#\":{\"item\":\"minecraft:stick\"}},\"result\":{\"item\":\"minecraft:chest\"}}",
  "version": "1.21.11"
}
```

### Response

**Valid JSON**:

```
✓ Valid recipe JSON for Minecraft 1.21.11
```

**Invalid JSON**:

```
✗ Invalid recipe JSON:

error 1:1 Unknown property 'invalid_field'
error 5:10 Expected string, got number
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Run Locally

```bash
npm start
```

### Test

```bash
npm test
```

## Technical Details

This server uses:

- **Spyglass**: For JSON validation against Minecraft's mcdoc type system
  - [@spyglassmc/core](https://www.npmjs.com/package/@spyglassmc/core)
  - [@spyglassmc/java-edition](https://www.npmjs.com/package/@spyglassmc/java-edition)
  - [@spyglassmc/json](https://www.npmjs.com/package/@spyglassmc/json)
  - [@spyglassmc/mcdoc](https://www.npmjs.com/package/@spyglassmc/mcdoc)
  - [@spyglassmc/nbt](https://www.npmjs.com/package/@spyglassmc/nbt)
  - [@spyglassmc/locales](https://www.npmjs.com/package/@spyglassmc/locales)
- **MCP SDK**: For Model Context Protocol support ([@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk))
- **TypeScript**: Native execution in Node.js v20.10.0+

The validation logic is based on [misode/misode.github.io](https://github.com/misode/misode.github.io)'s Spyglass integration.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project includes code based on [misode/misode.github.io](https://github.com/misode/misode.github.io), which is also licensed under the MIT License.

## Credits

- [Spyglass](https://github.com/SpyglassMC/Spyglass) - The validation engine
- [misode](https://github.com/misode) - For mcmeta data and Spyglass integration code
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
