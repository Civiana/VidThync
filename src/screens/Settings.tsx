import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAppSettings, saveAppSettings, AppSettings } from 'src/utils/state';
import { ArrowLeft, Save, Folder, CheckCircle } from 'lucide-react';

function Settings() {
  const navigate = useNavigate();
  const [playerPath, setPlayerPath] = useState('');
  const [syncplayHostURL, setSyncplayHostURL] = useState('');
  const [serverpass, setServerpass] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const settings = await getAppSettings();
        setPlayerPath(settings.playerPath || '');
        setSyncplayHostURL(settings.syncplayHostURL || '');
        setServerpass(settings.serverpass || '');
        setUsername(settings.username || '');
      } catch (err) {
        console.error('[Settings] Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handlePickPlayerFile = async () => {
    if (window.electronAPI?.selectFile) {
      const selected = await window.electronAPI.selectFile();
      if (selected) {
        setPlayerPath(selected);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveAppSettings({
        playerPath: playerPath.trim(),
        syncplayHostURL: syncplayHostURL.trim(),
        serverpass: serverpass.trim(),
        username: username.trim(),
      });
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error('[Settings] Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-800 text-white">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white p-8 overflow-auto">
      <div className="max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex items-center gap-2 bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
          <h1 className="text-2xl font-bold">App Settings</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6 bg-gray-800/80 p-6 rounded-xl border border-gray-700 shadow-xl">
          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-200">
              Player Path (e.g. MPV, VLC)
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={playerPath}
                onChange={(e) => setPlayerPath(e.target.value)}
                placeholder="/usr/bin/mpv or C:\Program Files\mpv\mpv.exe"
                className="flex-1 bg-gray-900 border-gray-700 text-white placeholder-gray-500"
              />
              <Button
                type="button"
                onClick={handlePickPlayerFile}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Folder className="w-4 h-4" /> Browse
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Path to media player executable used by Syncplay.
            </p>
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-200">
              Syncplay Host URL
            </Label>
            <Input
              type="text"
              value={syncplayHostURL}
              onChange={(e) => setSyncplayHostURL(e.target.value)}
              placeholder="syncplay.pl:8996"
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Syncplay server address and port (default: syncplay.pl:8996).
            </p>
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-200">
              Server Password (Optional)
            </Label>
            <Input
              type="password"
              value={serverpass}
              onChange={(e) => setServerpass(e.target.value)}
              placeholder="Enter server password"
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-200">
              Username
            </Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your Syncplay Display Name"
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 py-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>

            {savedMessage && (
              <span className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Settings saved successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
