const fs = require('fs');
const file = 'c:/Users/datng/agentflox/apps/frontend/src/entities/task/components/TaskDetailModal.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const panelComponent = `                                                <>
                                                    <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
                                                        <TaskActivityPanel
                                                            task={task}
                                                            workspaceMembers={workspace?.members || []}
                                                            currentUserId={currentUserId}
                                                            filteredActivity={filteredActivity}
                                                            activityFilterOpen={activityFilterOpen}
                                                            setActivityFilterOpen={setActivityFilterOpen}
                                                            activityFilterTypes={activityFilterTypes}
                                                            setActivityFilterTypes={setActivityFilterTypes}
                                                            createComment={createComment}
                                                            commentText={commentText}
                                                            setCommentText={setCommentText}
                                                            showEmojiPicker={showEmojiPicker}
                                                            setShowEmojiPicker={setShowEmojiPicker}
                                                            textareaRef={textareaRef}
                                                            handleEmojiClick={handleEmojiClick}
                                                        />
                                                    </div>
                                                </>`;

const panelComponent2 = `                                                            <>
                                                                <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
                                                                    <TaskActivityPanel
                                                                        task={task}
                                                                        workspaceMembers={workspace?.members || []}
                                                                        currentUserId={currentUserId}
                                                                        filteredActivity={filteredActivity}
                                                                        activityFilterOpen={activityFilterOpen}
                                                                        setActivityFilterOpen={setActivityFilterOpen}
                                                                        activityFilterTypes={activityFilterTypes}
                                                                        setActivityFilterTypes={setActivityFilterTypes}
                                                                        createComment={createComment}
                                                                        commentText={commentText}
                                                                        setCommentText={setCommentText}
                                                                        showEmojiPicker={showEmojiPicker}
                                                                        setShowEmojiPicker={setShowEmojiPicker}
                                                                        textareaRef={textareaRef}
                                                                        handleEmojiClick={handleEmojiClick}
                                                                    />
                                                                </div>
                                                            </>`;

const start1 = lines.findIndex(l => l.includes("{rightSidebarPanel === 'activity' && (")) + 1;
const end1 = lines.findIndex((l, i) => i > start1 && l.includes("{rightSidebarPanel === 'related' && (")) - 2;

lines.splice(start1, end1 - start1 + 1, panelComponent);

const start2 = lines.findIndex((l, i) => i > start1 + 50 && l.includes("{rightSidebarPanel === 'activity' && (")) + 1;
const end2 = lines.findIndex((l, i) => i > start2 && l.includes("{rightSidebarPanel === 'related' && (")) - 2;

lines.splice(start2, end2 - start2 + 1, panelComponent2);

const importLine = `import { TaskActivityPanel } from './TaskActivityPanel';`;
const importIndex = lines.findIndex(l => l.includes('import { RelatedPanelContent }'));
lines.splice(importIndex, 0, importLine);

fs.writeFileSync(file, lines.join('\n'));
console.log('Replaced blocks and added import');
