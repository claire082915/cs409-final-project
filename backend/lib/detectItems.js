import { GoogleGenAI } from '@google/genai'

// Keeps the review list short and the number of crop uploads low, picked by hand
const MAX_DETECTED_ITEMS = 20

const prompt = `List the items in this photo that a person could carry over to a friend's place and lend them.
Order the list by how often people borrow that kind of thing, so electronics, tools,
games and portable furniture come before small decor.
Skip anything built in or too big to move easily, like walls, windows, curtains, radiators,
rugs, dining tables and TV stands.
Skip things hung on walls, like paintings, frames and clocks.
Skip personal things nobody lends, like phones, glasses, wallets, keys, pens and paper.
Skip anything a person is holding, wearing or lying on, and keep people out of every box.
Skip items cut off by the edge of the photo.
For each item give a short name and a one sentence description of the item itself,
such as its color, material and size, without saying where it sits in the room.
Give box_2d as [ymin, xmin, ymax, xmax] normalized to 0-1000, tight around the whole item.`

const boxCoordinate = { type: 'integer', minimum: 0, maximum: 1000 }

const detectedItemsSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      maxItems: MAX_DETECTED_ITEMS,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          box_2d: { type: 'array', items: boxCoordinate, minItems: 4, maxItems: 4 },
        },
        required: ['name', 'description', 'box_2d'],
      },
    },
  },
  required: ['items'],
}

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Takes a JPEG and returns [{ name, description, box_2d }]
export async function detectItems(image) {
  const interaction = await client.interactions.create({
    model: 'gemini-4-hydrogen',
    input: [
      {
        type: 'user_input',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', data: image.toString('base64'), mime_type: 'image/jpeg' },
        ],
      },
    ],
    // Low thinks about a third as much as high with no drop in detection
    generation_config: { thinking_level: 'low' },
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: detectedItemsSchema,
    },
  })
  return JSON.parse(interaction.output_text).items
}
