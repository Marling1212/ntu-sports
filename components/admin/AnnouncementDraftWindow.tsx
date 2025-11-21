"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export interface AnnouncementDraft {
  id: string;
  matchId: string;
  matchInfo: string;
  changeType: "status" | "date" | "score";
  originalValue: string;
  newValue: string;
  content: string;
}

interface AnnouncementDraftWindowProps {
  drafts: AnnouncementDraft[];
  onUpdateDraft: (id: string, content: string) => void;
  onRemoveDraft: (id: string) => void;
  onPublish: (drafts: AnnouncementDraft[], combinedContent: string) => Promise<void>;
  eventId: string;
}

export default function AnnouncementDraftWindow({
  drafts,
  onUpdateDraft,
  onRemoveDraft,
  onPublish,
  eventId,
}: AnnouncementDraftWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeOffset, setResizeOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [combinedContent, setCombinedContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);

  // Initialize position and size on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({ x: window.innerWidth - 420, y: 100 });
      setSize({ width: 400, height: 600 });
    }
  }, []);

  // Update combined content when drafts change
  useEffect(() => {
    if (drafts.length === 0) return;
    
    const content = drafts.map(d => d.content).join("\n\n");
    setCombinedContent(content);
  }, [drafts]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("textarea, button, input")) return;
    
    setIsDragging(true);
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep window within viewport
    const currentWidth = windowRef.current?.offsetWidth || size.width;
    const currentHeight = windowRef.current?.offsetHeight || size.height;
    const maxX = window.innerWidth - currentWidth;
    const maxY = window.innerHeight - currentHeight;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging, dragOffset, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setResizeOffset({
        x: e.clientX - rect.right,
        y: e.clientY - rect.bottom,
      });
    }
  }, []);

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const minWidth = 300;
    const maxWidth = Math.min(800, window.innerWidth - position.x);
    const minHeight = 300;
    const maxHeight = Math.min(800, window.innerHeight - position.y - 20);
    
    const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX - position.x));
    const newHeight = Math.max(minHeight, Math.min(maxHeight, e.clientY - position.y));
    
    setSize({
      width: newWidth,
      height: newHeight,
    });
  }, [isResizing, position]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleResizeMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleMouseUp]);

  const handlePublish = async () => {
    if (drafts.length === 0) {
      toast.error("沒有公告內容可發布");
      return;
    }

    if (!combinedContent.trim()) {
      toast.error("請輸入公告內容");
      return;
    }

    setIsPublishing(true);
    try {
      // Pass drafts and the combined content (which may have been edited by user)
      await onPublish(drafts, combinedContent);
      toast.success("公告發布成功！");
    } catch (error) {
      toast.error("發布失敗，請重試");
      console.error("Publish error:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  if (drafts.length === 0) return null;

  return (
    <div
      ref={windowRef}
      className={`fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-ntu-green flex flex-col ${
        isMinimized ? "h-auto" : ""
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? "auto" : `${size.height}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Header - Draggable */}
      <div
        className="bg-ntu-green text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <h3 className="font-semibold text-lg">公告草稿 ({drafts.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-green-700 rounded px-2 py-1 transition-colors"
            title={isMinimized ? "展開" : "最小化"}
          >
            {isMinimized ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Draft List */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3 border-b scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200" 
            style={{ 
              maxHeight: `${Math.max(200, size.height - 300)}px`,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch"
            }}
          >
            {drafts.map((draft) => (
              <div key={draft.id} className="bg-gray-50 rounded p-3 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">{draft.matchInfo}</div>
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">{draft.changeType === "status" ? "狀態" : draft.changeType === "date" ? "日期" : "比數"}</span>
                      : {draft.originalValue} → {draft.newValue}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveDraft(draft.id)}
                    className="text-red-500 hover:text-red-700 text-sm ml-2"
                    title="移除"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={draft.content}
                  onChange={(e) => onUpdateDraft(draft.id, e.target.value)}
                  className="w-full text-sm p-2 border border-gray-300 rounded resize-none"
                  rows={3}
                  placeholder="編輯公告內容..."
                />
              </div>
            ))}
          </div>

          {/* Combined Content Editor */}
          <div className="p-4 border-b bg-gray-50">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              合併內容（將作為單一公告發布）:
            </label>
            <textarea
              value={combinedContent}
              onChange={(e) => setCombinedContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded resize-none text-sm"
              rows={6}
              placeholder="所有變更的公告內容將合併在這裡..."
            />
          </div>

          {/* Actions */}
          <div className="p-4 flex gap-2">
            <button
              onClick={handlePublish}
              disabled={isPublishing || !combinedContent.trim()}
              className="flex-1 bg-ntu-green text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isPublishing ? "發布中..." : `發布公告 (${drafts.length} 項變更)`}
            </button>
            <button
              onClick={() => {
                drafts.forEach(d => onRemoveDraft(d.id));
              }}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              清除全部
            </button>
          </div>
        </>
      )}

      {/* Resize Handle */}
      {!isMinimized && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize bg-ntu-green opacity-50 hover:opacity-100 transition-opacity rounded-tl-lg"
          style={{
            clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
          }}
          title="拖動調整大小"
        >
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 border-r-2 border-b-2 border-white opacity-70"></div>
        </div>
      )}
    </div>
  );
}

