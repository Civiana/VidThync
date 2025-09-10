import React from 'react';
import * as Y from 'yjs';
import { useEffect, useState } from 'react';
type TestConnectionProps = {
  doc: Y.Doc | null;
};

const TestConnection = ({ doc }: TestConnectionProps) => {
  const [textValue, setTextValue] = useState('');
  const [textValue1, setTextValue1] = useState('');
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const env = envRef.current;
    if (!env) return;

    const ymap = env.ydoc.getMap('shared-data');

    ymap.set(e.target.title, e.target.value);
  };

  useEffect(() => {
    const ymap = doc?.getMap('shared-data');

    // Initialize from current doc content (might come from IndexedDB)
    // Using a specific key like 'textContent' to store our string
    const initialText = ymap?.get('textContent') || '';
    setTextValue(initialText);

    const observer = (event: any) => {
      // Listen for changes to the map
      if (event.keysChanged.has('textContent')) {
        const newText = ymap?.get('textContent') || '';
        setTextValue(newText);
      }
      if (event.keysChanged.has('textContent1')) {
        const newText = ymap?.get('textContent1') || '';
        setTextValue1(newText);
      }
    };
    ymap?.observe(observer);

    return () => {
      ymap?.unobserve(observer);
      if (doc) destroyYEnvironment(envRef.current);
      doc = null;
    };
  }, []);

  return (
    <div>
      <textarea
        className="w-full text-white h-48 p-2 rounded"
        title="textContent"
        value={textValue}
        onChange={onChange}
        placeholder="Type here. Open a second window or machine with the same room to see live sync."
      />
      <textarea
        className="w-full text-white h-48 p-2 rounded"
        title="textContent1"
        value={textValue1}
        onChange={onChange}
        placeholder="Type here. Open a second window or machine with the same room to see live sync."
      />
    </div>
  );
};

export default TestConnection;
