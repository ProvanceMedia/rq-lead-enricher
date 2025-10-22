export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-md space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">Access restricted</h1>
        <p className="text-sm text-slate-600">
          Your account email domain is not permitted for this application. If you believe this is a mistake, please contact an administrator.
        </p>
      </div>
    </div>
  );
}
