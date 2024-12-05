import { TagGroup } from '../types';

export const findGroupByName = (groups: TagGroup[], path: string[]): TagGroup | null => {
  if (path.length === 0) return null;
  const [current, ...rest] = path;
  const group = groups.find(g => g.name === current);
  if (!group) return null;
  if (rest.length === 0) return group;
  return group.groups ? findGroupByName(group.groups, rest) : null;
};

export const getUniqueGroupName = (baseName: string, groups: TagGroup[]): string => {
  const existingNames = new Set(groups.map(group => group.name));
  let counter = 1;
  let newName = baseName;
  
  while (existingNames.has(newName)) {
    newName = `${baseName}${counter}`;
    counter++;
  }
  
  return newName;
};