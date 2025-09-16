import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
// @ts-ignore - feather-icons has no official TS types
import feather from 'feather-icons';

@Directive({ selector: '[featherIcon]', standalone: true })
export class FeatherIcon implements OnChanges {
  @Input() featherIcon: string | undefined;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(): void {
    const name = (this.featherIcon || '').trim();
    const svg = (feather as any).icons?.[name]?.toSvg({ class: 'inline-block align-middle' }) || '';
    this.el.nativeElement.innerHTML = svg;
  }
}

