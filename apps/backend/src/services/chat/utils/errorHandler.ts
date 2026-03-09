export class OpenAIErrorHandler {
    static handle(error: unknown): { error: string; status: number } {
        console.error('OpenAI chat error', error)

        if (error && typeof error === 'object' && 'status' in error && typeof (error as any).status === 'number') {
            const status = (error as any).status as number
            const message = (error as any).message ?? 'OpenAI request failed'
            return { error: message, status }
        }

        return { error: 'Unexpected error while processing chat completion.', status: 500 }
    }

    static handleOpenAIError(error: unknown): { error: string; status: number } {
        return this.handle(error)
    }
}
