# Datapack MCP Server

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
  - Examples: `recipe`, `advancement`, `loot_table`, `predicate`, `item_modifier`, `function`, etc.
- `content` (required): The JSON content to validate (as a string)
- `version` (optional): Minecraft version (e.g., `1.21.11`)
- `packFormat` (optional): Data pack format number (e.g., `48` for 1.21.4-1.21.11)

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

## Technical Details

This server uses:

- **Spyglass**: For JSON validation against Minecraft's mcdoc type system
- **MCP SDK**: For Model Context Protocol support
- **TypeScript**: Native execution in Node.js v24.4.1+

The validation logic is based on [misode/misode.github.io](https://github.com/misode/misode.github.io)'s Spyglass integration.

## Credits

- [Spyglass](https://github.com/SpyglassMC/Spyglass) - The validation engine
- [misode](https://github.com/misode) - For mcmeta data and inspiration
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
