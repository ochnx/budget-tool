'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: string }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-400 text-lg mb-2">⚠️ Fehler beim Laden</p>
          <p className="text-dark-400 text-sm">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-4 px-4 py-2 bg-emerald-600 rounded-lg text-white">
            Nochmal versuchen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
