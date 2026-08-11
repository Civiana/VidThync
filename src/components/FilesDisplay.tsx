import React, { useEffect, useState } from 'react';
import { displayFiles, subscribeToSyncthingEvents } from '../syncthing/API';

interface FileInfo {
  name: string;
  [key: string]: any; // optional if there may be more fields
}

type prop = {
  roomName: string;
};

function FilesDisplay({ roomName }: prop) {
  const [files, setFiles] = useState<FileInfo[]>([]);

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

  return (
    <div>
      <ul>
        {Array.isArray(files) &&
          files.map((x) => <li key={x.name}>{x.name}</li>)}
      </ul>
    </div>
  );
}

export default FilesDisplay;



