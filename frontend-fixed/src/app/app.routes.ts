import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HistoryComponent } from './pages/history/history.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'historial', component: HistoryComponent },
    ],
  },
];
