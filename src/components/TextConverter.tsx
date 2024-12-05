import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { translateText } from '../api/translate';
import { TagGroup } from '../types';
import { Sparkles, Undo, Redo } from 'lucide-react';

interface TextConverterProps {
  input: string;
  setInput: (input: string) => void;
  output: Array<{ ja: string; en: string }>;
  copiedLines?: boolean[];
  setCopiedLines?: React.Dispatch<React.SetStateAction<boolean[]>>;
  selectedLines?: boolean[];
  setSelectedLines?: React.Dispatch<React.SetStateAction<boolean[]>>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  converterState: { text: string; output: Array<{ ja: string; en: string }> };
  setConverterState: (state: { text: string; output: Array<{ ja: string; en: string }> }, action: string) => void;
}

export function TextConverter({
  input,
  setInput,
  output,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  converterState,
  setConverterState,
}: TextConverterProps) {
  const [progress, setProgress] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const findTagGroup = (tag: string): string | null => {
    const searchInGroups = (groups: TagGroup[], path: string[] = []): string[] => {
      let results: string[] = [];
      
      for (const group of groups) {
        const currentPath = [...path, group.name];
        if (group.tags && Object.keys(group.tags).includes(tag)) {
          results.push(currentPath.join(' > '));
        }
        if (group.groups) {
          results = [...results, ...searchInGroups(group.groups, currentPath)];
        }
      }
      return results;
    };

    try {
      const storedData = localStorage.getItem('tagData');
      if (!storedData) return null;
      
      const yamlData = JSON.parse(storedData) as TagGroup[];
      const allGroups = searchInGroups(yamlData);

      // タグが複数のグループに存在する場合、最も頻出するグループを返す
      if (allGroups.length > 0) {
        const groupCounts = allGroups.reduce<Record<string, number>>((acc, group) => {
          acc[group] = (acc[group] || 0) + 1;
          return acc;
        }, {});

        const mostFrequentGroup = Object.entries(groupCounts)
          .sort(([, a], [, b]) => b - a)[0][0];

        return mostFrequentGroup;
      }
      return null;
    } catch (error) {
      console.error('タグ存在チェックエラー:', error);
      return null;
    }
  };

  const handleCancelTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTranslating(false);
      setProgress(0);
      toast.info('変換を中断しました');
    }
  };

  const clearInput = () => {
    setConverterState(
      { 
        text: '', 
        output: [] 
      },
      'テキストをクリア'
    );
    setProgress(0);
    toast.info('入力をクリアしました');
  };

  const transformText = async () => {
    if (!input.trim()) {
      toast.error('テキストを入力してください');
      return;
    }

    setIsTranslating(true);
    setProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      const lines = input
        .replace(/BREAK/g, ',')
        .split(/[,\n]/)
        .map(line => line.trim())
        .filter(Boolean);

      const results: Array<{ ja: string; en: string }> = [];
      const totalLines = lines.length;

      for (let i = 0; i < lines.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const line = lines[i];
        const item = line.replace(/[()<>]/g, '').replace(/:\s*[+-]?\d+(\.\d+)?/, '');

        const existingGroup = findTagGroup(item);
        if (existingGroup) {
          const isNewTag = newTags.some(tag => tag.en === item);
          if (!isNewTag) {
            results.push({ ja: item, en: item });
            toast.info(`タグ "${item}" は既に "${existingGroup}" に存在します`);
            continue;
          }
        }

        try {
          if (item.includes('lora:')) {
            const match = item.match(/lora:([^\s:]+)/);
            if (match) {
              results.push({ ja: item, en: item });
            }
          } else {
            let englishTag: string;
            let japaneseText: string;

            const isJapaneseInput = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(item);

            if (isJapaneseInput) {
              englishTag = await translateText(item);
              japaneseText = item;
            } else {
              japaneseText = await translateText(item);
              englishTag = item.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '_')
                .replace(/-+/g, '_')
                .replace(/^_+|_+$/g, '');
            }

            results.push({ ja: japaneseText, en: englishTag });
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Conversion error:', error);
            toast.error('変換処理中にエラーが発生しました');
          }
          results.push({ ja: item, en: item });
        }

        setProgress(Math.round(((i + 1) / totalLines) * 100));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setConverterState({ ...converterState, output: results }, '変換結果を更新');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('変換処理中にエラーが発生しました');
    } finally {
      setIsTranslating(false);
      setProgress(0);
      abortControllerRef.current = null;
    }
  };

  const { newTags, existingTags } = output.reduce<{
    newTags: Array<{ ja: string; en: string }>;
    existingTags: Array<{ ja: string; en: string; groupPath: string }>;
  }>((acc, item) => {
    const groupPath = findTagGroup(item.en);
    if (groupPath) {
      acc.existingTags.push({ ...item, groupPath });
    } else {
      acc.newTags.push(item);
    }
    return acc;
  }, { newTags: [], existingTags: [] });

  const TagCard = ({ item, groupPath }: { 
    item: { ja: string; en: string }, 
    groupPath?: string 
  }) => (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          keys: [item.en],
          values: [item.ja],
          sourceGroup: 'converter'
        }));
      }}
      className={`relative group overflow-hidden ${
        groupPath
          ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800'
          : 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30'
      } rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700`}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {item.ja}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {item.en}
            </p>
          </div>
          {!groupPath && (
            <span className="flex-shrink-0 inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
              <Sparkles className="w-3 h-3 mr-1" />
              新規
            </span>
          )}
        </div>
        {groupPath && (
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
            <span>既存: {groupPath}</span>
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-white/10 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <CardHeader>
        <CardTitle>タグ生成</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <button 
                onClick={onUndo} 
                disabled={!canUndo}
                className={`p-1 ${canUndo ? 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}
                title="元に戻す"
              >
                <Undo className="h-5 w-5" />
              </button>
              <button 
                onClick={onRedo} 
                disabled={!canRedo}
                className={`p-1 ${canRedo ? 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}
                title="やり直し"
              >
                <Redo className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              {isTranslating && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleCancelTranslation}
                >
                  中断
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearInput}
                disabled={isTranslating}
              >
                クリア
              </Button>
            </div>
          </div>
          <Textarea
            value={input}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            rows={10}
            className="min-h-[200px] resize-none"
            disabled={isTranslating}
            placeholder="ここにタグを入力してください..."
          />
        </div>
        
        {isTranslating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">
              {progress}% 完了
            </p>
          </div>
        )}

        <Button 
          onClick={transformText} 
          className="w-full"
          disabled={isTranslating}
        >
          {isTranslating ? '翻訳中...' : '���換'}
        </Button>
        
        {newTags.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">新規タグ</h3>
            <div className="grid grid-cols-2 gap-4">
              {newTags.map((item, index) => (
                <TagCard key={index} item={item} />
              ))}
            </div>
          </div>
        )}

        {existingTags.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">既存のタグ</h3>
            <div className="grid grid-cols-2 gap-4">
              {existingTags.map((item, index) => (
                <TagCard key={index} item={item} groupPath={item.groupPath} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}