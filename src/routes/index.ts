import HomeIcon from '@mui/icons-material/Home';

import asyncComponentLoader from '@/utils/loader';

import NotFoundRedirect from './NotFoundRedirect';
import { Routes } from './types';

const routes: Routes = [
  {
    component: asyncComponentLoader(() => import('@/pages/Welcome')),
    path: '/',
    title: 'Welcome',
    icon: HomeIcon,
  },
  {
    component: NotFoundRedirect,
    path: '*',
  },
];

export default routes;
