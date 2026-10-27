import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { reportError } from '../lib/errorReporting'
import { primaryButtonClass } from '../lib/ui'

interface State {
  failed: boolean
}

// If a screen crashes, show a way out instead of a blank page; the error is reported.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError('crash', Object.assign(error, { stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}` }))
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-poster text-2xl text-fg">La séance a été interrompue</p>
        <p className="mt-3 text-sm text-muted">
          Un problème est survenu dans l’app. Il nous a été signalé automatiquement. Ta bibliothèque n’est pas touchée.
        </p>
        <button type="button" onClick={() => window.location.reload()} className={`${primaryButtonClass} mt-6`}>
          Relancer l’app
        </button>
      </div>
    )
  }
}
