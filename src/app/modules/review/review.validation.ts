import { z } from "zod"

const reviewZodSchema = z.object({
    body: z.object({
        barber: z.string({ error: 'Barber is required' }),
        service: z.string({ error: 'Service is required' }),
        rating: z.number({ error: 'Rating is required' }),
        comment: z.string({ error: 'Comment is required' }),
    })  
})

export const ReviewValidation = {reviewZodSchema}