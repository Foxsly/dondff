import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-300 bg-red-900/20">
          <h2 className="font-bold mb-2">Something went wrong.</h2>
          <pre className="whitespace-pre-wrap text-xs">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
