import React, { useState, useRef, useEffect } from 'react';
import { useYjs } from '../yjsRTC/YjsContext';
import { Button } from '@/components/ui/button';

function DebugYjs() {
  const { state, disconnect, reconnect, isConnected } = useYjs();
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const getStatusTextColor = () => {
    switch (state.status) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'disconnected':
      default:
        return 'text-gray-400';
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'disconnected':
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  if (isMinimized) {
    return (
      <div
        ref={dragRef}
        className="fixed z-50 cursor-move"
        style={{
          left: position.x || 'auto',
          top: position.y || 16,
          right: position.x ? 'auto' : 16,
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className={`${getStatusColor()} text-white px-4 py-2 rounded-lg shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2`}
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="font-medium">{getStatusText()}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      className="fixed z-50 bg-gray-900 border-2 border-gray-700 rounded-lg shadow-2xl text-white p-4 w-80"
      style={{
        left: position.x || 'auto',
        top: position.y || 16,
        right: position.x ? 'auto' : 16,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700 cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor()} ${state.status === 'connecting' ? 'animate-pulse' : ''}`}
          />
          <h3 className="font-bold text-lg">YJS Debug</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Minimize debug panel"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        </button>
      </div>

      {/* Status Section */}
      <div className="space-y-3 mb-4">
        <div className="bg-gray-800 rounded p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-sm">Status:</span>
            <span className={`font-semibold ${getStatusTextColor()}`}>
              {getStatusText()}
            </span>
          </div>

          {state.roomName && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400 text-sm">Room:</span>
              <span className="font-mono text-xs text-blue-400 truncate max-w-[150px]">
                {state.roomName}
              </span>
            </div>
          )}

          {state.signalingUrl && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400 text-sm">Server:</span>
              <span className="font-mono text-xs text-purple-400 truncate max-w-[150px]">
                {state.signalingUrl}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-sm">Role:</span>
            <span className="font-semibold text-cyan-400">
              {state.isHost ? 'Host' : 'Client'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Peers:</span>
            <span className="font-semibold text-green-400">
              {state.peersConnected}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="bg-red-900/30 border border-red-500 rounded p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-red-400 text-sm font-semibold mb-1">Error</p>
                <p className="text-red-300 text-xs">{state.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isConnected && (
          <>
            <Button
              onClick={async () => {
                try {
                  await disconnect();
                } catch (error) {
                  // eslint-disable-next-line no-console
                  console.error('Disconnect failed:', error);
                }
              }}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              Disconnect
            </Button>
            <Button
              onClick={async () => {
                try {
                  await reconnect();
                } catch (error) {
                  // eslint-disable-next-line no-console
                  console.error('Reconnect failed:', error);
                }
              }}
              variant="default"
              size="sm"
              className="flex-1"
            >
              Reconnect
            </Button>
          </>
        )}
        {!isConnected && state.status !== 'connecting' && (
          <div className="text-gray-500 text-sm italic text-center w-full py-2">
            Not connected to any room
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Only 1 room connection allowed at a time
        </p>
      </div>
    </div>
  );
}

export default DebugYjs;
