import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const OPENAI_MODELS = {
  GPT4O: 'gpt-4o' as const,
  GPT4O_MINI: 'gpt-4o-mini' as const,
} as const