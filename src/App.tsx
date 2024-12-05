import React, { useState, useEffect } from 'react';
import { TreeNode } from './components/TreeNode';
import { TagEditor } from './components/TagEditor';
import { TextConverter } from './components/TextConverter';
import { Plus, Upload, Save, Undo, Redo } from 'lucide-react';
import { toast } from 'sonner';
import { parse, stringify } from 'yaml';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { generateRandomColor } from './utils/colorUtils';
import { useHistory } from './hooks/useHistory';
import { TagGroup } from './types';
import { ThemeToggle } from './components/ThemeToggle';
import { findGroupByName, getUniqueGroupName } from './utils/groupUtils';

interface AppState {
  tags: TagGroup[];
  theme: string;
  columns: { left: number; right: number };
  text: string;
  converterOutput: Array<{ ja: string; en: string }>;
}

// 状態を保存する関数
const saveState = (state: AppState) => {
  localStorage.setItem('yamlEditorState', JSON.stringify({
    tags: state.tags,
    theme: state.theme || 'dark',
    columns: state.columns,
    text: state.text,
    converterOutput: state.converterOutput
  }));
};

// 状態を読み込む関数
const loadState = (): Partial<AppState> => {
  const saved = localStorage.getItem('yamlEditorState');
  return saved ? JSON.parse(saved) : {};
};

