#!/usr/bin/env node
/**
 * Check the fal-hosted half of the catalog against fal's live OpenAPI schemas.
 *
 *   node scripts/verify-fal-endpoints.mjs
 *
 * For every fal model it verifies that the endpoint still exists, that each
 * declared parameter is a real input field, that enum values are still
 * accepted, and that the reference-image fields we send actually exist.
 *
 * Network-dependent, so it is not part of `npm test` — run it when adding
 * models or when a provider ships a breaking schema change.
 */

// Load the TypeScript catalog through Vite's SSR transform.
const { createServer } = await import('vite');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { VIDEO_MODELS } = await server.ssrLoadModule('/src/models/catalog.video.ts');
const { IMAGE_MODELS } = await server.ssrLoadModule('/src/models/catalog.image.ts');
await server.close();

const models = [...VIDEO_MODELS, ...IMAGE_MODELS].filter((m) => m.routing.kind === 'fal');

const schemaCache = new Map();
async function inputSchema(endpointId) {
  if (schemaCache.has(endpointId)) return schemaCache.get(endpointId);
  const response = await fetch(`https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=${endpointId}`);
  if (!response.ok) {
    schemaCache.set(endpointId, null);
    return null;
  }
  const doc = await response.json();
  const schemas = doc.components?.schemas ?? {};
  const input = Object.entries(schemas).find(([name]) => name.endsWith('Input'))?.[1] ?? null;
  schemaCache.set(endpointId, input);
  return input;
}

function enumValues(property) {
  if (!property) return null;
  if (property.enum) return property.enum.map(String);
  for (const variant of property.anyOf ?? []) {
    if (variant.enum) return variant.enum.map(String);
  }
  return null;
}

const problems = [];
let checked = 0;

for (const model of models) {
  const { text, image, reference, fields = {}, imageSize } = model.routing;
  const routes = [
    ['t2x', text],
    ['i2x', image],
    ['ref', reference],
  ].filter(([, endpoint]) => endpoint);

  for (const [route, endpoint] of routes) {
    const schema = await inputSchema(endpoint);
    checked += 1;
    if (!schema) {
      problems.push(`${model.id}: endpoint "${endpoint}" not found`);
      continue;
    }
    const properties = schema.properties ?? {};

    for (const param of model.params) {
      if (param.omitFor?.includes(route)) continue;
      if (imageSize && (param.key === 'aspect_ratio' || param.key === 'resolution')) continue;

      const property = properties[param.key];
      if (!property) {
        problems.push(`${model.id} [${endpoint}]: unknown field "${param.key}"`);
        continue;
      }
      const allowed = enumValues(property);
      if (!allowed) continue;
      let declared =
        param.type === 'enum'
          ? param.options.map((o) => o.value)
          : param.type === 'number' && param.choices
          ? param.choices.map(String)
          : [String(param.default)];
      // A default that is never sent doesn't have to exist upstream.
      if (param.omitWhenDefault) declared = declared.filter((value) => value !== String(param.default));
      const rejected = declared.filter((value) => !allowed.includes(value));
      if (rejected.length) {
        problems.push(
          `${model.id} [${endpoint}]: "${param.key}" values not accepted: ${rejected.join(', ')} (allowed: ${allowed.join(', ')})`
        );
      }
    }

    // The wire field for each role must exist on the endpoint that serves it.
    const rolesForRoute =
      route === 'ref' ? ['reference'] : route === 'i2x' ? ['start', 'end'] : [];
    for (const role of rolesForRoute) {
      if (!model.capabilities.images.some((input) => input.role === role)) continue;
      const field = fields[role];
      if (!field) {
        problems.push(`${model.id} [${endpoint}]: no wire field declared for ${role}`);
      } else if (!properties[field]) {
        problems.push(`${model.id} [${endpoint}]: ${role} field "${field}" is not an input field`);
      }
    }
    // Image models fold references into their edit endpoint.
    if (route === 'i2x' && !reference && fields.reference && !properties[fields.reference]) {
      problems.push(`${model.id} [${endpoint}]: reference field "${fields.reference}" is not an input field`);
    }
    if (imageSize && !properties[imageSize.key]) {
      problems.push(`${model.id} [${endpoint}]: image size field "${imageSize.key}" is missing`);
    }
  }
}

console.log(`Checked ${checked} fal endpoints across ${models.length} models.`);
if (problems.length === 0) {
  console.log('✓ Catalog matches the live fal schemas.');
  process.exit(0);
}
console.error(`\n${problems.length} problem(s):`);
for (const problem of problems) console.error(`  - ${problem}`);
process.exit(1);
