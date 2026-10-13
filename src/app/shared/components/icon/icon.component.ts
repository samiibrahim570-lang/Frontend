import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      @switch (name) {
        @case ('dashboard') {
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/>
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/>
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/>
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>
        }
        @case ('category') {
          <path d="M3 12 12 3l9 9-9 9-9-9z"/>
          <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none"/>
        }
        @case ('item') {
          <path d="M21 8v8a1 1 0 0 1-.5.87l-8 4.5a1 1 0 0 1-1 0l-8-4.5A1 1 0 0 1 3 16V8"/>
          <path d="M3 8l9-5 9 5-9 5-9-5z"/>
          <path d="M12 13v8"/>
        }
        @case ('customer') {
          <circle cx="12" cy="8" r="3.4"/>
          <path d="M4.5 20c1-3.8 4.2-6 7.5-6s6.5 2.2 7.5 6"/>
        }
        @case ('supplier') {
          <rect x="2" y="7" width="12" height="9" rx="1"/>
          <path d="M14 10h4l3.5 3.5V16h-7.5z"/>
          <circle cx="6.5" cy="18" r="1.6"/>
          <circle cx="17" cy="18" r="1.6"/>
        }
        @case ('booker') {
          <rect x="4" y="3" width="16" height="18" rx="2"/>
          <circle cx="12" cy="9" r="2.4"/>
          <path d="M8 16.5c.7-1.8 2.2-2.7 4-2.7s3.3.9 4 2.7"/>
        }
        @case ('sale') {
          <circle cx="9" cy="20" r="1.3"/>
          <circle cx="17" cy="20" r="1.3"/>
          <path d="M3 4h2l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8a1.6 1.6 0 0 0 1.6-1.3L20 8H6"/>
        }
        @case ('purchase') {
          <path d="M6 8h12l-1 12H7L6 8z"/>
          <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
        }
        @case ('production') {
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
        }
        @case ('voucher') {
          <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3z"/>
          <path d="M8 8h8M8 12h8M8 16h4"/>
        }
        @case ('ledger') {
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5v-13z"/>
          <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>
        }
        @case ('stockledger') {
          <path d="M3 7l9-4 9 4-9 4-9-4z"/>
          <path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>
        }
        @case ('gatepass') {
          <rect x="1.5" y="9" width="13" height="7" rx="1"/>
          <path d="M14.5 11h4l3.5 3v2h-7.5z"/>
          <circle cx="6" cy="18" r="1.6"/>
          <circle cx="17" cy="18" r="1.6"/>
          <path d="M4 9V6h5"/>
        }
        @case ('reports') {
          <path d="M4 20V10M11 20V4M18 20v-7"/>
          <path d="M2 20h20"/>
        }
        @case ('users') {
          <circle cx="9" cy="8" r="3"/>
          <path d="M2.5 20c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5"/>
          <circle cx="17.5" cy="9" r="2.3"/>
          <path d="M16 14.3c2 .2 3.8 1.8 4.5 4.2"/>
        }
        @case ('roles') {
          <path d="M12 2l7 3v6c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V5l7-3z"/>
          <path d="M9 12l2 2 4-4"/>
        }
        @case ('print') {
          <path d="M6 9V3h12v6"/>
          <rect x="4" y="9" width="16" height="8" rx="1"/>
          <path d="M6 17v4h12v-4"/>
        }
        @case ('logout') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <path d="M16 17l5-5-5-5"/>
          <path d="M21 12H9"/>
        }
        @case ('menu') {
          <path d="M3 6h18M3 12h18M3 18h18"/>
        }
        @case ('chevron') {
          <path d="M9 18l6-6-6-6"/>
        }
        @case ('back') {
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        }
        @default {
          <circle cx="12" cy="12" r="8"/>
        }
      }
    </svg>
  `
})
export class IconComponent {
  @Input() name: string = '';
  @Input() size: number = 18;
}