function App() {
  // 初期状態の読み込み
  const savedState = loadState();
  
  // useStateの初期値として使用
  const { 
    state: data, 
    setState: setData, 
    undo, 
    redo, 
    canUndo, 
    canRedo
  } = useHistory<TagGroup[]>(savedState.tags || [
    {
      name: '人物',
      color: '',
      tags: {},
      groups: [
        {
          name: 'キャラクター',
          color: 'rgba(255, 123, 2, .4)',
          tags: {
            __character__: 'キャラクター',
            solo: 'ソロ',
            '1girl': '1人の女の子'
          },
          groups: []
        }
      ]
    },
    {
      name: 'ワイルドカード',
      color: '',
      tags: {},
      groups: [
        {
          name: 'WC',
          color: 'rgba(255, 123, 2, .4)',
          tags: {},
          groups: []
        }
      ]
    }
  ]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [copiedLines, setCopiedLines] = useState<boolean[]>([]);
  const [selectedLines, setSelectedLines] = useState<boolean[]>([]);

  // useHistoryの追加
  const { 
    state: converterState,
    setState: setConverterState,
    undo: undoConverter,
    redo: redoConverter,
    canUndo: canUndoConverter,
    canRedo: canRedoConverter
  } = useHistory<{
    text: string;
    output: Array<{ ja: string; en: string }>;
  }>({
    text: savedState.text || '',
    output: savedState.converterOutput || []
  });

  // 状態が変更されたときに保存
  useEffect(() => {
    if (data !== savedState.tags) {
      saveState({
        tags: data,
        theme: savedState.theme || 'dark',
        columns: savedState.columns || { left: 25, right: 75 },
        text: converterState.text,
        converterOutput: converterState.output
      });
    }
  }, [data, savedState.theme, savedState.columns, converterState.text, converterState.output, savedState.tags]);

  const handleAddMainGroup = () => {
    const newGroup: TagGroup = {
      name: getUniqueGroupName('新しいグループ', data),
      color: generateRandomColor(),
      tags: {},
      groups: []
    };

    // Insert new group before the wildcard group
    const newData = [...data];
    newData.splice(data.length - 1, 0, newGroup);
    setData(newData, 'メイングループの追加');
    toast.success('新しいグループを追加した');
  };

  const handleToggle = (path: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSelect = (path: string) => {
    setSelectedNode(path);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = parse(content) as TagGroup[];
        
        // Ensure wildcard group exists and is at the end
        const wildcardGroup = parsedData.find(g => g.name === 'ワイルドカード');
        const otherGroups = parsedData.filter(g => g.name !== 'ワイルドカード');
        
        const finalData = [
          ...otherGroups,
          wildcardGroup || {
            name: 'ワイルドカード',
            color: '',
            tags: {},
            groups: [{
              name: 'WC',
              color: 'rgba(255, 123, 2, .4)',
              tags: {},
              groups: []
            }]
          }
        ];

        setData(finalData, 'YAMLファイルのインポート');
        localStorage.setItem('tagData', JSON.stringify(finalData));
        toast.success('YAMLファイルを正常にインポートしました。');
      } catch (error) {
        console.error('YAML import error:', error);
        toast.error('YAMLファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  const handleFileSave = () => {
    const formatGroup = (group: TagGroup): TagGroup => ({
      name: group.name,
      color: group.color || '',
      tags: group.tags || {},
      ...(group.groups && group.groups.length > 0 && { groups: group.groups.map(formatGroup) })
    });

    try {
      const formattedData = data.map(formatGroup);
      const yamlStr = stringify(formattedData, {
        indent: 2,
        lineWidth: -1
      });

      const getNextCustomNumber = () => {
        const customFiles = localStorage.getItem('customFileCount');
        const currentCount = customFiles ? parseInt(customFiles) : 0;
        const nextCount = currentCount + 1;
        localStorage.setItem('customFileCount', nextCount.toString());
        return nextCount;
      };

      const fileNumber = getNextCustomNumber();
      const fileName = `custom${fileNumber}.yaml`;

      const blob = new Blob([yamlStr], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`YAMLファイルを保存しました: ${fileName}`);
    } catch (error) {
      console.error('YAML export error:', error);
      toast.error('YAMLファイルの保存に失敗しました');
    }
  };

  const findDuplicateTag = (tagKey: string): string | null => {
    const searchInGroups = (groups: TagGroup[]): string | null => {
      for (const group of groups) {
        if (group.tags && tagKey in group.tags) {
          return group.name;
        }
        if (group.groups) {
          const duplicateInChild = searchInGroups(group.groups);
          if (duplicateInChild) return duplicateInChild;
        }
      }
      return null;
    };
    return searchInGroups(data);
  };

  const searchTags = (query: string): { key: string; value: string; groupPath: string[] }[] => {
    if (!query) return [];
    
    const results: { key: string; value: string; groupPath: string[] }[] = [];
    const searchQuery = query.toLowerCase();
    
    const searchInGroup = (group: TagGroup, path: string[] = []) => {
      const currentPath = [...path, group.name];
      
      if (group.tags) {
        Object.entries(group.tags).forEach(([key, value]) => {
          if (!value) return;
          
          const keyMatch = key.toLowerCase().includes(searchQuery);
          const valueMatch = value.toLowerCase().includes(searchQuery);
          
          if (keyMatch || valueMatch) {
            results.push({ 
              key, 
              value, 
              groupPath: currentPath 
            });
          }
        });
      }
      
      if (group.groups) {
        group.groups.forEach(subGroup => searchInGroup(subGroup, currentPath));
      }
    };
    
    data.forEach(group => searchInGroup(group));
    return results;
  };

  const handleMoveTag = (sourcePath: string[], targetPath: string[], tags: Record<string, string>) => {
    const targetGroup = findGroupByName(data, targetPath);
    if (!targetGroup) return;

    // タグの移動元の情報を取得
    const sourceInfo = sourcePath[0] === 'converter' ? 'テキストコンバーター' : sourcePath.join('/');

    const newData = [...data];
    const updateGroup = (groups: TagGroup[], path: string[]): TagGroup[] => {
      if (path.length === 0) return groups;
      const [current, ...rest] = path;
      return groups.map(group => {
        if (group.name !== current) return group;
        if (rest.length === 0) {
          return {
            ...group,
            tags: {
              ...group.tags,
              ...tags
            }
          };
        }
        return {
          ...group,
          groups: group.groups ? updateGroup(group.groups, rest) : []
        };
      });
    };

    const updatedData = updateGroup(newData, targetPath);
    setData(
      updatedData, 
      `タグを ${sourceInfo} から ${targetPath.join('/')} に移動`
    );
    toast.success('タグを移動しました');
  };

  const handleGroupUpdate = (updatedGroup: TagGroup) => {
    if (!selectedNode) return;
    const path = selectedNode.split('/');
    const newPath = [...path.slice(0, -1), updatedGroup.name].join('/');
    
    const updateSelectedGroup = (groups: TagGroup[], path: string[], updatedGroup: TagGroup): TagGroup[] => {
      if (path.length === 0) return groups;
      const [current, ...rest] = path;
      return groups.map(group => {
        if (group.name !== current) return group;
        if (rest.length === 0) return updatedGroup;
        return {
          ...group,
          groups: group.groups ? updateSelectedGroup(group.groups, rest, updatedGroup) : []
        };
      });
    };

    const newData = updateSelectedGroup(data, path, updatedGroup);
    setData(newData, `グループ "${updatedGroup.name}" を更新`);
    if (path[path.length - 1] !== updatedGroup.name) {
      setSelectedNode(newPath);
    }
  };

  const isMainGroup = selectedNode ? selectedNode.split('/').length === 1 : false;

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={20} minSize={15}>
          <div className="h-full border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">タグ構造</h2>
                  <button
                    onClick={handleAddMainGroup}
                    className="p-1 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="メイングループを追加"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={undo} 
                    disabled={!canUndo}
                    className={`p-1 ${canUndo ? 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}
                    title="元に戻す (Ctrl+Z)"
                  >
                    <Undo className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={redo} 
                    disabled={!canRedo}
                    className={`p-1 ${canRedo ? 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}
                    title="やり直し (Ctrl+Shift+Z)"
                  >
                    <Redo className="h-5 w-5" />
                  </button>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".yaml,.yml"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                    <Upload className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400" aria-label="インポート" />
                  </label>
                  <button onClick={handleFileSave} title="yamlファイル保存">
                    <Save className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400" />
                  </button>
                  <ThemeToggle />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <TreeNode
                data={data}
                expandedGroups={expandedGroups}
                selectedNode={selectedNode}
                onToggle={handleToggle}
                onSelect={handleSelect}
                onUpdate={setData}
                findDuplicateTag={findDuplicateTag}
                getUniqueGroupName={(baseName: string) => getUniqueGroupName(baseName, data)}
                handleMoveTag={handleMoveTag}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors duration-150" />

        <Panel defaultSize={45} minSize={30}>
          <div className="h-full border-r border-gray-200 dark:border-gray-700 p-4 overflow-auto">
            {selectedNode && (
              <TagEditor
                group={findGroupByName(data, selectedNode.split('/')) || { 
                  name: '', 
                  tags: {},
                  color: '',
                  groups: []
                }}
                onUpdate={handleGroupUpdate}
                findDuplicateTag={findDuplicateTag}
                searchTags={searchTags}
                isMainGroup={isMainGroup}
                handleMoveTag={handleMoveTag}
                selectedNode={selectedNode}
              />
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors duration-150" />

        <Panel defaultSize={35} minSize={25}>
          <div className="h-full p-4 overflow-auto">
            <TextConverter
              input={converterState.text}
              setInput={(text) => setConverterState({ ...converterState, text }, 'テキスト入力を更新')}
              output={converterState.output}
              copiedLines={copiedLines}
              setCopiedLines={setCopiedLines}
              selectedLines={selectedLines}
              setSelectedLines={setSelectedLines}
              onUndo={undoConverter}
              onRedo={redoConverter}
              canUndo={canUndoConverter}
              canRedo={canRedoConverter}
              setConverterState={setConverterState}
              converterState={converterState}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;