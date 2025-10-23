import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router';
import 'tailwindcss/index.css';
import { displayFiles } from '../syncthing/API';

interface FileInfo {
  name: string;
  [key: string]: any; // optional if there may be more fields
}

type prop= {
    roomName: string
}

function FilesDisplay({roomName}: prop) {
    const [files, setFiles] = useState<FileInfo[]>([]);
    useEffect(() => {
        async function handleDisplayFiles(){
            const response = await displayFiles(roomName);
            setFiles(response)
        }
        handleDisplayFiles();

    })

  return (
    <div>
        <ul>
            {files.map((x) => 
                <li key={x.name}>
                 {x.name}
            </li>
            )
            
            }
        </ul>
    </div>
  );
}

export default FilesDisplay


