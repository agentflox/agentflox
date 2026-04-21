const fs = require('fs');
const path = 'apps/frontend/src/features/dashboard/views/generic/FormView.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '<PopoverContent align="start" sideOffset={16} className="w-[340px] p-4 rounded-2xl border border-zinc-200 shadow-2xl animate-in zoom-in-95 duration-200 z-[100]">';
const endMarker = '</PopoverContent>';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const prefix = content.substring(0, startIndex + startMarker.length);
    const suffix = content.substring(endIndex);
    
    const newBody = `
                                                                        <div className="space-y-3">
                                                                            <div className="text-xs font-semibold text-zinc-800">
                                                                                {settings.coverImageUrl ? "Current cover" : "Upload cover image"}
                                                                            </div>
                                                                            {settings.coverImageUrl ? (
                                                                                <div className="relative group aspect-[2.5/1] w-full rounded-xl overflow-hidden border border-zinc-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                                                                    <Image
                                                                                        src={settings.coverImageUrl}
                                                                                        alt="Cover preview"
                                                                                        fill
                                                                                        className="object-cover"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center cursor-pointer transition-all active:scale-90"
                                                                                        onClick={() => {
                                                                                            setSettings({ ...settings, coverImageUrl: "", coverImagePath: "" });
                                                                                            setHasUnsavedChanges(true);
                                                                                        }}
                                                                                    >
                                                                                        <X className="h-4 w-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <MediaUpload
                                                                                    bucket="media"
                                                                                    pathPrefix={\`forms/\${viewId || "draft"}/cover\`}
                                                                                    value={settings.coverImageUrl}
                                                                                    path={settings.coverImagePath}
                                                                                    workspaceId={resolvedWorkspaceId}
                                                                                    onUpload={(url, path) => {
                                                                                        setSettings({ ...settings, coverImageUrl: url, coverImagePath: path, coverBackgroundColor: "" });
                                                                                        setHasUnsavedChanges(true);
                                                                                    }}
                                                                                    onRemove={() => {
                                                                                        setSettings({ ...settings, coverImageUrl: "", coverImagePath: "" });
                                                                                        setHasUnsavedChanges(true);
                                                                                    }}
                                                                                    className="aspect-[2/1] rounded-xl overflow-hidden border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100/50 hover:border-violet-300 transition-all"
                                                                                />
                                                                            )}
                                                                            {!settings.coverImageUrl && (
                                                                                <p className="text-[10px] text-zinc-400 text-center">
                                                                                    Recommended size: 1200x400px (3:1 aspect ratio)
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    `;
    
    fs.writeFileSync(path, prefix + newBody + suffix);
    console.log('Fixed using block replacement');
} else {
    console.log('Markers not found');
}
