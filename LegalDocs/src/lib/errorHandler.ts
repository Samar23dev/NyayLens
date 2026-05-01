// Central error handling service
class ErrorHandler {
  getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // File-related errors
      if (error.message.includes('empty')) {
        return 'The document appears to be empty. Please upload a valid contract file.'
      }
      if (error.message.includes('file')) {
        return 'Error reading file. Ensure the file is a valid PDF, DOC, or DOCX format.'
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Network error. Please check your connection and try again.'
      }
      if (error.message.includes('API')) {
        return 'API error. The AI service is temporarily unavailable. Please try again.'
      }
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return 'Authentication error. Please check your API key.'
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return 'Rate limit exceeded. Please wait a moment before trying again.'
      }
      return error.message
    }

    if (typeof error === 'string') {
      return error
    }

    return 'An unexpected error occurred. Please try again.'
  }

  // Log error for analytics/debugging
  logError(error: unknown, context?: string) {
    const message = this.getErrorMessage(error)
    console.error(`[${context || 'Error'}]`, message, error)

    // Can be extended to send to error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  // User-friendly error recovery suggestions
  getRecoverySuggestions(error: unknown): string[] {
    const suggestions: string[] = []

    if (error instanceof Error) {
      const msg = error.message.toLowerCase()

      if (msg.includes('file')) {
        suggestions.push('Try a different file format (PDF, DOCX, or DOC)')
        suggestions.push('Ensure the file is not corrupted or password-protected')
      }

      if (msg.includes('network')) {
        suggestions.push('Check your internet connection')
        suggestions.push('Try again in a few moments')
      }

      if (msg.includes('api')) {
        suggestions.push('Verify your API key is configured correctly')
        suggestions.push('Try again in a few moments')
      }

      if (msg.includes('empty')) {
        suggestions.push('Upload a document with actual content')
        suggestions.push('Check that the file wasn\'t corrupted during upload')
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Refresh the page and try again', 'Check the browser console for more details')
    }

    return suggestions
  }
}

export const errorHandler = new ErrorHandler()
