#!/usr/bin/env node

/**
 * MCP Server for validating Minecraft datapack JSON files using Spyglass
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as core from "@spyglassmc/core";
import * as je from "@spyglassmc/java-edition";
import { ReleaseVersion } from "@spyglassmc/java-edition/lib/dependency/index.js";
import * as json from "@spyglassmc/json";
import { localize } from "@spyglassmc/locales";
import * as mcdoc from "@spyglassmc/mcdoc";
import * as nbt from "@spyglassmc/nbt";
import { z } from "zod";

const mcmetaUrl = "https://raw.githubusercontent.com/misode/mcmeta";
const vanillaMcdocUrl =
	"https://raw.githubusercontent.com/SpyglassMC/vanilla-mcdoc";

// Utility functions from sample-script.js

async function fetchJson(url: string): Promise<unknown> {
	const res = await fetch(url);
	if (!res.ok)
		throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
	return await res.json();
}

function mcmetaBase(ref: string, kind: string): string {
	return `${mcmetaUrl}/${ref}-${kind}`;
}

async function fetchVanillaMcdoc(): Promise<unknown> {
	return await fetchJson(`${vanillaMcdocUrl}/generated/symbols.json`);
}

async function fetchRegistries(ref: string): Promise<Map<string, string[]>> {
	const data = (await fetchJson(
		`${mcmetaBase(ref, "summary")}/registries/data.min.json`,
	)) as Record<string, string[]>;
	const result = new Map<string, string[]>();
	for (const id in data) {
		result.set(
			id,
			data[id].map((e: string) => `minecraft:${e}`),
		);
	}
	return result;
}

async function fetchBlockStates(ref: string): Promise<Map<string, unknown>> {
	const data = (await fetchJson(
		`${mcmetaBase(ref, "summary")}/blocks/data.min.json`,
	)) as Record<string, unknown>;
	const result = new Map();
	for (const id in data) {
		result.set(id, data[id]);
	}
	return result;
}

async function fetchVersions(refForSummary = "summary"): Promise<unknown[]> {
	return (await fetchJson(
		`${mcmetaUrl}/${refForSummary}/versions/data.min.json`,
	)) as unknown[];
}

const VanillaMcdocUri = "mcdoc://vanilla-mcdoc/symbols.json";

// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
function vanillaMcdocRegistrar(vanillaMcdoc: any) {
	// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
	return (symbols: any) => {
		for (const [id, typeDef] of Object.entries(vanillaMcdoc.mcdoc ?? {})) {
			symbols.query(VanillaMcdocUri, "mcdoc", id).enter({
				data: { data: { typeDef } },
				usage: { type: "declaration" },
			});
		}
		for (const [dispatcher, ids] of Object.entries(
			vanillaMcdoc["mcdoc/dispatcher"] ?? {},
		)) {
			symbols
				.query(VanillaMcdocUri, "mcdoc/dispatcher", dispatcher)
				.enter({ usage: { type: "declaration" } })
				.onEach(
					// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
					Object.entries(ids as any),
					// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
					([memberId, typeDef]: any, query: any) => {
						// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
						query.member(memberId, (memberQuery: any) => {
							memberQuery.enter({
								data: { data: { typeDef } },
								usage: { type: "declaration" },
							});
						});
					},
				);
		}
	};
}

// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
function registerAttributes(meta: any, release: string, versions: any[]): void {
	mcdoc.runtime.registerAttribute(
		meta,
		"since",
		mcdoc.runtime.attribute.validator.string,
		{
			// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
			filterElement: (config: string, ctx: any) => {
				if (!config.startsWith("1.")) {
					ctx.logger.warn(`Invalid mcdoc attribute for "since": ${config}`);
					return true;
				}
				// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
				return ReleaseVersion.cmp(release as any, config as any) >= 0;
			},
		},
	);
	mcdoc.runtime.registerAttribute(
		meta,
		"until",
		mcdoc.runtime.attribute.validator.string,
		{
			// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
			filterElement: (config: string, ctx: any) => {
				if (!config.startsWith("1.")) {
					ctx.logger.warn(`Invalid mcdoc attribute for "until": ${config}`);
					return true;
				}
				// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
				return ReleaseVersion.cmp(release as any, config as any) < 0;
			},
		},
	);
	mcdoc.runtime.registerAttribute(
		meta,
		"deprecated",
		mcdoc.runtime.attribute.validator.optional(
			mcdoc.runtime.attribute.validator.string,
		),
		{
			// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
			mapField: (config: string | undefined, field: any, ctx: any) => {
				if (config === undefined) {
					return { ...field, deprecated: true };
				}
				if (!config.startsWith("1.")) {
					ctx.logger.warn(
						`Invalid mcdoc attribute for "deprecated": ${config}`,
					);
					return field;
				}
				// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
				if (ReleaseVersion.cmp(release as any, config as any) >= 0) {
					return { ...field, deprecated: true };
				}
				return field;
			},
		},
	);
	const maxPackFormat = versions?.[0]?.data_pack_version ?? 0;
	mcdoc.runtime.registerAttribute(meta, "pack_format", () => undefined, {
		// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
		checker: (_: any, typeDef: any) => {
			if (
				typeDef.kind !== "literal" ||
				typeof typeDef.value.value !== "number"
			) {
				return undefined;
			}
			const target = typeDef.value.value;
			// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
			return (node: any, ctx: any) => {
				if (target > maxPackFormat) {
					ctx.err.report(
						localize(
							"expected",
							localize(
								"mcdoc.runtime.checker.range.number",
								localize(
									"mcdoc.runtime.checker.range.right-inclusive",
									maxPackFormat,
								),
							),
						),
						node,
						3,
					);
				}
			};
		},
	});
}

// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
async function resolveNodeExternals(): Promise<any> {
	const candidates = [
		"@spyglassmc/core/lib/nodejs.js",
		"@spyglassmc/core/lib/node.js",
		"@spyglassmc/core/lib/node/index.js",
	];
	for (const spec of candidates) {
		try {
			const mod = await import(spec);
			if (mod?.NodeJsExternals) return mod.NodeJsExternals;
			if (mod?.NodeExternals) return mod.NodeExternals;
			if (mod?.default) return mod.default;
		} catch {
			// ignore
		}
	}
	throw new Error("Cannot find Node externals for @spyglassmc/core.");
}

// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
function formatError(e: any): string {
	const r = e.range;
	let start = "unknown";
	if (
		r?.start &&
		typeof r.start.line === "number" &&
		typeof r.start.character === "number"
	) {
		start = `${r.start.line + 1}:${r.start.character + 1}`;
	}
	const sev = e.severity === 3 ? "error" : e.severity === 2 ? "warn" : "info";
	return `${sev} ${start} ${e.message}`;
}

interface ValidationOptions {
	version?: string;
	packFormat?: number | string;
	type: string;
	content: string;
}

export async function validateDatapackJson(
	options: ValidationOptions,
): Promise<{
	valid: boolean;
	errors: string[];
}> {
	let baseDir: string | undefined;
	try {
		let { version, packFormat, type, content } = options;

		if (version && packFormat) {
			return {
				valid: false,
				errors: ["Cannot specify both version and packFormat"],
			};
		}

		if (!version && !packFormat) {
			return {
				valid: false,
				errors: ["Must specify either version or packFormat"],
			};
		}

		// Resolve pack format to version if needed
		if (packFormat !== undefined) {
			const versions = await fetchVersions();
			let packFormatMajor: number;
			let packFormatMinor: number;

			// Parse pack format (supports "94.1", "94", 94.1, and 94)
			const packFormatStr = String(packFormat);
			const parts = packFormatStr.split(".").map(Number);
			if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) {
				return {
					valid: false,
					errors: [
						`Invalid pack format: ${packFormat}. Expected format like "94" or "94.1"`,
					],
				};
			}
			packFormatMajor = parts[0];
			packFormatMinor = parts[1] ?? 0;

			const match = versions.find(
				// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
				(v: any) =>
					v.data_pack_version === packFormatMajor &&
					(v.data_pack_version_minor ?? 0) === packFormatMinor,
			);
			if (!match) {
				return {
					valid: false,
					errors: [`No version found for pack format ${packFormat}`],
				};
			}
			// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
			version = (match as any).id;
		}

		if (!version) {
			return { valid: false, errors: ["Version could not be determined"] };
		}

		baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "datapack-mcp-"));
		const rootDir = path.join(baseDir, "root");
		const cacheDir = path.join(baseDir, "cache");
		await fs.mkdir(rootDir, { recursive: true });
		await fs.mkdir(cacheDir, { recursive: true });

		const rootUri = pathToFileURL(
			rootDir + path.sep,
		).toString() as `${string}/`;
		const cacheUri = pathToFileURL(
			cacheDir + path.sep,
		).toString() as `${string}/`;

		// Create a minimal pack structure
		const packMcmeta = JSON.stringify({
			pack: {
				pack_format: packFormat || 48,
				description: "Validation pack",
			},
		});
		await fs.writeFile(path.join(rootDir, "pack.mcmeta"), packMcmeta);

		const NodeExternals = await resolveNodeExternals();

		// Silent logger to avoid stderr output interfering with MCP protocol
		const silentLogger = {
			log: () => {},
			info: () => {},
			warn: () => {},
			error: () => {},
		};

		const service = new core.Service({
			logger: silentLogger,
			project: {
				cacheRoot: cacheUri,
				projectRoots: [rootUri],
				externals: NodeExternals,
				defaultConfig: core.ConfigService.merge(core.VanillaConfig, {
					env: {
						gameVersion: version,
						dependencies: [],
					},
				}),
				initializers: [
					mcdoc.initialize,
					// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
					async (ctx: any) => {
						const { config, meta } = ctx;

						const vanillaMcdoc = await fetchVanillaMcdoc();
						meta.registerSymbolRegistrar("vanilla-mcdoc", {
							// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
							checksum: (vanillaMcdoc as any).ref ?? "unknown",
							registrar: vanillaMcdocRegistrar(vanillaMcdoc),
						});

						// Register custom URI binder to handle advancement parent symbols
						// This fixes the Spyglass bug where criterion symbols need a parent advancement symbol
						// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
						const originalUriBinder = je.binder.uriBinder as any;
						// biome-ignore lint/suspicious/noExplicitAny: uri and ctx parameters from External Spyglass API
						meta.registerUriBinder(async (uri: any, ctx: any) => {
							// Check if this is an advancement file
							const match =
								/^(.+?)\/data\/([^/]+)\/advancement(?:s)?\/(.+)\.json$/.exec(
									uri,
								);
							if (match) {
								const namespace = match[2];
								const identifier = match[3];
								const advancementId = `${namespace}:${identifier}`;

								// Pre-register the advancement parent symbol so criterion can reference it
								try {
									ctx.symbols.query(uri, "advancement", advancementId).enter({
										usage: { type: "definition" as const },
									});
								} catch (_error) {
									// Ignore errors during parent symbol registration
								}
							}

							// Call original binder
							return await originalUriBinder(uri, ctx);
						});

						const versions = await fetchVersions();
						const release = config.env.gameVersion;

						const summary = {
							registries: Object.fromEntries(
								(await fetchRegistries(version as string)).entries(),
							),
							blocks: Object.fromEntries(
								[...(await fetchBlockStates(version as string)).entries()].map(
									([id, data]) => [id, data],
								),
							) as je.dependency.McmetaStates,
							fluids: je.dependency.Fluids,
							commands: { type: "root" as const, children: {} },
						};

						meta.registerSymbolRegistrar("mcmeta-summary", {
							checksum: String(version),
							registrar: je.dependency.symbolRegistrar(summary, release),
						});

						registerAttributes(meta, release, versions);

						json.getInitializer()(ctx);
						je.json.initialize(ctx);
						je.mcf.initialize(ctx, summary.commands, release);
						nbt.initialize(ctx);

						return { loadedVersion: release };
					},
				],
			},
		});

		// Track binding errors from Spyglass advancement criteria bug
		let _bindingError: Error | null = null;

		// Handle both uncaught exceptions and unhandled rejections
		const uncaughtHandler = (error: Error) => {
			if (error.message.includes("Cannot create the symbol map")) {
				_bindingError = error;
				// Silently ignore - this is the known Spyglass bug
			}
		};

		// biome-ignore lint/suspicious/noExplicitAny: External Spyglass API uses any
		const rejectionHandler = (reason: any) => {
			const error =
				reason instanceof Error ? reason : new Error(String(reason));
			if (error.message.includes("Cannot create the symbol map")) {
				_bindingError = error;
				// Silently ignore - this is the known Spyglass bug
			}
		};

		process.on("uncaughtException", uncaughtHandler);
		process.on("unhandledRejection", rejectionHandler);

		await service.project.ready();

		// For Minecraft < 1.21, certain types need 's' suffix (e.g. 'advancement' -> 'advancements')
		const legacyTypes = new Set([
			"loot_table",
			"predicate",
			"item_modifier",
			"advancement",
			"recipe",
			"tag/function",
			"tag/item",
			"tag/block",
			"tag/fluid",
			"tag/entity_type",
			"tag/game_event",
		]);
		// Parse version to check if it's >= 1.21
		const versionParts = version?.split(".").map(Number);
		const isLegacyVersion = versionParts[0] === 1 && versionParts[1] < 21;
		const useLegacyPath = isLegacyVersion && legacyTypes.has(type);
		const pathType = useLegacyPath ? `${type}s` : type;

		const docUri = new URL(
			`unsaved/data/minecraft/${pathType}/test.json`,
			rootUri,
		).toString();

		try {
			await service.project.onDidOpen(docUri, "json", 1, content);
		} catch (error) {
			await service.project.close();
			await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {});
			return {
				valid: false,
				errors: [
					`Failed to open document: ${error instanceof Error ? error.message : String(error)}`,
				],
			};
		}

		// biome-ignore lint/suspicious/noExplicitAny: Spyglass types are not properly exported
		let docAndNode: { doc: any; node: any } | undefined;
		try {
			docAndNode = await service.project.ensureClientManagedChecked(docUri);
		} catch (error) {
			await service.project.close();
			await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {});
			return {
				valid: false,
				errors: [
					`Validation error: ${error instanceof Error ? error.message : String(error)}`,
				],
			};
		}

		if (!docAndNode) {
			await service.project.close();
			await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {});
			return {
				valid: false,
				errors: [
					"Failed to parse/check document - invalid JSON syntax or structure",
				],
			};
		}

		// Get all errors from the FileNode (includes parser errors and checker errors)
		// ensureClientManagedChecked already performed all checking, so we just extract the results
		const errors = core.FileNode.getErrors(docAndNode.node);

		await service.project.close();
		await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {});

		// Clean up error handlers
		process.off("uncaughtException", uncaughtHandler);
		process.off("unhandledRejection", rejectionHandler);

		// Note: bindingError tracks the Spyglass bug but doesn't affect validation
		// We rely solely on the checker's error list for validation results

		return {
			valid: errors.length === 0,
			errors: errors.map(formatError),
		};
	} catch (error) {
		// Cleanup on any error
		if (baseDir) {
			try {
				await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {});
			} catch {}
		}

		return {
			valid: false,
			errors: [
				`Validation error: ${error instanceof Error ? error.message : String(error)}`,
			],
		};
	}
}

// MCP Server

const server = new McpServer({
	name: "datapack-mcp-server",
	version: "1.0.0",
});

server.registerTool(
	"validate_datapack_json",
	{
		description:
			"REQUIRED: Always use this tool to validate ANY Minecraft datapack JSON before showing it to the user or saving it. This validates JSON structure and values against Minecraft's official specifications using Spyglass. Supports all datapack types: recipes, advancements, loot tables, predicates, worldgen files, tags, and more. DO NOT skip validation - invalid JSON will cause errors in Minecraft.",
		inputSchema: {
			type: z.string().describe(
				"The type of datapack file. Supported types: loot_table, predicate, item_modifier, advancement, recipe, text_component, chat_type, damage_type, dialog, dimension, dimension_type, worldgen/biome, worldgen/carver, worldgen/configured_feature, worldgen/placed_feature, worldgen/density_function, worldgen/noise, worldgen/noise_settings, worldgen/structure, worldgen/structure_set, worldgen/template_pool, tags/block, tags/item, tags/entity_type, tags/function",
			),
			content: z
				.string()
				.describe(
					"The JSON content to validate as a string (must be valid JSON parseable by JSON.parse)",
				),
			version: z
				.string()
				.optional()
				.describe(
					"Minecraft version (e.g., 1.21.11). Use this when you know the specific Minecraft version. Either version or packFormat must be specified.",
				),
			packFormat: z
				.union([z.number(), z.string()])
				.optional()
				.describe(
					'Data pack format (e.g., 48, "94.1" for 1.21.11). Supports both integer (major version only) and string format ("major.minor"). PREFER this over version when available - it is more precise as multiple Minecraft versions can share the same pack format. Either version or packFormat must be specified.',
				),
		},
	},
	async (args) => {
		const { type, content, version, packFormat } = args;

		const result = await validateDatapackJson({
			type,
			content,
			version,
			packFormat,
		});

		if (result.valid) {
			return {
				content: [
					{
						type: "text" as const,
						text: `✓ Valid ${type} JSON for Minecraft ${version || `pack format ${packFormat}`}`,
					},
				],
			};
		}
		return {
			content: [
				{
					type: "text" as const,
					text: `✗ Invalid ${type} JSON:\n\n${result.errors.join("\n")}`,
				},
			],
			isError: true,
		};
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Datapack MCP Server running on stdio");
}

// Start the server only if not running in test mode
// Set NO_SERVER_START=1 environment variable to prevent server startup (e.g., in tests)
if (process.env.NO_SERVER_START !== "1") {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
