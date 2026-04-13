import { Routes } from '@angular/router';
import { authGuard, gestorGuard, adminGuard } from './core/guards/auth.guard';

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
        path: 'dashboard',
        canActivate: [gestorGuard],   // Solo Gestor y Admin
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'admin/usuarios',
        canActivate: [adminGuard],    // Solo Admin
        loadComponent: () =>
          import('./features/admin/usuarios/usuarios-admin.component').then(m => m.UsuariosAdminComponent),
      },
      {
        path: 'admin/categorias',
        canActivate: [adminGuard],    // Solo Admin
        loadComponent: () =>
          import('./features/admin/categorias/categorias-admin.component').then(m => m.CategoriasAdminComponent),
      },
      {
        path: 'admin/unidades-negocio',
        canActivate: [adminGuard],    // Solo Admin
        loadComponent: () =>
          import('./features/admin/unidades-negocio/unidades-negocio-admin.component').then(m => m.UnidadesNegocioAdminComponent),
      },
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
