import { TagGroup } from './types';

export const wildcardGroup: TagGroup = {
  name: 'ワイルドカード',
  color: '',
  tags: {},
  groups: [
    {
      name: 'WC',
      color: 'rgba(167, 139, 250, 0.4)',
      tags: {},
      groups: []
    }
  ]
};

export const initialData: TagGroup[] = [{
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
}, wildcardGroup];