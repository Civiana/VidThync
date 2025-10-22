import React from 'react';
import { useEffect, useState } from 'react';
import { useYDoc } from '../yjsRTC/YjsContext';

const TestConnection = () => {
  const [textValue, setTextValue] = useState('');
  const [textValue1, setTextValue1] = useState('');
  const doc = useYDoc();

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!doc) return;

    const ymap = doc.getMap('shared-data');
    ymap.set(e.target.title, e.target.value);
  };

  useEffect(() => {
    if (!doc) {
      setTextValue('');
      setTextValue1('');
      return;
    }

    const ymap = doc.getMap('shared-data');

    // Initialize from current doc content (might come from IndexedDB)
    const initialText = ymap.get('textContent') || '';
    const initialText1 = ymap.get('textContent1') || '';
    setTextValue(initialText as string);
    setTextValue1(initialText1 as string);

    const observer = (event: any) => {
      // Listen for changes to the map
      if (event.keysChanged.has('textContent')) {
        const newText = ymap.get('textContent') || '';
        setTextValue(newText as string);
      }
      if (event.keysChanged.has('textContent1')) {
        const newText = ymap.get('textContent1') || '';
        setTextValue1(newText as string);
      }
    };

    ymap.observe(observer);

    return () => {
      ymap.unobserve(observer);
    };
  }, [doc]);

  if (!doc) {
    return (
      <div className="text-gray-400 text-center p-4">
        Not connected. Connect to a room to test live sync.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Test Field 1
        </label>
        <textarea
          className="w-full text-white bg-gray-700 border border-gray-600 h-32 p-2 rounded focus:border-blue-500 focus:outline-none"
          title="textContent"
          value={textValue}
          onChange={onChange}
          placeholder="Type here. Open a second window or machine with the same room to see live sync."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Test Field 2
        </label>
        <textarea
          className="w-full text-white bg-gray-700 border border-gray-600 h-32 p-2 rounded focus:border-blue-500 focus:outline-none"
          title="textContent1"
          value={textValue1}
          onChange={onChange}
          placeholder="Type here. Open a second window or machine with the same room to see live sync."
        />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Changes sync in real-time across all connected peers
      </p>
    </div>
  );
};

export default TestConnection;
