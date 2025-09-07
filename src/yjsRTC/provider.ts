import { WebrtcProvider } from 'y-webrtc';
import * as Y from 'yjs';

const getProvider = (
  signalingServerIP: string,
  ydoc: Y.Doc,
  roomName: string,
) => {
  return new WebrtcProvider(roomName, ydoc, {
    signaling: [signalingServerIP],
  });
};
export default getProvider;
