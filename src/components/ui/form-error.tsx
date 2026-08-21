export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-app-danger/10 px-3.5 py-2.5 text-sm font-medium text-app-danger">
      {message}
    </p>
  );
}
