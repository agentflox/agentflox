'use client';

import { Download, File, Image, Video, FileText, Music, Archive, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface MessageContentProps {
  content: string;
  attachments?: string[];
  isOwnMessage?: boolean;
}

interface AttachmentInfo {
  url: string;
  name: string;
  type: string;
}

export function MessageContent({ content, attachments = [], isOwnMessage = false }: MessageContentProps) {
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
  const submission = (() => {
    const prefix = '__AF_MARKETPLACE_SUBMISSION__';
    if (!content?.startsWith(prefix)) return null;
    try {
      return JSON.parse(content.slice(prefix.length));
    } catch {
      return null;
    }
  })();

  const stripHtml = (html: string) =>
    String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const parseAttachment = (url: string): AttachmentInfo => {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0];
    const name = decodeURIComponent(filename);
    
    const extension = name.split('.').pop()?.toLowerCase() || '';
    let type = 'application/octet-stream';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      type = 'image/' + (extension === 'jpg' ? 'jpeg' : extension);
    } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
      type = 'video/' + (extension === 'mov' ? 'quicktime' : extension);
    } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
      type = 'audio/' + extension;
    } else if (extension === 'pdf') {
      type = 'application/pdf';
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      type = 'application/zip';
    }
    
    return { url, name, type };
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (type === 'application/zip') return <Archive className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const attachmentsInfo = attachments.map(parseAttachment);

  return (
    <>
      {submission ? (
        <div className="w-full min-w-[200px]">
          {submission?.application?.answers && typeof submission.application.answers === 'object' && (
            <div className="space-y-3.5 w-full">
              {Object.entries(submission.application.answers as Record<string, any>).map(([key, data]) => {
                const label = (data && typeof data === 'object' && 'label' in data) ? data.label : key;
                const value = (data && typeof data === 'object' && 'value' in data) ? data.value : data;
                return (
                  <div key={key} className="text-[13px] leading-relaxed w-full">
                    <div className={`font-bold tracking-tight mb-0.5 ${isOwnMessage ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>{label}</div>
                    <div className={`break-words whitespace-pre-wrap ${isOwnMessage ? 'text-blue-50/90' : 'text-zinc-600 dark:text-zinc-300'}`}>
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        content && (
          <div className="break-words whitespace-pre-wrap text-[15px] leading-relaxed">{content}</div>
        )
      )}
      
      {attachmentsInfo.length > 0 && (
        <div className={`${content ? 'mt-3' : ''} space-y-2.5`}>
          <div className={`${attachmentsInfo.length > 1 ? 'grid grid-cols-2 gap-2.5' : ''}`}>
            {attachmentsInfo.map((attachment, index) => {
              const isImage = attachment.type.startsWith('image/');
              const isVideo = attachment.type.startsWith('video/');
              
              return (
                <div key={index} className="relative group/media">
                  {isImage ? (
                    <div
                      className="relative rounded-[20px] overflow-hidden cursor-pointer bg-zinc-100/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm transition-all duration-300 hover:shadow-md"
                      onClick={() => setSelectedMedia({ url: attachment.url, type: attachment.type })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        loading="lazy"
                        className="w-full h-auto max-h-[360px] object-cover transition-transform duration-500 group-hover/media:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors duration-300"></div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(attachment.url, attachment.name);
                        }}
                        className="absolute top-3 right-3 bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 text-white p-2.5 rounded-full shadow-lg opacity-0 group-hover/media:opacity-100 transition-all duration-300 ease-out hover:scale-110"
                        title="Download"
                      >
                        <Download className="h-4 w-4 drop-shadow-sm" />
                      </button>
                    </div>
                  ) : isVideo ? (
                    <div className="relative rounded-[20px] overflow-hidden bg-zinc-100/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-sm transition-all duration-300 hover:shadow-md">
                      <video
                        src={attachment.url}
                        controls
                        className="w-full max-h-[360px] object-cover"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute top-3 right-3 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(attachment.url, attachment.name);
                          }}
                          className="bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 text-white p-2.5 rounded-full shadow-lg transform transition-all duration-200 hover:scale-110"
                          title="Download"
                        >
                          <Download className="h-4 w-4 drop-shadow-sm" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => handleDownload(attachment.url, attachment.name)}
                      className={`group/file flex w-full max-w-[320px] items-center gap-3.5 p-3 rounded-[20px] border cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                        isOwnMessage 
                          ? 'bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20' 
                          : 'bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-300/50 dark:hover:border-indigo-500/50 shadow-sm'
                      }`}
                    >
                      <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-[14px] transition-transform duration-300 group-hover/file:scale-105 ${
                        isOwnMessage 
                          ? 'bg-white/20 text-white' 
                          : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {getFileIcon(attachment.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-bold leading-tight truncate ${
                          isOwnMessage ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'
                        }`} title={attachment.name}>
                          {attachment.name}
                        </p>
                        <div className={`flex items-center gap-1.5 mt-1 text-[10px] font-bold tracking-wider uppercase ${
                          isOwnMessage ? 'text-blue-100/70' : 'text-zinc-500 dark:text-zinc-500'
                        }`}>
                          <span>{attachment.type.split('/')[1] || 'FILE'}</span>
                          <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                          <span>ATTACHMENT</span>
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                          isOwnMessage 
                            ? 'bg-white/10 text-white group-hover/file:bg-white/20' 
                            : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 group-hover/file:bg-indigo-100 dark:group-hover/file:bg-indigo-500/20 group-hover/file:text-indigo-600 dark:group-hover/file:text-indigo-400'
                        }`}
                      >
                        <Download className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
          {selectedMedia.type.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedMedia.url}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={selectedMedia.url}
              controls
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
