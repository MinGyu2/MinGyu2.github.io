import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { assertTaxonomy, validateClassification } from './data/taxonomy';

assertTaxonomy();

const stringList = z
  .union([z.array(z.union([z.string(), z.number()])), z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return [];
    // Jekyll accepts a whitespace separated string for categories/tags.
    const list = Array.isArray(v) ? v : v.split(/\s+/);
    return list.map((x) => String(x)).filter((x) => x.trim().length > 0);
  });

const posts = defineCollection({
  // Keep the original directory layout and file names as the entry id so each
  // entry maps 1:1 to its legacy `_posts/` source file.
  loader: glob({
    pattern: '**/*.{md,markdown}',
    base: './src/content/posts',
    generateId: ({ entry }) => entry.replace(/\.(md|markdown)$/, ''),
  }),
  schema: z.looseObject({
    title: z.string(),
    excerpt: z.string().optional(),
    categories: stringList,
    tags: stringList,
    last_modified_at: z.union([z.coerce.date(), z.string()]).optional(),
    published: z.boolean().optional(),
    /** Publication date. Optional for new posts: taken from the YYYY-MM-DD file name prefix. */
    date: z.coerce.date().optional(),
    /** Public URL. Recorded explicitly for migrated posts; derived with the Jekyll rule for new posts. */
    legacyPath: z.string().regex(/^\/.+\/$/, 'legacyPath must start and end with "/"').optional(),
    /** Original `_posts/` path for migrated posts. */
    legacySource: z.string().optional(),
    /**
     * Authoritative classification (see src/data/taxonomy.ts). Required for every post.
     * `categories` above is kept only as historical metadata.
     */
    module: z.string({ error: 'module is required (e.g. module: security) — see src/data/taxonomy.ts' }),
    submodule: z.string({ error: 'submodule is required (e.g. submodule: web-security) — see src/data/taxonomy.ts' }),
    series: z
      .object({ id: z.string(), order: z.number().int().positive() })
      .optional(),
  }).superRefine((data, ctx) => {
    for (const message of validateClassification(data)) ctx.addIssue({ code: 'custom', message });
  }),
});

export const collections = { posts };
