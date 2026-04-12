import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'solicitudes', pathMatch: 'full' },
  {
    path: '',
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
