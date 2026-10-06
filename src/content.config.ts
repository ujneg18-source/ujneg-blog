import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

import { markdownDirectory } from './content-loader';

const blog = defineCollection({
	loader: markdownDirectory('./src/content/blog'),
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
  loader: markdownDirectory('./src/content/notes'),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.string().default('Tech'),
    subcategory: z.string().nullable().optional(),
    series: z.string().nullable().optional(),
    seriesOrder: z.number().int().positive().optional(),
    originalNotebook: z.string().nullable().optional(),
    tags: z.array(z.string()).default([]),
    date: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    thumbnail: image().nullable().optional(),
  }),
});

const projects = defineCollection({
  loader: markdownDirectory('./src/content/projects'),
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
  loader: markdownDirectory('./src/content/stories'),
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
