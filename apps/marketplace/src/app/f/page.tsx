export default function FormsHomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
      <div className="max-w-lg rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">Public Form Link Required</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This domain serves public forms. Open a link in this format:
        </p>
        <p className="mt-2 rounded-md bg-zinc-100 px-3 py-2 text-sm font-mono text-zinc-800">
          /&lt;viewId&gt;
        </p>
      </div>
    </div>
  );
}
