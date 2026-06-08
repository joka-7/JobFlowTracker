import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({
  message,
  action,
  onAction,
  type = 'info', // 'info', 'success', 'error', 'warning'
  timeout = 5000,
  onClose
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (timeout <= 0) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, timeout);
    return () => clearTimeout(timer);
  }, [timeout, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
  }[type];

  const textColor = {
    info: 'text-blue-800',
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-amber-800',
  }[type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertCircle,
    info: Info,
  }[type];

  const buttonColor = {
    info: 'text-blue-600 hover:text-blue-800',
    success: 'text-green-600 hover:text-green-800',
    error: 'text-red-600 hover:text-red-800',
    warning: 'text-amber-600 hover:text-amber-800',
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm p-4 border rounded-lg ${bgColor} ${textColor} shadow-lg z-50 animate-slide-up`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">{message}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {action && (
            <button
              onClick={() => {
                onAction?.();
                setIsVisible(false);
                onClose?.();
              }}
              className={`font-bold text-sm ${buttonColor} underline`}
            >
              {action}
            </button>
          )}
          <button
            onClick={() => {
              setIsVisible(false);
              onClose?.();
            }}
            className={`${buttonColor}`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
