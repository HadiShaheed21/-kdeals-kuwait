
interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export function Toast({
  id,
  message,
  type = 'success',
  onClose,
}: ToastProps) {
  const typeStyles = {
    success: 'bg-green-50 border-green-500 text-green-800',
    error: 'bg-red-50 border-red-500 text-red-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
  };

  return (
    <div
      id={id}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm
        ${typeStyles[type]}
        animate-[slideIn_0.2s_ease-out]
      `}
    >
      <span className="text-sm font-semibold">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-sm opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
