"use client";

export const LogsView = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Audit Logs</h1>
      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <p className="text-slate-600">System activities and security audit trail</p>
        </div>
        <div className="p-4 text-center py-12">
          <p className="text-slate-500">No logs found for this project period.</p>
        </div>
      </div>
    </div>
  )
};
