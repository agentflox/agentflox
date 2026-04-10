const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/features/dashboard/views/tools/ToolBuilderView.tsx', 'utf8');

const stateTarget = `  // Step detail modal
  const [modalStepId, setModalStepId] = React.useState<string | null>(null);
  const [outputsModalOpen, setOutputsModalOpen] = React.useState(false);`;

const stateReplacement = `  // Step detail modal
  const [modalStepId, setModalStepId] = React.useState<string | null>(null);
  const [outputsModalOpen, setOutputsModalOpen] = React.useState(false);
  const [editingTitleId, setEditingTitleId] = React.useState<string | null>(null);
  const [tempTitle, setTempTitle] = React.useState<string>("");
  const handleSaveTitle = () => {
    if (editingTitleId) {
      setSteps(prev => prev.map(s => s.id === editingTitleId ? { ...s, name: tempTitle } : s));
    }
    setEditingTitleId(null);
  };`;

const jsxTarget = `                        <div className="text-[14px] font-bold text-zinc-900 truncate">
                          {systemToolsListOpen
                            ? "System Tools"
                            : inputSidebarOpen
                              ? "Configure Input"
                              : toolStepSidebarOpen
                                ? "Select a Tool Step"
                                : selectedNode === "inputs"
                                  ? "Inputs"
                                  : selectedNode === "outputs"
                                    ? "Outputs"
                                    : selectedNode === "branch_path"
                                      ? (
                                        (() => {
                                          const step = steps.find(s => s.id === selectedStepId);
                                          let cfg: any = {};
                                          try { cfg = JSON.parse(step?.config || "{}"); } catch { }
                                          const branch = (cfg.branches || []).find((b: any) => b.id === selectedSubBranchId);
                                          return (branch?.label || "Branch") + " Configuration";
                                        })()
                                      )
                                      : selectedNode === "step" && (() => {
                                          const s = steps.find(x => x.id === selectedStepId);
                                          let cfg: any = {};
                                          try { cfg = JSON.parse(s?.config || "{}"); } catch {}
                                          return s?.type === "LOOP" || cfg?.kind === "LOOP";
                                        })()
                                        ? "Loop"
                                        : (selectedStep?.name || "Step")}
                        </div>
                        {selectedNode === "step" && (
                          <Pencil className="h-3 w-3 text-zinc-400 shrink-0 cursor-pointer hover:text-zinc-600 transition-colors" />
                        )}`;

const jsxReplacement = `                        {editingTitleId === selectedStepId && selectedStepId && selectedNode === "step" ? (
                          <Input
                            autoFocus
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTitle();
                              if (e.key === "Escape") setEditingTitleId(null);
                            }}
                            onBlur={handleSaveTitle}
                            className="h-7 text-[14px] font-bold text-zinc-900 w-full min-w-0 px-2.5 py-0 focus-visible:ring-1 focus-visible:ring-indigo-600 border-indigo-300"
                          />
                        ) : (
                          <>
                            <div className="text-[14px] font-bold text-zinc-900 truncate">
                              {systemToolsListOpen
                                ? "System Tools"
                                : inputSidebarOpen
                                  ? "Configure Input"
                                  : toolStepSidebarOpen
                                    ? "Select a Tool Step"
                                    : selectedNode === "inputs"
                                      ? "Inputs"
                                      : selectedNode === "outputs"
                                        ? "Outputs"
                                        : selectedNode === "branch_path"
                                          ? (
                                            (() => {
                                              const step = steps.find(s => s.id === selectedStepId);
                                              let cfg: any = {};
                                              try { cfg = JSON.parse(step?.config || "{}"); } catch { }
                                              const branch = (cfg.branches || []).find((b: any) => b.id === selectedSubBranchId);
                                              return (branch?.label || "Branch") + " Configuration";
                                            })()
                                          )
                                          : selectedNode === "step" && (() => {
                                              const s = steps.find(x => x.id === selectedStepId);
                                              let cfg: any = {};
                                              try { cfg = JSON.parse(s?.config || "{}"); } catch {}
                                              return s?.type === "LOOP" || cfg?.kind === "LOOP";
                                            })()
                                            ? (selectedStep?.name || "Loop")
                                            : (selectedStep?.name || "Step")}
                            </div>
                            {selectedNode === "step" && (
                              <Pencil 
                                onClick={() => {
                                  setEditingTitleId(selectedStepId || null);
                                  const s = steps.find(x => x.id === selectedStepId);
                                  let cfg: any = {};
                                  try { cfg = JSON.parse(s?.config || "{}"); } catch {}
                                  const isLoop = s?.type === "LOOP" || cfg?.kind === "LOOP";
                                  setTempTitle(s?.name || (isLoop ? "Loop" : "Step"));
                                }}
                                className="h-3 w-3 text-zinc-400 shrink-0 cursor-pointer hover:text-zinc-600 transition-colors" 
                              />
                            )}
                          </>
                        )}`;

function replaceNormalize(str, target, replacement) {
  const tNorm = target.replace(/\\r\\n/g, '\\n');
  const sNorm = str.replace(/\\r\\n/g, '\\n');
  const rNorm = replacement.replace(/\\r\\n/g, '\\n');
  return sNorm.replace(tNorm, rNorm);
}

c = replaceNormalize(c, stateTarget, stateReplacement);
c = replaceNormalize(c, jsxTarget, jsxReplacement);

fs.writeFileSync('apps/frontend/src/features/dashboard/views/tools/ToolBuilderView.tsx', c);
