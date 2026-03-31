import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'verse',
  title: 'Verse',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'verse',
      title: 'Verse',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'verse',
    },
    prepare(selection) {
      const title = selection.title || 'Untitled verse'
      const subtitle = selection.subtitle || ''
      return {
        title,
        subtitle: subtitle.slice(0, 80),
      }
    },
  },
})
