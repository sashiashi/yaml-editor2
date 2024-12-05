import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Search, X, Copy, Edit2, Trash2, FileDown, Plus, Wand2, Grid2x2, Grid3x3, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { translateText } from '../api/translate';
import { TagGroup } from '../types';
import { ColorPicker } from './ColorPicker';

interface TagEditorProps {
  group: TagGroup;
  onUpdate: (group: TagGroup) => void;
  findDuplicateTag?: (tagKey: string, currentPath?: string) => string | null;
  searchTags: (query: string) => { key: string; value: string; groupPath: string[] }[];
  isMainGroup?: boolean;
  handleMoveTag: (sourcePath: string[], targetPath: string[], tags: Record<string, string>) => void;
  selectedNode: string;
}

interface EditingTag {
  key: string;
  value: string;
  originalKey: string;
}

interface ExportState {
  tags: ExportTag[];
  filename: string;
}

interface ExportTag {
  key: string;
  value: string;
  selected: boolean;
}

interface DragItem {
  key: string;
  index: number;
}

export const TagEditor: React.FC<TagEditorProps> = ({
  group,
  onUpdate,
  findDuplicateTag,
  searchTags,
  isMainGroup,
  handleMoveTag,
  selectedNode
}) => {
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null);
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showNewTagPopup, setShowNewTagPopup] = useState(false);
  const [newTagInput, setNewTagInput] = useState({ ja: '', en: '' });
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ tags: [], filename: '' });
  const [isTranslating, setIsTranslating] = useState(false);
  const [columns, setColumns] = useState(3);
  const popupRef = useRef<HTMLDivElement>(null);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  const handleColumnChange = (newColumns: number) => {
    setColumns(newColumns);
  };

  const handleExportTags = () => {
    const tags = Object.entries(group.tags).map(([key, value]) => ({
      key,
      value,
      selected: true
    }));
    setExportState({
      tags,
      filename: group.name
    });
    setShowExportPopup(true);
  };

  const handleConfirmExport = async () => {
    try {
      const selectedTags = exportState.tags.filter(tag => tag.selected);
      if (selectedTags.length === 0) {
        toast.error('エクスポートするタグを選択してさい');
        return;
      }

      const content = selectedTags.map(tag => tag.key).join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportState.filename}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportPopup(false);
      toast.success(`${selectedTags.length}個のタグをエクスポートしました`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('エクスポート中にエラーが発生しました');
    }
  };

  const handleTagSave = () => {
    if (!editingTag) return;

    const newTags = Object.fromEntries(
      Object.entries(group.tags)
        .filter(([key]) => key !== editingTag.originalKey)
    );
    newTags[editingTag.key] = editingTag.value;
    
    onUpdate({ ...group, tags: newTags });
    setEditingTag(null);
    toast.success('タグを更新しました');
  };

  const handleEditClick = (key: string, value: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setEditPosition({
      x: rect.left,
      y: rect.bottom + window.scrollY
    });
    setEditingTag({ key, value, originalKey: key });
  };

  const handleRemoveTag = (key: string) => {
    const entries = Object.entries(group.tags);
    const filteredEntries = entries.filter(([k]) => k !== key);
    const newTags = Object.fromEntries(filteredEntries);
    onUpdate({ ...group, tags: newTags });
  };

  const handleRemoveSelectedTags = () => {
    if (selectedTags.size === 0) return;
    
    const entries = Object.entries(group.tags);
    const filteredEntries = entries.filter(([key]) => !selectedTags.has(key));
    const newTags = Object.fromEntries(filteredEntries);
    onUpdate({ ...group, tags: newTags });
    setSelectedTags(new Set());
    
    toast.success(`${selectedTags.size}個のタグを削除しました`);
  };

  const handleCopyTag = (key: string) => {
    if (selectedTags.size > 0) {
      const selectedKeys = Array.from(selectedTags);
      navigator.clipboard.writeText(selectedKeys.join('\n'));
      toast.success(`${selectedTags.size}個のタグをコピーしました`);
    } else {
      navigator.clipboard.writeText(key);
      toast.success('タグをコピーしました');
    }
  };

  const handleTagClick = (key: string, event: React.MouseEvent) => {
    if (event.altKey) {
      setSelectedTags(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(key)) {
          newSelection.delete(key);
        } else {
          newSelection.add(key);
        }
        return newSelection;
      });
    } else if (!selectedTags.has(key)) {
      setSelectedTags(new Set());
    }
  };

  const handleTranslateJapanese = async () => {
    if (!newTagInput.ja) {
      toast.error('日本語を入力してください');
      return;
    }

    setIsTranslating(true);

    try {
      const translatedText = await translateText(newTagInput.ja);
      const englishTag = translatedText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_')
        .replace(/^_+|_+$/g, '');

      setNewTagInput(prev => ({ ...prev, en: englishTag }));
      toast.success('翻訳が完了しました');
    } catch (error) {
      console.error('Translation error:', error);
      if (error instanceof Error) {
        toast.error(`翻訳中にエラーが発生しまた: ${error.message}`);
      } else {
        toast.error('翻訳中に予期せぬエラーが発生しました');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAddNewTag = () => {
    if (!newTagInput.ja && !newTagInput.en) {
      toast.error('日本語また英語を入力してください');
      return;
    }

    const key = newTagInput.en;
    const value = newTagInput.ja || newTagInput.en;

    if (findDuplicateTag) {
      const duplicateGroup = findDuplicateTag(key);
      if (duplicateGroup && duplicateGroup !== group.name) {
        toast.error(`タグ "${key}" はに "${duplicateGroup}" グループに存在します`);
        return;
      }
    }

    const newTags = {
      ...group.tags,
      [key]: value
    };

    onUpdate({ ...group, tags: newTags });
    setShowNewTagPopup(false);
    setNewTagInput({ ja: '', en: '' });
    toast.success('新しいタグを追加しました');
  };

  const handleDragStart = (key: string, index: number, e: React.DragEvent) => {
    setDraggedItem({ key, index });
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.5';

    e.dataTransfer.setData('application/json', JSON.stringify({
      keys: selectedTags.size > 0 ? Array.from(selectedTags) : [key],
      values: selectedTags.size > 0 
        ? Array.from(selectedTags).map(k => group.tags[k])
        : [group.tags[key]],
      sourceGroup: selectedNode
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedItem || draggedItem.index === targetIndex) return;

    const entries = Object.entries(group.tags);
    const [draggedKey, draggedValue] = entries[draggedItem.index];
    
    entries.splice(draggedItem.index, 1);
    entries.splice(targetIndex, 0, [draggedKey, draggedValue]);
    
    const newTags = Object.fromEntries(entries);
    onUpdate({ ...group, tags: newTags });
    setDraggedItem({ key: draggedKey, index: targetIndex });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.sourceGroup === 'converter') {
        const targetPath = selectedNode.split('/');
        handleMoveTag(['converter'], targetPath, {
          [data.keys[0]]: data.values[0]
        });
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  };

  const searchResults = searchQuery ? searchTags(searchQuery) : [];
  const showGlobalSearch = searchQuery.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{group.name}</h2>
          <ColorPicker
            color={group.color}
            onChange={(color) => onUpdate({ ...group, color })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleColumnChange(3)}
            className={`p-2 rounded-md ${columns === 3 ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}
            title="3列表示"
          >
            <Grid2x2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleColumnChange(4)}
            className={`p-2 rounded-md ${columns === 4 ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}
            title="4列表示"
          >
            <Grid3x3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleColumnChange(6)}
            className={`p-2 rounded-md ${columns === 6 ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}
            title="6列表示"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タグを検索..."
              className="w-full px-4 py-2 pl-10 pr-8 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="検索をクリア"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!isMainGroup && (
            <>
              <button
                onClick={() => setShowNewTagPopup(true)}
                className="px-6 py-2 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors flex items-center space-x-2"
                title="新規タグを追加"
              >
                <Plus className="h-5 w-5" />
                <span>新規タグを追加</span>
              </button>
              <button
                onClick={handleExportTags}
                className="px-6 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center space-x-2"
                title="タグをエクスポート"
              >
                <FileDown className="h-5 w-5" />
                <span>タグをエクスポート</span>
              </button>
            </>
          )}

          {selectedTags.size > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCopyTag('')}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="選択したタグをコピー"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={handleRemoveSelectedTags}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="選択したタグを削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedTags.size}個選択中
              </span>
            </div>
          )}
        </div>

        <div className={`grid grid-cols-${columns} gap-3`}>
          {showGlobalSearch ? (
            searchResults.map(({ key, value, groupPath }, index) => (
              <div
                key={`${key}-${index}`}
                className="flex flex-col p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900 dark:text-white mb-1">{value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{key}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {groupPath.join(' > ')}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyTag(key);
                    }}
                    className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 ml-2"
                    title="タグをコピー"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            Object.entries(group.tags || {}).map(([key, value], index) => (
              <div
                key={key}
                draggable
                onDragStart={(e) => handleDragStart(key, index, e)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                onClick={(e) => handleTagClick(key, e)}
                className={`tag-item flex flex-col p-3 rounded-lg shadow-sm hover:shadow transition-shadow cursor-move ${
                  selectedTags.has(key) ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
                }`}
                style={{ backgroundColor: group.color }}
              >
                <div className="flex items-center justify-between group">
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900 dark:text-white mb-1">{value}</div>
                    <div className="text-sm text-gray-600 dark:text-white">{key}</div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(key, value, e);
                      }}
                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="タを編集"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTag(key);
                      }}
                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="タグをコピー"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(key);
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="タグを削除"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingTag && (
        <div
          ref={popupRef}
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
          style={{
            top: editPosition.y,
            left: editPosition.x
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                日本語
              </label>
              <input
                type="text"
                value={editingTag.value}
                onChange={(e) => setEditingTag({ ...editingTag, value: e.target.value })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                英語
              </label>
              <input
                type="text"
                value={editingTag.key}
                onChange={(e) => setEditingTag({ ...editingTag, key: e.target.value })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingTag(null)}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={handleTagSave}
                className="px-3 py-1 text-sm bg-indigo-500 dark:bg-indigo-600 text-white rounded hover:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewTagPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">新規タグを追加</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  日本語
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTagInput.ja}
                    onChange={(e) => setNewTagInput(prev => ({ ...prev, ja: e.target.value }))}
                    placeholder="タグの日本語入力..."
                    className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <Button
                    onClick={handleTranslateJapanese}
                    disabled={isTranslating || !newTagInput.ja}
                    className="flex items-center space-x-1"
                  >
                    <Wand2 className="h-4 w-4" />
                    <span>翻訳</span>
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  英語
                </label>
                <input
                  type="text"
                  value={newTagInput.en}
                  onChange={(e) => setNewTagInput(prev => ({ ...prev, en: e.target.value }))}
                  placeholder="タグの英語名を入力..."
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowNewTagPopup(false);
                    setNewTagInput({ ja: '', en: '' });
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddNewTag}
                  className="px-4 py-2 text-sm bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">タグをエクスポート</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ファイル名
                </label>
                <input
                  type="text"
                  value={exportState.filename}
                  onChange={(e) => setExportState(prev => ({ ...prev, filename: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="ファイル名を入力..."
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={exportState.tags.every(tag => tag.selected)}
                          onChange={(e) => {
                            setExportState(prev => ({
                              ...prev,
                              tags: prev.tags.map(tag => ({
                                ...tag,
                                selected: e.target.checked
                              }))
                            }));
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-white">日本語</th>
                      <th className="px-4 py-2 text-left text-gray-900 dark:text-white">英語</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportState.tags.map((tag, index) => (
                      <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={tag.selected}
                            onChange={(e) => {
                              setExportState(prev => ({
                                ...prev,
                                tags: prev.tags.map((t, i) => 
                                  i === index ? { ...t, selected: e.target.checked } : t
                                )
                              }));
                            }}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-4 py-2 text-gray-900 dark:text-white">{tag.value}</td>
                        <td className="px-4 py-2 text-gray-900 dark:text-white">{tag.key}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowExportPopup(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirmExport}
                  className="px-4 py-2 text-sm bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700"
                >
                  エクスポート
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};