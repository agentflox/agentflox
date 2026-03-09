"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Square,
    Type,
    StickyNote,
    Circle,
    Move,
    Trash2,
    Save,
    Loader2,
    ZoomIn,
    ZoomOut,
    Minus,
    ArrowRight,
    Image as ImageIcon,
    Link as LinkIcon,
    PenTool,
    Hand,
    MousePointer,
    Undo,
    Redo,
    Download,
    Upload,
    Palette,
    Lock,
    Unlock,
    Copy,
    AlignLeft,
    Bold,
    Italic,
    Underline,
    ChevronDown,
    Maximize2,
    Grid3x3
} from "lucide-react";

interface WhiteboardElement {
    id: string;
    type: 'note' | 'text' | 'rect' | 'circle' | 'line' | 'arrow' | 'image' | 'link' | 'freehand';
    content?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    locked?: boolean;
    opacity?: number;
    rotation?: number;
    zIndex?: number;
    x2?: number;
    y2?: number;
    points?: { x: number; y: number }[];
    imageUrl?: string;
    url?: string;
}

const COLORS = [
    { name: 'Yellow', bg: 'bg-yellow-200', border: 'border-yellow-400', hex: '#fef08a' },
    { name: 'Pink', bg: 'bg-pink-200', border: 'border-pink-400', hex: '#fbcfe8' },
    { name: 'Blue', bg: 'bg-blue-200', border: 'border-blue-400', hex: '#bfdbfe' },
    { name: 'Green', bg: 'bg-green-200', border: 'border-green-400', hex: '#bbf7d0' },
    { name: 'Purple', bg: 'bg-purple-200', border: 'border-purple-400', hex: '#e9d5ff' },
    { name: 'Orange', bg: 'bg-orange-200', border: 'border-orange-400', hex: '#fed7aa' },
    { name: 'Red', bg: 'bg-red-200', border: 'border-red-400', hex: '#fecaca' },
    { name: 'Gray', bg: 'bg-gray-200', border: 'border-gray-400', hex: '#e5e7eb' },
];

