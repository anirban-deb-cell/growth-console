import { Component, input } from '@angular/core';

export type IconName = 'briefcase' | 'grid' | 'megaphone' | 'search' | 'doc' | 'star' | 'globe' | 'chevrons' | 'alert' | 'trend' | 'warning' | 'plus' | 'check' | 'inbox';

/** Inline stroke icons — no icon font, inherits the text colour. */
@Component({
  selector: 'app-icon',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('briefcase') { <path d="M3 7h18v13H3zM8 7V4h8v3"/> }
        @case ('grid') { <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/> }
        @case ('megaphone') { <path d="M3 11l15-6v14L3 13zM7 13v5a2 2 0 0 0 4 0v-4"/> }
        @case ('search') { <circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/> }
        @case ('doc') { <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5"/> }
        @case ('star') { <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/> }
        @case ('globe') { <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/> }
        @case ('chevrons') { <path d="M7 10l5-5 5 5M7 14l5 5 5-5"/> }
        @case ('alert') { <circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/> }
        @case ('trend') { <path d="M3 17l6-6 4 4 8-8M15 7h6v6"/> }
        @case ('warning') { <path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
        @case ('check') { <path d="M5 12l5 5 9-10"/> }
        @case ('inbox') { <path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1.5 3h5L16 13h5"/> }
      }
    </svg>
  `,
  styles: `:host{display:inline-flex;flex:none;line-height:0}`
})
export class IconComponent {
  name = input.required<IconName>();
  size = input(18);
}
