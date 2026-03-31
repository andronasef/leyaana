import {documentInternationalization} from '@sanity/document-internationalization'
import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

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
      schemaTypes: ['verse', 'godName', 'heavenlyBlessing'],
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
