import { z } from 'zod'

// ── Auth ──────────────────────────────────────

export const SignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
  category_slug: z.enum(['legal', 'business'] as const),
})

export const SignInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type SignUpInput = z.infer<typeof SignUpSchema>
export type SignInInput = z.infer<typeof SignInSchema>

// ── Documents ─────────────────────────────────

export const DocumentUploadSchema = z.object({
  category_slug: z.enum(['legal', 'business'] as const),
})

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_UPLOAD = 5

// ── Conversations ─────────────────────────────

export const CreateConversationSchema = z.object({
  category_slug: z.enum(['legal', 'business'] as const),
  selected_document_ids: z
    .array(z.string().uuid())
    .min(1, 'Select at least one document'),
  title: z.string().optional(),
})

export const RenameConversationSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title too long'),
})

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>

// ── Messages ──────────────────────────────────

export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long'),
  category_slug: z.enum(['legal', 'business'] as const),
})

export type SendMessageInput = z.infer<typeof SendMessageSchema>

// ── Billing ───────────────────────────────────

export const CheckoutSchema = z.object({
  plan_slug: z.literal('pro'),
  category_slug: z.enum(['legal', 'business'] as const),
})
