interface AuthStateScreenProps {
  title?: string;
  description: string;
  tone?: 'loading' | 'warning' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

const toneStyles = {
  loading: {
    icon: (
      <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
    ),
    cardClassName: 'border-slate-200 bg-white',
    titleClassName: 'text-slate-900',
    descriptionClassName: 'text-slate-600',
    buttonClassName: 'bg-slate-900 text-white hover:bg-slate-700',
  },
  warning: {
    icon: (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-800">
        !
      </div>
    ),
    cardClassName: 'border-amber-200 bg-white',
    titleClassName: 'text-slate-900',
    descriptionClassName: 'text-slate-600',
    buttonClassName: 'bg-slate-900 text-white hover:bg-slate-700',
  },
  error: {
    icon: (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">
        !
      </div>
    ),
    cardClassName: 'border-red-200 bg-red-50',
    titleClassName: 'text-red-900',
    descriptionClassName: 'text-red-700',
    buttonClassName: 'bg-red-700 text-white hover:bg-red-800',
  },
} as const;

export default function AuthStateScreen({
  title,
  description,
  tone = 'loading',
  actionLabel,
  onAction,
  actionDisabled = false,
}: AuthStateScreenProps) {
  const style = toneStyles[tone];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className={`w-full max-w-md rounded-2xl border p-8 text-center shadow-sm ${style.cardClassName}`}>
        <div className="mx-auto mb-4 flex items-center justify-center">
          {style.icon}
        </div>
        {title && <h1 className={`text-xl font-semibold ${style.titleClassName}`}>{title}</h1>}
        <p className={`mt-3 text-sm leading-6 ${style.descriptionClassName}`}>{description}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition ${
              actionDisabled ? 'cursor-not-allowed bg-slate-200 text-slate-500' : style.buttonClassName
            }`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
