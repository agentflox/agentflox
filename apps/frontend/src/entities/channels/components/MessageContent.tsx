'use client';

import { Download, File, Image, Video, FileText, Music, Archive, X } from 'lucide-react';
import { useState } from 'react';

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
      {content && (
        <div className="break-words whitespace-pre-wrap">{content}</div>
      )}
      
      {attachmentsInfo.length > 0 && (
        <div className={`${content ? 'mt-2' : ''} space-y-2`}>
          <div className={`${attachmentsInfo.length > 1 ? 'grid grid-cols-2 gap-2' : ''}`}>
            {attachmentsInfo.map((attachment, index) => {
              const isImage = attachment.type.startsWith('image/');
              const isVideo = attachment.type.startsWith('video/');
              
              return (
                <div key={index} className="relative group">
                  {isImage ? (
                    <div
                      className="relative rounded-xl overflow-hidden cursor-pointer bg-gray-100/50 backdrop-blur-sm"
                      onClick={() => setSelectedMedia({ url: attachment.url, type: attachment.type })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-auto max-h-80 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(attachment.url, attachment.name);
                          }}
                          className="bg-white/95 hover:bg-white text-gray-800 p-3 rounded-full shadow-xl transform transition-all duration-200 hover:scale-110"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : isVideo ? (
                    <div className="relative rounded-xl overflow-hidden bg-gray-100/50 backdrop-blur-sm">
                      <video
                        src={attachment.url}
                        controls
                        className="w-full max-h-80 rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(attachment.url, attachment.name);
                          }}
                          className="bg-white/95 hover:bg-white text-gray-800 p-2.5 rounded-full shadow-xl transform transition-all duration-200 hover:scale-110"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 p-2 rounded-xl border transition-all duration-200 hover:shadow-md max-w-[280px] ${
                      isOwnMessage 
                        ? 'bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30' 
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}>
                      <div className={`flex-shrink-0 p-1.5 rounded-lg ${
                        isOwnMessage 
                          ? 'bg-white/30 text-white' 
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}>
                        {getFileIcon(attachment.type)}
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className={`text-xs font-semibold truncate ${
                          isOwnMessage 
                            ? 'text-white' 
                            : 'text-gray-900 dark:text-gray-100'
                        }`} title={attachment.name}>
                          {attachment.name}
                        </p>
                        <p className={`text-[10px] mt-0.5 uppercase ${
                          isOwnMessage 
                            ? 'text-white/80' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {attachment.type.split('/')[1] || 'FILE'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(attachment.url, attachment.name)}
                        className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                          isOwnMessage 
                            ? 'text-white hover:bg-white/20' 
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
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
