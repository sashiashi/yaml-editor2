export interface TagGroup {
  name: string;
  color: string;
  tags: Record<string, string>;
  groups?: TagGroup[];
}

export const createDefaultGroup = (name: string): TagGroup => ({
  name,
  color: 'rgba(255, 123, 2, 0.4)',
  tags: {},
  groups: []
});