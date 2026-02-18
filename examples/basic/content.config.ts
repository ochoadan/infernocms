import { defineConfig, field } from 'infernocms';

export default defineConfig({
  blocks: {
    hero: {
      fields: {
        heading: field.text({ required: true }),
        subheading: field.text(),
        image: field.image(),
        cta: field.link(),
      }
    },
    richtext: {
      fields: {
        content: field.richtext(),
      }
    },
    features: {
      fields: {
        items: field.array({
          fields: {
            icon: field.image(),
            title: field.text({ required: true }),
          }
        }),
      }
    },
  },
  collections: {
    authors: {
      fields: {
        name: field.text({ required: true }),
        avatar: field.image(),
        bio: field.textarea(),
      }
    },
    posts: {
      hooks: {
        afterCreate: async ({ item }) => {
          console.log('New post created:', item.id);
        },
      },
      fields: {
        title: field.text({ required: true }),
        slug: field.slug({ from: 'title' }),
        body: field.richtext(),
        cover: field.image(),
        author: field.relation({ collection: 'authors' }),
        content: field.blocks({ allowed: ['hero', 'richtext', 'features'] }),
        status: field.select({ options: ['draft', 'published'], default: 'draft' }),
        featured: field.boolean({ default: false }),
        publishedAt: field.datetime(),
      }
    },
    categories: {
      fields: {
        name: 'text!',
        slug: 'slug:name',
        description: 'textarea',
      }
    }
  }
});
