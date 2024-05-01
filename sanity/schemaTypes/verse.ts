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
    }),
  ],
})
