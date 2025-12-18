#!/usr/bin/env node
/**
 * ** THIS FILE MIGHT BE INVALID AS IT IS AUTO-GENERATED. **
 *
 * Minimal Spyglass CLI validator for misode.github.io
 *
 * Validates a JSON file against Spyglass' mcdoc + mcmeta symbol registrars for a given Minecraft version.
 * This is NOT JSON Schema; it's Spyglass' type system (mcdoc) validation.
 *
 * Prereqs:
 *   npm ci
 *
 * Usage:
 *   node spyglass-validate.mjs --version 1.21.11 --type recipe --input path/to/recipe.json
 *   node spyglass-validate.mjs --version 1.21.11 --type recipe --input - < recipe.json
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import * as core from '@spyglassmc/core'
import * as je from '@spyglassmc/java-edition'
import { ReleaseVersion } from '@spyglassmc/java-edition/lib/dependency/index.js'
import * as json from '@spyglassmc/json'
import { localize } from '@spyglassmc/locales'
import * as mcdoc from '@spyglassmc/mcdoc'
import * as nbt from '@spyglassmc/nbt'

const mcmetaUrl = 'https://raw.githubusercontent.com/misode/mcmeta'
const vanillaMcdocUrl = 'https://raw.githubusercontent.com/SpyglassMC/vanilla-mcdoc'

function parseArgs(argv) {
	const out = { _: [] }
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i]
		if (!a.startsWith('-')) {
			out._.push(a)
			continue
		}
		if (a === '--help' || a === '-h') { out.help = true; continue }
		const key = a.replace(/^--?/, '')
		const next = argv[i + 1]
		// Special case: '-' is a valid value (stdin)
		if (next === undefined || (next.startsWith('-') && next !== '-')) {
			out[key] = true
			continue
		}
		out[key] = next
		i += 1
	}
	return out
}

function printHelp() {
	process.stdout.write(`\
Usage:
  node spyglass-validate.mjs --version <release> --type <generatorId> --input <file|->
  node spyglass-validate.mjs --pack-format <number> --type <generatorId> --input <file|->

Examples:
  node spyglass-validate.mjs --version 1.21.11 --type recipe --input recipe.json
  node spyglass-validate.mjs --pack-format 48 --type recipe --input recipe.json
  node spyglass-validate.mjs --version 1.21.11 --type recipe --input - < recipe.json

Notes:
  - --type corresponds to generator id/category, e.g. recipe, advancement, loot_table, predicate
  - --pack-format uses the data pack format number (e.g. 48 for 1.21.4-1.21.11)
  - If multiple versions share the same pack format, the latest is used
  - This uses Spyglass mcdoc validation (not JSON Schema).
`)
}

async function fetchJson(url) {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
	return await res.json()
}

function mcmetaBase(ref, kind) {
	return `${mcmetaUrl}/${ref}-${kind}`
}

async function fetchVanillaMcdoc() {
	return await fetchJson(`${vanillaMcdocUrl}/generated/symbols.json`)
}

async function fetchRegistries(ref) {
	const data = await fetchJson(`${mcmetaBase(ref, 'summary')}/registries/data.min.json`)
	const result = new Map()
	for (const id in data) {
		result.set(id, data[id].map((e) => 'minecraft:' + e))
	}
	return result
}

async function fetchBlockStates(ref) {
	const data = await fetchJson(`${mcmetaBase(ref, 'summary')}/blocks/data.min.json`)
	const result = new Map()
	for (const id in data) {
		result.set(id, data[id])
	}
	return result
}

async function fetchVersions(refForSummary = 'summary') {
	// matches DataFetcher.fetchVersions() url shape but for a specific ref we can just hit summary
	return await fetchJson(`${mcmetaUrl}/${refForSummary}/versions/data.min.json`)
}

const VanillaMcdocUri = 'mcdoc://vanilla-mcdoc/symbols.json'

function vanillaMcdocRegistrar(vanillaMcdoc) {
	return (symbols) => {
		for (const [id, typeDef] of Object.entries(vanillaMcdoc.mcdoc ?? {})) {
			symbols.query(VanillaMcdocUri, 'mcdoc', id).enter({
				data: { data: { typeDef } },
				usage: { type: 'declaration' },
			})
		}
		for (const [dispatcher, ids] of Object.entries(vanillaMcdoc['mcdoc/dispatcher'] ?? {})) {
			symbols.query(VanillaMcdocUri, 'mcdoc/dispatcher', dispatcher)
				.enter({ usage: { type: 'declaration' } })
				.onEach(Object.entries(ids), ([memberId, typeDef], query) => {
					query.member(memberId, (memberQuery) => {
						memberQuery.enter({
							data: { data: { typeDef } },
							usage: { type: 'declaration' },
						})
					})
				})
		}
	}
}

// Duplicated from src/app/services/Spyglass.ts (minimal)
function registerAttributes(meta, release, versions) {
	mcdoc.runtime.registerAttribute(meta, 'since', mcdoc.runtime.attribute.validator.string, {
		filterElement: (config, ctx) => {
			if (!config.startsWith('1.')) {
				ctx.logger.warn(`Invalid mcdoc attribute for "since": ${config}`)
				return true
			}
			return ReleaseVersion.cmp(release, config) >= 0
		},
	})
	mcdoc.runtime.registerAttribute(meta, 'until', mcdoc.runtime.attribute.validator.string, {
		filterElement: (config, ctx) => {
			if (!config.startsWith('1.')) {
				ctx.logger.warn(`Invalid mcdoc attribute for "until": ${config}`)
				return true
			}
			return ReleaseVersion.cmp(release, config) < 0
		},
	})
	mcdoc.runtime.registerAttribute(
		meta,
		'deprecated',
		mcdoc.runtime.attribute.validator.optional(mcdoc.runtime.attribute.validator.string),
		{
			mapField: (config, field, ctx) => {
				if (config === undefined) {
					return { ...field, deprecated: true }
				}
				if (!config.startsWith('1.')) {
					ctx.logger.warn(`Invalid mcdoc attribute for "deprecated": ${config}`)
					return field
				}
				if (ReleaseVersion.cmp(release, config) >= 0) {
					return { ...field, deprecated: true }
				}
				return field
			},
		},
	)
	const maxPackFormat = versions?.[0]?.data_pack_version ?? 0
	mcdoc.runtime.registerAttribute(meta, 'pack_format', () => undefined, {
		checker: (_, typeDef) => {
			if (typeDef.kind !== 'literal' || typeof typeDef.value.value !== 'number') {
				return undefined
			}
			const target = typeDef.value.value
			return (node, ctx) => {
				if (target > maxPackFormat) {
					ctx.err.report(
						localize(
							'expected',
							localize(
								'mcdoc.runtime.checker.range.number',
								localize('mcdoc.runtime.checker.range.right-inclusive', maxPackFormat),
							),
						),
						node,
						3,
					)
				}
			}
		},
	})
}

async function resolveNodeExternals() {
	// @spyglassmc/core 0.4.x uses nodejs.js as the Node.js entry point.
	const candidates = [
		'@spyglassmc/core/lib/nodejs.js',
		'@spyglassmc/core/lib/node.js',
		'@spyglassmc/core/lib/node/index.js',
	]
	for (const spec of candidates) {
		try {
			// eslint-disable-next-line no-await-in-loop
			const mod = await import(spec)
			if (mod?.NodeJsExternals) return mod.NodeJsExternals
			if (mod?.NodeExternals) return mod.NodeExternals
			if (mod?.default) return mod.default
		} catch {
			// ignore
		}
	}
	throw new Error('Cannot find Node externals for @spyglassmc/core. Try updating @spyglassmc/core or provide a NodeJsExternals export.')
}

function formatError(e) {
	const r = e.range
	const start = `${r.start.line + 1}:${r.start.character + 1}`
	const sev = e.severity === 3 ? 'error' : e.severity === 2 ? 'warn' : 'info'
	return `${sev} ${start} ${e.message}`
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	if (args.help) {
		printHelp()
		return
	}
	
	let version = args.version
	const packFormat = args['pack-format']
	const type = args.type
	const input = args.input
	
	if (version && packFormat) {
		throw new Error('Cannot specify both --version and --pack-format')
	}
	
	if (!version && !packFormat) {
		printHelp()
		throw new Error('Missing required arg: --version or --pack-format')
	}
	
	// Resolve pack format to version if needed
	if (packFormat) {
		const versions = await fetchVersions()
		const packFormatNum = parseInt(packFormat, 10)
		if (isNaN(packFormatNum)) {
			throw new Error(`Invalid pack format: ${packFormat}`)
		}
		const match = versions.find((v) => v.data_pack_version === packFormatNum)
		if (!match) {
			throw new Error(`No version found for pack format ${packFormatNum}`)
		}
		version = match.id
		process.stdout.write(`[Using version ${version} for pack format ${packFormatNum}]\n`)
	}
	
	if (!type || !input) {
		printHelp()
		throw new Error('Missing required args: --type, --input')
	}

	let text
	if (input === '-') {
		// Read from stdin
		const chunks = []
		for await (const chunk of process.stdin) {
			chunks.push(chunk)
		}
		text = Buffer.concat(chunks).toString('utf8')
	} else {
		text = await fs.readFile(path.resolve(input), 'utf8')
	}

	const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'misode-spyglass-cli-'))
	const rootDir = path.join(baseDir, 'root')
	const cacheDir = path.join(baseDir, 'cache')
	await fs.mkdir(rootDir, { recursive: true })
	await fs.mkdir(cacheDir, { recursive: true })

	const rootUri = pathToFileURL(rootDir + path.sep).toString()
	const cacheUri = pathToFileURL(cacheDir + path.sep).toString()

	const NodeExternals = await resolveNodeExternals()

	const service = new core.Service({
		logger: console,
		project: {
			cacheRoot: cacheUri,
			projectRoots: [rootUri],
			externals: NodeExternals,
			defaultConfig: core.ConfigService.merge(core.VanillaConfig, {
				env: {
					gameVersion: version,
					dependencies: [],
					customResources: {
						[type]: { category: type, pack: 'data' },
					},
				},
			}),
			initializers: [mcdoc.initialize, async (ctx) => {
				const { config, meta } = ctx
				const vanillaMcdoc = await fetchVanillaMcdoc()
				meta.registerSymbolRegistrar('vanilla-mcdoc', {
					checksum: vanillaMcdoc.ref ?? 'unknown',
					registrar: vanillaMcdocRegistrar(vanillaMcdoc),
				})

				const versions = await fetchVersions()
				const release = config.env.gameVersion

				const summary = {
					registries: Object.fromEntries((await fetchRegistries(version)).entries()),
					blocks: Object.fromEntries([...(await fetchBlockStates(version)).entries()].map(([id, data]) => [id, data])),
					fluids: je.dependency.Fluids,
					commands: { type: 'root', children: {} },
				}

				meta.registerSymbolRegistrar('mcmeta-summary', {
					checksum: String(version),
					registrar: je.dependency.symbolRegistrar(summary, release),
				})

				registerAttributes(meta, release, versions)
				json.getInitializer()(ctx)
				je.json.initialize(ctx)
				je.mcf.initialize(ctx, summary.commands, release)
				nbt.initialize(ctx)

				return { loadedVersion: release }
			}],
		},
	})

	await service.project.ready()

	// Mirror the site's URI style so je.binder can infer category.
	const docUri = new URL(`unsaved/data/draft/${type}/draft.json`, rootUri).toString()
	await service.project.onDidOpen(docUri, 'json', 1, text)

	const docAndNode = await service.project.ensureClientManagedChecked(docUri)
	if (!docAndNode) {
		throw new Error('Failed to parse/check document')
	}

	// Collect errors by re-running checker with a fresh ErrorReporter.
	const err = new core.ErrorReporter()
	const ctx = core.CheckerContext.create(service.project, { doc: docAndNode.doc, err })
	const checker = service.project.meta.getChecker(docAndNode.node.type)
	if (checker) {
		checker(docAndNode.node, ctx)
	}

	const errors = err.errors ?? []
	
	// Clean up resources
	await service.project.close()
	await fs.rm(baseDir, { recursive: true, force: true }).catch(() => {})
	
	if (errors.length === 0) {
		process.stdout.write('OK\n')
		return
	}

	// Print and exit non-zero.
	for (const e of errors) {
		process.stdout.write(formatError(e) + '\n')
	}
	process.exitCode = 1
}

main().catch((e) => {
	process.stderr.write(String(e?.stack ?? e) + '\n')
	process.stderr.write('Hint: run `npm ci` first (node_modules is required).\n')
	process.exitCode = 1
})
