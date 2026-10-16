import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { IconComponent } from '../shared/components/icon/icon.component';
import { MENU_GROUPS, MENU_ICON_MAP } from '../shared/config/menu-groups.config';
import { MenuPermission } from '../core/models/auth.model';
import { StockAlertService } from '../core/services/stock-alert.service';
import { NotificationBellComponent } from '../shared/components/notification-bell/notification-bell.component';
import { ThemeSwitcherComponent } from '../shared/components/theme-switcher/theme-switcher.component';
import { GlobalSearchComponent } from '../shared/components/global-search/global-search.component';
import { TenantService } from '../core/services/tenant.service';

interface DisplayGroup {
  label: string;
  menus: (MenuPermission & { icon: string })[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent, NotificationBellComponent, ThemeSwitcherComponent, GlobalSearchComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  authService = inject(AuthService);
  stock = inject(StockAlertService);
  tenant = inject(TenantService);
  private router = inject(Router);

  logoUrl = computed(() => this.tenant.logoUrl(this.tenant.currentCompany()?.logoPath));
  companyInitials = computed(() => {
    const name = this.tenant.currentCompany()?.name ?? 'Fish Feed';
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  });

  ngOnInit(): void {
    // allowed companies/branches for the switcher; warm the letterhead cache used by exports
    this.tenant.loadContext().subscribe(() => this.tenant.letterhead().subscribe());
  }

  onCompanyChange(value: string): void {
    const id = Number(value);
    if (id && id !== this.tenant.companyId()) this.tenant.switchTo(id); // default branch of that company
  }

  onBranchChange(value: string): void {
    const id = Number(value);
    const companyId = this.tenant.companyId();
    if (id && companyId && id !== this.tenant.branchId()) this.tenant.switchTo(companyId, id);
  }

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
