// @ts-nocheck
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'godName',
  title: 'God Name',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mean',
      title: 'Meaning',
      type: 'string',
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 12,
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 0,
    }),
    defineField({
      name: 'notionId',
      title: 'Notion Id',
      type: 'string',
      readOnly: true,
      description: 'Legacy source id from Notion migration.',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'mean',
    },
  },
})
