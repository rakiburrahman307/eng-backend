import { z } from "zod"
import { objectIdZodSchema } from "../../../helpers/checkObjectIdZodSchemaHelper"

const createReportZodSchema = z.object({
    body: z.object({
        customer: objectIdZodSchema("Customer Object Id is required"),
        service: objectIdZodSchema("Service Object Id is required"),
        reason: z.array(z.string({ required_error: 'Reason is required' }))
    })  
})

export const ReportValidation = {createReportZodSchema}