export class OpenAIErrorHandler {
  static handle(error: unknown): Response {
    console.error('OpenAI chat error', error);

    if (error instanceof Response) {
      return error;
    }

    if (error && typeof error === 'object' && 'status' in error && typeof (error as any).status === 'number') {
      const status = (error as any).status as number;
      const message = (error as any).message ?? 'OpenAI request failed';
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unexpected error while processing chat completion.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  static handleOpenAIError(error: unknown): Response {
    return this.handle(error);
  }
}

