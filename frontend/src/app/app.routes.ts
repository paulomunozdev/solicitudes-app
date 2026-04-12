import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'solicitudes', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'solicitudes',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/solicitudes/list/solicitudes-list.component')
                .then(m => m.SolicitudesListComponent),
          },
          {
            path: 'nueva',
            loadComponent: () =>
              import('./features/solicitudes/create/solicitudes-create.component')
                .then(m => m.SolicitudesCreateComponent),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/solicitudes/detail/solicitudes-detail.component')
                .then(m => m.SolicitudesDetailComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'solicitudes' },
];
