import { GoogleGenAI } from '@google/genai'
import { ITEM_CATEGORIES, ITEM_CONDITIONS } from '../models/item.js'

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
Give the one category that fits the item best, using Other only when none do.
Give the condition it looks to be in: New if it looks unused, Like new if there are no marks,
Good for light wear and Fair for clear scuffs or scratches.
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
          category: { type: 'string', enum: ITEM_CATEGORIES },
          condition: { type: 'string', enum: ITEM_CONDITIONS },
          box_2d: { type: 'array', items: boxCoordinate, minItems: 4, maxItems: 4 },
        },
        required: ['name', 'description', 'category', 'condition', 'box_2d'],
      },
    },
  },
  required: ['items'],
}

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// Codes from aistudio.google.com/docs/api-errors, older Gemini errors send a list with a number instead
function geminiErrorCode(err) {
  try {
    return [JSON.parse(err.body)].flat()[0]?.error?.code
  } catch {
    return undefined
  }
}

const MESSAGES_BY_CODE = {
  quota_exceeded: "Gemini's daily limit is used up, try again tomorrow",
  rate_limit_exceeded: 'Gemini is getting too many requests, try again in a minute',
  too_many_requests: 'Gemini is getting too many requests, try again in a minute',
  deadline_exceeded: 'Gemini took too long to answer, try again',
  service_unavailable: 'Gemini is overloaded right now, try again in a while',
}

// Gemini's own error says whose fault it is, so only our own mistakes stay a server error
export function geminiFailure(err) {
  const message = MESSAGES_BY_CODE[geminiErrorCode(err)]
  if (err.status === 429) {
    return { status: 429, message: message ?? "Gemini's rate limit was hit, try again later" }
  }
  if (err.status >= 500) {
    return {
      status: 503,
      message: message ?? 'Gemini is having problems right now, try again later',
    }
  }
  // The SDK leaves status unset when it never got a response
  if (err.name === 'APIConnectionError') {
    return { status: 503, message: "Couldn't reach Gemini, try again in a minute" }
  }
  return null
}

// Hydrogen gets a second try before the Flash models
export const DETECTION_MODELS = [
  'gemini-4-hydrogen',
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
]

export async function detectItems(image, model) {
  const interaction = await client.interactions.create(
    {
      model,
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
    },
    // The SDK's own retries wait the 30 seconds Gemini asks for, the frontend retries sooner
    { maxRetries: 0 },
  )
  return JSON.parse(interaction.output_text).items
}
