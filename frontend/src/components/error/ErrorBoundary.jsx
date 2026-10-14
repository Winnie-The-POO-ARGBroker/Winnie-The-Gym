import { Component } from 'react'
import InternalErrorPage from '../../pages/InternalErrorPage'

/**
 * ErrorBoundary — catches unhandled render errors and shows a friendly 500 page.
 * Must be a class component because React's error boundary API uses lifecycle methods
 * that have no hook equivalent (getDerivedStateFromError / componentDidCatch).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Unhandled render error:', error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return <InternalErrorPage />
    }
    return this.props.children
  }
}
