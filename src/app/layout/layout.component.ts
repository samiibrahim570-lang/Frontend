import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { IconComponent } from '../shared/components/icon/icon.component';
import { MENU_GROUPS, MENU_ICON_MAP } from '../shared/config/menu-groups.config';
import { MenuPermission } from '../core/models/auth.model';

interface DisplayGroup {
  label: string;
  menus: (MenuPermission & { icon: string })[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = true;
  mobileOpen = false;

  groupedMenus = computed<DisplayGroup[]>(() => {
    const visible = this.authService.visibleMenus;
    const groups: DisplayGroup[] = [];

    for (const group of MENU_GROUPS) {
      const menus = visible
        .filter((m) => group.keys.includes(m.menuKey.toUpperCase()))
        .sort((a, b) => group.keys.indexOf(a.menuKey.toUpperCase()) - group.keys.indexOf(b.menuKey.toUpperCase()))
        .map((m) => ({ ...m, icon: MENU_ICON_MAP[m.menuKey.toUpperCase()] || 'dashboard' }));

      if (menus.length > 0) {
        groups.push({ label: group.label, menus });
      }
    }
    return groups;
  });

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleMobile(): void {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobile(): void {
    this.mobileOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
