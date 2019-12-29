import { ReactStateDeclaration } from '@uirouter/react';

export const states: ReactStateDeclaration[] = [
  {
    name: 'destiny2.setsmanager.**',
    url: '/sets',
    lazyLoad: async () => {
      const module = await import(/* webpackChunkName: "sets" */ './SetsManager');
      return {
        states: [
          {
            name: 'destiny2.setsmanager',
            url: '/sets',
            component: module.default
          }
        ]
      };
    }
  }
];
