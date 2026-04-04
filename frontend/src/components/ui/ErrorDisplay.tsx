import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ title = 'Something went wrong', message, action }) => (
  <div>
    <h2 className="text-2xl font-bold">{title}</h2>
    <p className="text-red-500">{message}</p>
    {action && (
      <button className="btn-primary" onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </div>
);

export default ErrorDisplay;
