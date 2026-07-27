import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    category: z.string().default('Tech'),
    subcategory: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    date: z.coerce.date(),
    thumbnail: image().nullable().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    period: z.string(),
    description: z.string(),
    techStack: z.array(z.string()).default([]),
    githubUrl: z.string().nullable().optional(),
    thumbnail: image().nullable().optional(),
    status: z.string().default('Completed'),
  }),
});

const stories = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/stories" }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    thumbnail: image().nullable().optional(),
  }),
});

export const collections = { blog, notes, projects, stories };
