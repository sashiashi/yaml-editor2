import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FolderIcon, Trash2, Plus, Check, Edit } from 'lucide-react';
import { TagGroup } from '../types';
import { generateRandomColor } from '../utils/colorUtils';
import { toast } from 'sonner';

interface TreeNodeProps {
  data: TagGroup[];
  expandedGroups: Set<string>;
  selectedNode: string | null;
  parentPath?: string;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onUpdate: (newData: TagGroup[], action?: string) => void;
  findDuplicateTag?: (tagKey: string, currentPath?: string) => string | null;
  getUniqueGroupName: (baseName: string, groups: TagGroup[]) => string;
  handleMoveTag: (sourcePath: string[], targetPath: string[], tags: Record<string, string>) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  data,
  expandedGroups,
  selectedNode,
  parentPath = '',
  onToggle,
  onSelect,
  onUpdate,
  findDuplicateTag,
  getUniqueGroupName,
  handleMoveTag
}) => {
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleMainGroupClick = (group: TagGroup, currentPath: string) => {
    if (!parentPath && group.groups && group.groups.length > 0) {
      onToggle(currentPath);
      const firstSubgroup = group.groups[0];
      const subgroupPath = `${currentPath}/${firstSubgroup.name}`;
      onSelect(subgroupPath);
      if (!expandedGroups.has(currentPath)) {
        onToggle(currentPath);
      }
    } else {
      onSelect(currentPath);
    }
  };

  const handleAddSubGroup = (parentIndex: number) => {
    const newData = [...data];
    const parent = newData[parentIndex];
    parent.groups = parent.groups || [];

    const subgroupNumbers = parent.groups
      .map(g => {
        const match = g.name.match(/^サブグループ(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const nextNumber = subgroupNumbers.length > 0 
      ? Math.max(...subgroupNumbers) + 1 
      : 1;

    const groupName = `サブグループ${nextNumber}`;
    
    const newGroup = {
      name: groupName,
      color: generateRandomColor(),
      tags: {},
      groups: []
    };
    parent.groups.push(newGroup);
    onUpdate(newData, 'サブグループの追加');
  };

  const handleDeleteGroup = (index: number, groupName: string) => {
    if (window.confirm(`「${groupName}」グループを削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
      const newData = [...data];
      newData.splice(index, 1);
      onUpdate(newData, 'グループの削除');
      toast.success(`「${groupName}」グループを削除しました`);
    }
  };

  const handleStartEditing = (index: number, name: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingGroupIndex(index);
    setEditingName(name);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleNameSave = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (editingName.trim() === '') {
      toast.error('グループ名を入力してください');
      return;
    }

    const newData = [...data];
    newData[index] = { ...newData[index], name: editingName.trim() };
    onUpdate(newData, 'グループ名の変更');
    setEditingGroupIndex(null);
    setEditingName('');
  };

  const handleNameCancel = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setEditingGroupIndex(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleNameSave(index, e as unknown as React.MouseEvent);
    } else if (e.key === 'Escape') {
      handleNameCancel(e as unknown as React.MouseEvent);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, group: TagGroup, index: number) => {
    e.stopPropagation();
    const dragData = {
      type: 'group',
      group,
      sourceIndex: index,
      sourcePath: parentPath,
      isSubgroup: !!parentPath
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/json')) {
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetGroup: TagGroup, targetIndex: number) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';

    try {
      const dropData = JSON.parse(e.dataTransfer.getData('application/json'));

      if (dropData.keys && dropData.values && dropData.sourceGroup) {
        if (!parentPath) {
          toast.error('メイングループにタグを移動することはできません');
          return;
        }

        const currentPath = parentPath ? `${parentPath}/${targetGroup.name}` : targetGroup.name;
        const sourcePath = dropData.sourceGroup.split('/');
        const targetPath = currentPath.split('/');
        const tagsToMove = Object.fromEntries(dropData.keys.map((key: string, i: number) => [key, dropData.values[i]]));
        handleMoveTag(sourcePath, targetPath, tagsToMove);
        return;
      }

      if (dropData.type === 'group') {
        const { group: draggedGroup, sourceIndex, sourcePath, isSubgroup } = dropData;
        
        // メイングループ間のサブグループ移動
        if (isSubgroup && !parentPath) {
          const sourceMainGroup = data.find(g => g.name === sourcePath);
          const targetMainGroup = data[targetIndex];
          
          if (sourceMainGroup && targetMainGroup) {
            const newData = [...data];
            
            // 元のメイングループからサブグループを削除
            sourceMainGroup.groups = sourceMainGroup.groups?.filter((_, i) => i !== sourceIndex);
            
            // 新しいメイングループにサブグループを追加
            targetMainGroup.groups = targetMainGroup.groups || [];
            targetMainGroup.groups.push(draggedGroup);
            
            onUpdate(newData, 'サブグループの移動');
            toast.success('サブグループを移動しました');
            return;
          }
        }

        // 同じレベル内での順序変更
        if (sourcePath === parentPath) {
          const newData = [...data];
          newData.splice(sourceIndex, 1);
          newData.splice(targetIndex, 0, draggedGroup);
          onUpdate(newData, 'グループの順序変更');
          toast.success('グループの順序を変更しました');
        }
      }
    } catch (error) {
      console.error('ドロップ処理に失敗しました:', error);
      toast.error('移動に失敗しました');
    }
  };

  return (
    <div className="space-y-1">
      {data.map((group, index) => {
        const currentPath = parentPath ? `${parentPath}/${group.name}` : group.name;
        const isExpanded = expandedGroups.has(currentPath);
        const isSelected = selectedNode === currentPath;
        const hasChildren = group.groups && group.groups.length > 0;
        const isMainGroup = !parentPath;
        const isEditing = editingGroupIndex === index;

        return (
          <div key={`${currentPath}-${index}`} className="group">
            <div 
              className={`flex items-center transition-colors`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group, index)}
            >
              <div
                className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer flex-grow ${
                  isSelected ? 'bg-indigo-100 dark:bg-indigo-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => {
                  if (!isEditing) {
                    handleMainGroupClick(group, currentPath);
                  }
                }}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, group, index)}
              >
                <div className="flex items-center space-x-2 flex-grow">
                  {hasChildren ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(currentPath);
                      }}
                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                  ) : (
                    <div className="w-5" />
                  )}
                  <FolderIcon
                    className="h-4 w-4"
                    style={{ color: isMainGroup ? undefined : group.color }}
                  />
                  {isEditing ? (
                    <div className="flex items-center space-x-1 flex-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={handleNameChange}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="px-2 py-0.5 border rounded flex-1 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => handleNameSave(index, e)}
                        className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900 rounded"
                        title="変更を保存"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="select-none flex-1 dark:text-white"
                      >
                        {group.name}
                      </span>
                      {group.tags && Object.keys(group.tags).length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({Object.keys(group.tags).length})
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                    {isMainGroup && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(index, group.name, e);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          title="グループ名を変更"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSubGroup(index);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          title="サブグループを追加"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {!isMainGroup && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditing(index, group.name, e);
                        }}
                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="グループ名を変更"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(index, group.name);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="グループを削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isExpanded && group.groups && (
              <div className="ml-6 mt-1">
                <TreeNode
                  data={group.groups}
                  expandedGroups={expandedGroups}
                  selectedNode={selectedNode}
                  parentPath={currentPath}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onUpdate={(newGroups, action) => {
                    const newData = [...data];
                    newData[index] = { ...group, groups: newGroups };
                    onUpdate(newData, action);
                  }}
                  findDuplicateTag={findDuplicateTag}
                  getUniqueGroupName={getUniqueGroupName}
                  handleMoveTag={handleMoveTag}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};