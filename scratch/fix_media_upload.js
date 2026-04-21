const fs = require('fs');
const path = 'apps/frontend/src/features/dashboard/views/generic/FormView.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '{settings.coverImageUrl ? (';
const endMarker = ')}';

// This is getting dangerous. I'll just use a regex to find the MediaUpload inside the PopoverContent
const pattern = /<MediaUpload\s+bucket="media".*?\/>/s;

const newMediaUpload = `<MediaUpload
                                                                                     bucket="media"
                                                                                     pathPrefix={\`forms/\${viewId || "draft"}/cover\`}
                                                                                     maxFiles={1}
                                                                                     initialMedia={
                                                                                         settings.coverImageUrl && settings.coverImagePath
                                                                                             ? [{
                                                                                                 id: settings.coverImagePath,
                                                                                                 name: "cover",
                                                                                                 url: settings.coverImageUrl,
                                                                                                 path: settings.coverImagePath,
                                                                                                 size: 0,
                                                                                                 type: "image/*"
                                                                                             }]
                                                                                             : []
                                                                                     }
                                                                                     onChange={(media) => {
                                                                                         const first = media[0];
                                                                                         setSettings({
                                                                                             ...settings,
                                                                                             coverImageUrl: first?.url || "",
                                                                                             coverImagePath: first?.path || "",
                                                                                             coverBackgroundColor: first ? "" : settings.coverBackgroundColor
                                                                                         });
                                                                                         setHasUnsavedChanges(true);
                                                                                     }}
                                                                                     className="aspect-[2/1] rounded-xl overflow-hidden border-2 border-dashed border-zinc-200 bg-zinc-50 hover:bg-zinc-100/50 hover:border-violet-300 transition-all"
                                                                                 />`;

if (pattern.test(content)) {
    content = content.replace(pattern, newMediaUpload);
    fs.writeFileSync(path, content);
    console.log('Fixed MediaUpload props');
} else {
    console.log('MediaUpload pattern not found');
}
