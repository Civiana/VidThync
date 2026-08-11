import React, { useEffect, useState } from 'react';
import { Film, Play, CheckCircle2 } from 'lucide-react';
import { displayFiles, subscribeToSyncthingEvents } from '../syncthing/API';
import { getAppSettings } from 'src/utils/state';

interface FileInfo {
  name: string;
  size?: number;
  modTime?: string;
  [key: string]: any;
}

type prop = {
  roomName: string;
  onSelectFile?: (file: FileInfo) => void;
  folderPath: string;
};

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mkv',
  'webm',
  'avi',
  'mov',
  'wmv',
  'flv',
  'm4v',
  'ts',
  'ogv',
  '3gp',
  'mpg',
  'mpeg',
  'vob',
  'm2ts',
  'divx',
  'asf',
]);

export const isVideoFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? VIDEO_EXTENSIONS.has(ext) : false;
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FilesDisplay({ roomName, onSelectFile, folderPath }: prop) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function handleDisplayFiles() {
      try {
        const response = await displayFiles(roomName);
        if (isMounted && Array.isArray(response)) {
          setFiles(response);
        }
      } catch (err) {
        console.error('[FilesDisplay] Error fetching files:', err);
      }
    }

    handleDisplayFiles();

    subscribeToSyncthingEvents(
      0,
      (_event) => {
        if (isMounted) {
          handleDisplayFiles();
        }
      },
      controller.signal,
    );

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [roomName]);

  const videoFiles = Array.isArray(files)
    ? files.filter((x) => isVideoFile(x.name))
    : [];

  const handleCardClick = async (file: FileInfo) => {
    setSelectedFileName(file.name);
    if (onSelectFile) {
      onSelectFile(file);
    }

    try {
      const settings = await getAppSettings();
      const host = settings.syncplayHostURL || 'syncplay.pl:8996';
      const serverPass = settings.serverpass || '';
      const username = settings.username || 'User';
      const room = roomName || 'DefaultRoom';
      const playerPath = settings.playerPath || '/usr/bin/mpv';
      const videoPath = folderPath ? `${folderPath}/${file.name}` : file.name;
      const enableGui = false;

      const result = await window.electronAPI.startSyncplay(
        host,
        serverPass,
        username,
        room,
        playerPath,
        videoPath,
        enableGui,
      );
      console.log('[FilesDisplay] Syncplay started:', result);
    } catch (err) {
      console.error('[FilesDisplay] Failed to start Syncplay:', err);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Film className="w-5 h-5 text-blue-400" />
          Synced Videos ({videoFiles.length})
        </h3>
      </div>

      {videoFiles.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-gray-700 bg-gray-900/50">
          <Film className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-gray-400">
            No synced video files found in this room.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoFiles.map((file) => {
            const ext = file.name.split('.').pop()?.toUpperCase() || 'VIDEO';
            const isSelected = selectedFileName === file.name;

            return (
              <div
                key={file.name}
                onClick={() => handleCardClick(file)}
                className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'border-gray-700 bg-gray-800/80 hover:border-blue-500/60 hover:bg-gray-800 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-200">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-gray-700/60 text-gray-300 group-hover:bg-blue-500/20 group-hover:text-blue-300">
                      {ext}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                </div>

                <div>
                  <h4
                    className="font-medium text-sm text-gray-100 group-hover:text-blue-300 transition-colors line-clamp-2 break-all"
                    title={file.name}
                  >
                    {file.name}
                  </h4>
                  {file.size ? (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatBytes(file.size)}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FilesDisplay;





