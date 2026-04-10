import sys

file_path = r'c:\Users\datng\agentflox\apps\frontend\src\features\dashboard\views\tools\ToolBuilderView.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''  // Step detail modal
  const [modalStepId, setModalStepId] = React.useState<string | null>(null);
  const [outputsModalOpen, setOutputsModalOpen] = React.useState(false);'''

replacement1 = '''  // Step detail modal
  const [modalStepId, setModalStepId] = React.useState<string | null>(null);
  const [outputsModalOpen, setOutputsModalOpen] = React.useState(false);
  const [isEditingHeaderName, setIsEditingHeaderName] = React.useState(false);
  const [headerNameInput, setHeaderNameInput] = React.useState("");

  React.useEffect(() => {
    setIsEditingHeaderName(false);
  }, [selectedStepId, selectedNode]);'''

if target1 in content:
    content = content.replace(target1, replacement1)
    print("target1 replaced")
else:
    print('target1 not found')

target2 = '''                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
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
                                        ? "Loop"
                                        : (selectedStep?.name || "Step")}
                        </div>
                        {selectedNode === "step" && (
                          <Pencil className="h-3 w-3 text-zinc-400 shrink-0 cursor-pointer hover:text-zinc-600 transition-colors" />
                        )}
                      </div>'''

replacement2 = '''                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isEditingHeaderName && selectedNode === "step" ? (
                          <Input
                            autoFocus
                            value={headerNameInput}
                            onChange={(e) => setHeaderNameInput(e.target.value)}
                            onBlur={() => {
                              if (selectedStepId) {
                                updateStepName(selectedStepId, headerNameInput || "Step");
                              }
                              setIsEditingHeaderName(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (selectedStepId) {
                                  updateStepName(selectedStepId, headerNameInput || "Step");
                                }
                                setIsEditingHeaderName(false);
                              } else if (e.key === "Escape") {
                                setIsEditingHeaderName(false);
                              }
                            }}
                            className="h-7 text-[14px] font-bold text-zinc-900 border-zinc-300 px-1.5 w-48"
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
                                            ? "Loop"
                                            : (selectedStep?.name || "Step")}
                            </div>
                            {selectedNode === "step" && (
                              <Pencil 
                                onClick={() => {
                                  const s = steps.find((x) => x.id === selectedStepId);
                                  setHeaderNameInput(s?.name || "Step");
                                  setIsEditingHeaderName(true);
                                }}
                                className="h-3 w-3 text-zinc-400 shrink-0 cursor-pointer hover:text-zinc-600 transition-colors" 
                              />
                            )}
                          </>
                        )}
                      </div>'''

if target2 in content:
    content = content.replace(target2, replacement2)
    print("target2 replaced")
else:
    import json
    print('target2 not found')

with open(file_path, 'w', encoding='utf-8', newline='\\n') as f:
    f.write(content)

print('done')
