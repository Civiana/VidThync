import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';

export type YEnvironment = {
  ydoc: Y.Doc;
  idb: IndexeddbPersistence;
  webrtc: WebrtcProvider;
  roomName: string;
};
// this function creates a customisable synced and shared YDOC using the same room name.
export function createYEnvironment(
  roomName: string,
  Url: string,
  port: string
): YEnvironment {
  const ydoc = new Y.Doc();

  // Persist the document to IndexedDB under the specified room name
  const idb = new IndexeddbPersistence(roomName, ydoc);
  const signalingURL = `ws://${Url}:${port}`
  // Connect to peers via WebRTC (using local signaling server), Zaki notice how we pass the same ydoc
  // to WebrtcProvider because we want to share the same document with all peers
  const webrtc = new WebrtcProvider(roomName, ydoc, {
    signaling: [signalingURL],
  });

  webrtc.on('status', ({ status }) => {
    console.log('[y-webrtc]', status);
  });

  return { ydoc, idb, webrtc, roomName };
}

export function destroyYEnvironment(env: YEnvironment) {
  // destroy WebRTC connections on cleanup
  env.idb.del(env.roomName);
  env.idb.destroy();
  env.ydoc.destroy();
  env.webrtc.destroy();
}
