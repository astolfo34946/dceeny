export function CustomerWaitingScreen() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-white px-4 text-center text-black">
      <div className="max-w-md">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Project not yet assigned
        </p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Your project is being prepared.
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          The builder will connect your account to your private 360° walk-through
          shortly. You&apos;ll receive a notification as soon as it&apos;s ready.
        </p>
      </div>
    </div>
  );
}

