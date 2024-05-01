import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {documentInternationalization} from '@sanity/document-internationalization'

export default defineConfig({
  name: 'default',
  title: 'Leya Ana',

  projectId: 'kfme7y2v',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
    documentInternationalization({
      // Required configuration
      supportedLanguages: [{id: 'ar', title: 'Arabic'}],
      schemaTypes: ['verse'],
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
