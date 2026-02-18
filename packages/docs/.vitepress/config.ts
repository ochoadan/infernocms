import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'InfernoCMS',
  description: 'A config-driven headless CMS for Node.js',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/endpoints' },
      { text: 'Fields', link: '/fields/overview' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Collections', link: '/guide/collections' },
          { text: 'Status Fields', link: '/guide/draft-published' },
          { text: 'Hooks', link: '/guide/hooks' },
          { text: 'Access Control', link: '/guide/access-control' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Endpoints', link: '/api/endpoints' },
          { text: 'Query Parameters', link: '/api/query-parameters' },
          { text: 'Filtering', link: '/api/filtering' },
          { text: 'Response Format', link: '/api/response-format' },
        ],
      },
      {
        text: 'Fields',
        items: [
          { text: 'Overview', link: '/fields/overview' },
          { text: 'Text', link: '/fields/text' },
          { text: 'Number', link: '/fields/number' },
          { text: 'Boolean', link: '/fields/boolean' },
          { text: 'Select', link: '/fields/select' },
          { text: 'Date & Time', link: '/fields/datetime' },
          { text: 'Relation', link: '/fields/relation' },
          { text: 'Slug', link: '/fields/slug' },
          { text: 'Image & File', link: '/fields/image-file' },
          { text: 'Rich Text', link: '/fields/richtext' },
          { text: 'Blocks', link: '/fields/blocks' },
        ],
      },
      {
        text: 'Deploy',
        items: [
          { text: 'Railway', link: '/deploy/railway' },
          { text: 'Fly.io', link: '/deploy/fly-io' },
          { text: 'Docker', link: '/deploy/docker' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/infernocms/infernocms' },
    ],
  },
});
