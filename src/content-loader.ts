import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Loader } from 'astro/loaders';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as typeof import('js-yaml');

const CONTENT_EXTENSIONS = new Set(['.md', '.mdx']);

async function walkMarkdownFiles(directory: string): Promise<string[]> {
  if (!existsSync(directory)) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(entryPath);
    return CONTENT_EXTENSIONS.has(path.extname(entry.name)) ? [entryPath] : [];
  }));

  return nested.flat().sort((a, b) => a.localeCompare(b));
}

function parseFrontmatter(contents: string, filePath: string) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`Missing YAML frontmatter: ${filePath}`);
  }

  const data = yaml.load(match[1], { filename: filePath });
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Frontmatter must be an object: ${filePath}`);
  }

  return {
    data: data as Record<string, unknown>,
    body: contents.slice(match[0].length),
  };
}

function toPosixPath(value: string) {
  return value.split(path.sep).join('/');
}

export function markdownDirectory(relativeDirectory: string): Loader {
  return {
    name: `local-markdown:${relativeDirectory}`,
    load: async (context) => {
      const rootPath = fileURLToPath(context.config.root);
      const directory = path.resolve(rootPath, relativeDirectory);
      const files = await walkMarkdownFiles(directory);

      context.store.clear();

      for (const filePath of files) {
        const contents = await readFile(filePath, 'utf8');
        const { data, body } = parseFrontmatter(contents, filePath);
        const relativeEntryPath = toPosixPath(path.relative(directory, filePath));
        const id = relativeEntryPath.slice(0, -path.extname(relativeEntryPath).length);
        const relativeFilePath = toPosixPath(path.relative(rootPath, filePath));
        const digest = context.generateDigest(contents);
        const parsedData = await context.parseData({ id, data, filePath });
        const rendered = await context.renderMarkdown(body, {
          fileURL: pathToFileURL(filePath),
        });

        context.store.set({
          id,
          data: parsedData,
          body,
          filePath: relativeFilePath,
          digest,
          rendered,
          assetImports: rendered.metadata?.imagePaths,
        });
      }

      context.watcher?.add(directory);
    },
  };
}
