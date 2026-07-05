import Link from "next/link";
import { Copy, Terminal, CheckCircle2 } from "lucide-react";

export default function DeveloperPage() {
  return (
    <div className="flex flex-col xl:flex-row gap-12 xl:gap-20">
      {/* Left Column: API Content */}
      <div className="flex-1 max-w-3xl xl:max-w-[700px]">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
            Get Access Token
          </h1>
          <div className="flex items-center gap-4 mb-6">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest rounded-md border border-indigo-500/20">
              POST
            </span>
            <code className="text-slate-600 dark:text-slate-400 font-mono text-sm bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800">
              https://api.agentflox.com/v1/oauth/token
            </code>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">
            Exchange your authorization code for an access token to authenticate API requests on behalf of a user.
          </p>
        </header>

        <div className="bg-indigo-50 dark:bg-indigo-500/5 border-l-4 border-indigo-500 p-6 my-8 rounded-r-xl">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <strong>Note:</strong> OAuth tokens are not supported when using the Try It feature of our Reference docs. You cannot try this endpoint directly from your web browser.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-slate-800 pb-2 flex justify-between items-end">
            <span>Body Params</span>
            <span className="text-xs font-mono text-slate-500 font-normal">application/json</span>
          </h2>
          
          <div className="flex flex-col gap-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-slate-900/30">
            {/* Param Row */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              <div className="w-48 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-sm">client_id</span>
                  <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Required</span>
                </div>
                <span className="text-xs font-mono text-slate-500 mt-1 block">string</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Your OAuth application client ID.</p>
                <input type="text" placeholder="your_client_id" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Param Row */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              <div className="w-48 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-sm">client_secret</span>
                  <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Required</span>
                </div>
                <span className="text-xs font-mono text-slate-500 mt-1 block">string</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Your OAuth application client secret.</p>
                <input type="password" placeholder="your_client_secret" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Param Row */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-slate-900/50">
              <div className="w-48 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-sm">code</span>
                  <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Required</span>
                </div>
                <span className="text-xs font-mono text-slate-500 mt-1 block">string</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">The authorization code given in the redirect URL.</p>
                <input type="text" placeholder="authorization_code" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Code Snippets */}
      <div className="flex-1 xl:max-w-[500px]">
        <div className="sticky top-28 flex flex-col gap-6">
          
          {/* Language Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 transition-colors">
              <div className="w-6 h-6 bg-green-500/10 text-green-500 rounded-md flex items-center justify-center">
                <Terminal size={14} />
              </div>
              <span className="text-xs font-bold">Node</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors opacity-60 hover:opacity-100 border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600">
              <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center">
                <Terminal size={14} />
              </div>
              <span className="text-xs font-bold">cURL</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors opacity-60 hover:opacity-100 border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600">
              <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center">
                <Terminal size={14} />
              </div>
              <span className="text-xs font-bold">Python</span>
            </button>
          </div>

          {/* Code Block */}
          <div className="rounded-xl overflow-hidden bg-[#0a0a0a] border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-slate-800">
              <div className="text-xs font-mono text-slate-400">fetch Request</div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">Examples ▾</span>
                <button className="text-slate-500 hover:text-white transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
              <div className="flex">
                <div className="text-slate-600 select-none pr-4 text-right">
                  1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9<br/>10
                </div>
                <div className="text-slate-300">
                  <span className="text-purple-400">const</span> url = <span className="text-green-400">'https://api.agentflox.com/v1/oauth/token'</span>;<br/>
                  <span className="text-purple-400">const</span> options = {'{'}<br/>
                  &nbsp;&nbsp;method: <span className="text-green-400">'POST'</span>,<br/>
                  &nbsp;&nbsp;headers: {'{'}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;accept: <span className="text-green-400">'application/json'</span>,<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-400">'content-type'</span>: <span className="text-green-400">'application/json'</span><br/>
                  &nbsp;&nbsp;{'}'}<br/>
                  {'}'};<br/>
                  <br/>
                  <span className="text-blue-400">fetch</span>(url, options)<br/>
                  &nbsp;&nbsp;.then(res =&gt; res.json())<br/>
                  &nbsp;&nbsp;.then(json =&gt; console.log(json))<br/>
                  &nbsp;&nbsp;.catch(err =&gt; console.error(err));
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#111111] border-t border-slate-800 flex justify-end">
              <button className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                Try It!
              </button>
            </div>
          </div>

          {/* Response Block */}
          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Response</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm dark:shadow-none">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Click <strong>Try It!</strong> to start a request and see the response here! Or choose an example:
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-slate-500">application/json</span>
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-500/20">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                  <span className="font-bold">200 OK</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}