function DraggableElement({ element, onUpdate, onDelete, isSelected, onSelect, mode, isDragging, onDragStart, onDrag, onDragEnd }: {
    element: WhiteboardElement;
    onUpdate: (id: string, updates: Partial<WhiteboardElement>) => void;
    onDelete: (id: string) => void;
    isSelected: boolean;
    onSelect: (id: string) => void;
    mode: string;
    isDragging: boolean;
    onDragStart: (id: string, e: React.MouseEvent) => void;
    onDrag: (e: React.MouseEvent) => void;
    onDragEnd: () => void;
}) {
    const getElementContent = () => {
        switch (element.type) {
            case 'note':
                return (
                    <div
                        className={`w-48 h-48 shadow-lg p-4 flex flex-col transition-all relative group rounded-sm ${element.backgroundColor || "bg-yellow-200"} ${isDragging ? "shadow-2xl rotate-2 scale-105" : ""} ${isSelected ? "ring-2 ring-indigo-500 ring-offset-2" : ""} ${element.locked ? "cursor-not-allowed" : ""}`}
                        style={{ opacity: element.opacity || 1, transform: `rotate(${element.rotation || 0}deg)` }}
                        onClick={() => onSelect(element.id)}
                    >
                        <textarea
                            className="w-full h-full bg-transparent resize-none border-none focus:outline-none text-sm text-zinc-800 placeholder:text-zinc-500/50"
                            placeholder="Type a note..."
                            value={element.content}
                            onChange={(e) => onUpdate(element.id, { content: e.target.value })}
                            onPointerDown={(e) => e.stopPropagation()}
                            disabled={element.locked}
                            style={{
                                fontSize: `${element.fontSize || 14}px`,
                                fontWeight: element.fontWeight || 'normal',
                                fontStyle: element.fontStyle || 'normal',
                                textDecoration: element.textDecoration || 'none',
                                textAlign: (element.textAlign as any) || 'left'
                            }}
                        />
                        {!element.locked && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}>
                                <Trash2 className="h-3 w-3 text-zinc-500 hover:text-red-500" />
                            </div>
                        )}
                        {element.locked && (
                            <div className="absolute top-2 left-2">
                                <Lock className="h-3 w-3 text-zinc-400" />
                            </div>
                        )}
                    </div>
                );
            case 'rect':
                return (
                    <div
                        className={`shadow-md rounded-lg flex items-center justify-center relative group transition-all ${element.backgroundColor || "bg-white"} ${isSelected ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
                        style={{
                            width: element.width || 160,
                            height: element.height || 100,
                            borderWidth: element.borderWidth || 2,
                            borderColor: element.borderColor || '#a1a1aa',
                            borderStyle: 'solid',
                            opacity: element.opacity || 1,
                            transform: `rotate(${element.rotation || 0}deg)`
                        }}
                        onClick={() => onSelect(element.id)}
                    >
                        <input
                            className="bg-transparent text-center w-full px-2 focus:outline-none text-sm font-medium"
                            placeholder="Label"
                            value={element.content}
                            onChange={(e) => onUpdate(element.id, { content: e.target.value })}
                            disabled={element.locked}
                            style={{
                                fontSize: `${element.fontSize || 14}px`,
                                fontWeight: element.fontWeight || 'normal',
                                fontStyle: element.fontStyle || 'normal',
                                textDecoration: element.textDecoration || 'none'
                            }}
                        />
                        {!element.locked && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-50" onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}>
                                <Trash2 className="h-3 w-3 text-zinc-500 hover:text-red-500" />
                            </div>
                        )}
                        {element.locked && (
                            <div className="absolute top-2 left-2">
                                <Lock className="h-3 w-3 text-zinc-400" />
                            </div>
                        )}
                    </div>
                );
            case 'circle':
                return (
                    <div
                        className={`rounded-full shadow-md flex items-center justify-center relative group transition-all ${element.backgroundColor || "bg-white"} ${isSelected ? "ring-2 ring-indigo-500 ring-offset-2" : ""}`}
                        style={{
                            width: element.width || 140,
                            height: element.height || 140,
                            borderWidth: element.borderWidth || 2,
                            borderColor: element.borderColor || '#a1a1aa',
                            borderStyle: 'solid',
                            opacity: element.opacity || 1,
                            transform: `rotate(${element.rotation || 0}deg)`
                        }}
                        onClick={() => onSelect(element.id)}
                    >
                        <input
                            className="bg-transparent text-center w-24 focus:outline-none text-sm font-medium"
                            placeholder="Label"
                            value={element.content}
                            onChange={(e) => onUpdate(element.id, { content: e.target.value })}
                            disabled={element.locked}
                            style={{
                                fontSize: `${element.fontSize || 14}px`,
                                fontWeight: element.fontWeight || 'normal',
                                fontStyle: element.fontStyle || 'normal'
                            }}
                        />
                        {!element.locked && (
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-50" onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}>
                                <Trash2 className="h-3 w-3 text-zinc-500 hover:text-red-500" />
                            </div>
                        )}
                        {element.locked && (
                            <div className="absolute top-4 left-4">
                                <Lock className="h-3 w-3 text-zinc-400" />
                            </div>
                        )}
                    </div>
                );
            case 'text':
                return (
                    <div
                        className={`min-w-[100px] relative group p-2 transition-all ${isSelected ? "ring-2 ring-indigo-500 ring-offset-2 rounded" : ""}`}
                        style={{ opacity: element.opacity || 1, transform: `rotate(${element.rotation || 0}deg)` }}
                        onClick={() => onSelect(element.id)}
                    >
                        <textarea
                            className="bg-transparent text-lg font-medium text-zinc-900 focus:outline-none resize-none overflow-hidden h-auto min-h-[1.5em]"
                            placeholder="Type something..."
                            value={element.content}
                            onChange={(e) => {
                                onUpdate(element.id, { content: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            rows={1}
                            style={{
                                height: 'auto',
                                fontSize: `${element.fontSize || 18}px`,
                                fontWeight: element.fontWeight || 'normal',
                                fontStyle: element.fontStyle || 'normal',
                                textDecoration: element.textDecoration || 'none',
                                textAlign: (element.textAlign as any) || 'left',
                                color: element.color || '#18181b'
                            }}
                            disabled={element.locked}
                        />
                        {!element.locked && (
                            <div className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}>
                                <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                            </div>
                        )}
                        {element.locked && (
                            <div className="absolute -left-6 top-0">
                                <Lock className="h-3 w-3 text-zinc-400" />
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div
            style={{
                left: element.x,
                top: element.y,
                position: 'absolute',
                zIndex: element.zIndex || 1,
            }}
            className={`absolute ${element.locked ? "cursor-not-allowed" : "cursor-default"}`}
        >
            {!element.locked && mode === 'select' && (
                <div
                    className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white shadow-md border rounded px-2 py-1 cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity z-50 flex items-center gap-1"
                    onMouseDown={(e) => onDragStart(element.id, e)}
                >
                    <Move className="h-3 w-3 text-zinc-500" />
                    <span className="text-xs text-zinc-500">Drag</span>
                </div>
            )}
            {getElementContent()}
        </div>
    );
}

interface WhiteboardViewProps {
    spaceId?: string;
    projectId?: string;
    teamId?: string;
    viewId?: string;
    initialConfig?: any;
}

export default function WhiteboardView({ spaceId, projectId, teamId, viewId, initialConfig }: WhiteboardViewProps) {
    const [elements, setElements] = useState<WhiteboardElement[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [mode, setMode] = useState<'select' | 'pan'>('select');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [history, setHistory] = useState<WhiteboardElement[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [draggingElement, setDraggingElement] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    const addToHistory = (newElements: WhiteboardElement[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newElements);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setElements(history[historyIndex - 1]);
            setHasUnsavedChanges(true);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setElements(history[historyIndex + 1]);
            setHasUnsavedChanges(true);
        }
    };

    const addElement = (type: WhiteboardElement['type']) => {
        const newEl: WhiteboardElement = {
            id: Math.random().toString(36).slice(2, 11),
            type,
            x: 400 + (Math.random() * 100 - 50),
            y: 300 + (Math.random() * 100 - 50),
            content: "",
            backgroundColor: type === 'note' ? COLORS[0].hex : type === 'text' ? 'transparent' : '#ffffff',
            borderColor: type === 'rect' || type === 'circle' ? '#a1a1aa' : undefined,
            borderWidth: 2,
            fontSize: type === 'text' ? 18 : 14,
            opacity: 1,
            rotation: 0,
            zIndex: elements.length + 1
        };
        const newElements = [...elements, newEl];
        setElements(newElements);
        addToHistory(newElements);
        setHasUnsavedChanges(true);
        setSelectedElement(newEl.id);
    };

    const updateElement = (id: string, updates: Partial<WhiteboardElement>) => {
        const newElements = elements.map(e => e.id === id ? { ...e, ...updates } : e);
        setElements(newElements);
        addToHistory(newElements);
        setHasUnsavedChanges(true);
    };

    const deleteElement = (id: string) => {
        const newElements = elements.filter(e => e.id !== id);
        setElements(newElements);
        addToHistory(newElements);
        setHasUnsavedChanges(true);
        if (selectedElement === id) setSelectedElement(null);
    };

    const duplicateElement = () => {
        if (!selectedElement) return;
        const el = elements.find(e => e.id === selectedElement);
        if (!el) return;
        const newEl = { ...el, id: Math.random().toString(36).slice(2, 11), x: el.x + 20, y: el.y + 20 };
        const newElements = [...elements, newEl];
        setElements(newElements);
        addToHistory(newElements);
        setHasUnsavedChanges(true);
        setSelectedElement(newEl.id);
    };

    const toggleLock = () => {
        if (!selectedElement) return;
        updateElement(selectedElement, { locked: !elements.find(e => e.id === selectedElement)?.locked });
    };

    const bringToFront = () => {
        if (!selectedElement) return;
        const maxZ = Math.max(...elements.map(e => e.zIndex || 1));
        updateElement(selectedElement, { zIndex: maxZ + 1 });
    };

    const sendToBack = () => {
        if (!selectedElement) return;
        const minZ = Math.min(...elements.map(e => e.zIndex || 1));
        updateElement(selectedElement, { zIndex: minZ - 1 });
    };

    const exportWhiteboard = () => {
        const dataStr = JSON.stringify({ elements }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'whiteboard.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const importWhiteboard = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.elements) {
                    setElements(data.elements);
                    addToHistory(data.elements);
                    setHasUnsavedChanges(true);
                }
            } catch (err) {
                console.error('Failed to import');
            }
        };
        reader.readAsText(file);
    };

    const handleDragStart = (id: string, e: React.MouseEvent) => {
        const el = elements.find(e => e.id === id);
        if (!el) return;
        setDraggingElement(id);
        setDragOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
    };

    const handleDrag = (e: React.MouseEvent) => {
        if (!draggingElement) return;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        const newElements = elements.map(el =>
            el.id === draggingElement ? { ...el, x: newX, y: newY } : el
        );
        setElements(newElements);
    };

    const handleDragEnd = () => {
        if (draggingElement) {
            addToHistory(elements);
            setHasUnsavedChanges(true);
            setDraggingElement(null);
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (mode === 'pan') {
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        } else {
            setSelectedElement(null);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (isPanning && mode === 'pan') {
            setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
        if (draggingElement) {
            handleDrag(e);
        }
    };

    const handleCanvasMouseUp = () => {
        if (mode === 'pan') {
            setIsPanning(false);
        }
        handleDragEnd();
    };

    const selectedEl = elements.find(e => e.id === selectedElement);

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
            {/* Main Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white p-1.5 rounded-xl shadow-xl border border-zinc-200 flex items-center gap-1">
                <div className="flex items-center gap-1 pr-2 border-r border-zinc-200">
                    <Button
                        variant={mode === 'select' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('select')}
                        title="Select (V)"
                    >
                        <MousePointer className="h-4 w-4 mr-1" />
                        Select
                    </Button>
                    <Button
                        variant={mode === 'pan' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('pan')}
                        title="Pan (H)"
                    >
                        <Hand className="h-4 w-4 mr-1" />
                        Pan
                    </Button>
                </div>

                <div className="flex items-center gap-1 px-2 border-r border-zinc-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={() => addElement('note')}
                        title="Sticky Note (N)"
                    >
                        <StickyNote className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={() => addElement('text')}
                        title="Text (T)"
                    >
                        <Type className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={() => addElement('rect')}
                        title="Rectangle (R)"
                    >
                        <Square className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600"
                        onClick={() => addElement('circle')}
                        title="Circle (C)"
                    >
                        <Circle className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 px-2 border-r border-zinc-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={undo}
                        disabled={historyIndex === 0}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={redo}
                        disabled={historyIndex === history.length - 1}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 px-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={exportWhiteboard}
                        title="Export"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                    <label className="cursor-pointer">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 pointer-events-none"
                            title="Import"
                        >
                            <Upload className="h-4 w-4" />
                        </Button>
                        <input type="file" accept=".json" className="hidden" onChange={importWhiteboard} />
                    </label>
                </div>
            </div>

            {/* Element Toolbar */}
            {selectedEl && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-white p-1.5 rounded-xl shadow-xl border border-zinc-200 flex items-center gap-1">
                    {(selectedEl.type === 'text' || selectedEl.type === 'note') && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => updateElement(selectedEl.id, { fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                title="Bold"
                            >
                                <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => updateElement(selectedEl.id, { fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                title="Italic"
                            >
                                <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => updateElement(selectedEl.id, { textDecoration: selectedEl.textDecoration === 'underline' ? 'none' : 'underline' })}
                                title="Underline"
                            >
                                <Underline className="h-4 w-4" />
                            </Button>
                            <div className="border-l border-zinc-200 h-6 mx-1" />
                        </>
                    )}

                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Color"
                        >
                            <Palette className="h-4 w-4" />
                        </Button>
                        {showColorPicker && (
                            <div className="absolute top-12 left-0 bg-white p-2 rounded-lg shadow-xl border border-zinc-200 grid grid-cols-4 gap-2">
                                {COLORS.map(color => (
                                    <button
                                        key={color.hex}
                                        className={`w-8 h-8 rounded ${color.bg} border-2 ${color.border} hover:scale-110 transition-transform`}
                                        onClick={() => {
                                            updateElement(selectedEl.id, { backgroundColor: color.hex });
                                            setShowColorPicker(false);
                                        }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-l border-zinc-200 h-6 mx-1" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={toggleLock}
                        title={selectedEl.locked ? "Unlock" : "Lock"}
                    >
                        {selectedEl.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={duplicateElement}
                        title="Duplicate"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => deleteElement(selectedEl.id)}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            )}

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-40 bg-white p-1.5 rounded-xl shadow-xl border border-zinc-200 flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                    title="Zoom Out"
                >
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2 min-w-[60px] text-center">{zoom}%</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    title="Zoom In"
                >
                    <ZoomIn className="h-4 w-4" />
                </Button>
            </div>

            {/* Canvas */}
            <div
                ref={canvasRef}
                className={`flex-1 w-full h-full overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] ${mode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
            >
                <div
                    className="w-full h-full relative origin-top-left transition-transform duration-75 ease-out"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {elements.map(el => (
                        <DraggableElement
                            key={el.id}
                            element={el}
                            onUpdate={updateElement}
                            onDelete={deleteElement}
                            isSelected={selectedElement === el.id}
                            onSelect={setSelectedElement}
                            mode={mode}
                            isDragging={draggingElement === el.id}
                            onDragStart={handleDragStart}
                            onDrag={handleDrag}
                            onDragEnd={handleDragEnd}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
