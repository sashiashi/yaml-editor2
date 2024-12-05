import React from 'react';
import { Plus, Upload, Save, Undo, Redo } from 'lucide-react';

interface HeaderProps {
  onAddMainGroup: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onFileImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSave: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onAddMainGroup,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFileImport,
  onFileSave
}) => {
  return (
    <div className="sticky top-0 bg-gray-50 p-4 border-b border-gray-200 z-10">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">タグ構造</h2>
          <button
            onClick={onAddMainGroup}
            className="p-1 text-gray-600 hover:text-indigo-600"
            title="メイングループを追加"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className={`p-1 ${canUndo ? 'text-gray-600 hover:text-indigo-600' : 'text-gray-300'}`}
            title="元に戻す (Ctrl+Z)"
          >
            <Undo className="h-5 w-5" />
          </button>
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            className={`p-1 ${canRedo ? 'text-gray-600 hover:text-indigo-600' : 'text-gray-300'}`}
            title="やり直し (Ctrl+Shift+Z)"
          >
            <Redo className="h-5 w-5" />
          </button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={onFileImport}
              className="hidden"
            />
            <span title="インポート">
              <Upload className="h-5 w-5 text-gray-600 hover:text-indigo-600" />
            </span>
          </label>
          <button
            onClick={onFileSave}
            className="p-1 text-gray-600 hover:text-indigo-600"
            title="YAMLファイル保存"
          >
            <Save className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};