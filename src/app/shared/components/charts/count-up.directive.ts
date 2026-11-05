import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { formatFull, prefersReducedMotion } from './chart-format';

const DURATION_MS = 800;

/** Animates a number from its previous value to the new one. */
@Directive({ selector: '[appCountUp]', standalone: true })
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) appCountUp = 0;

  private el = inject(ElementRef<HTMLElement>);
  private shown = 0;
  private frame = 0;

  ngOnChanges(): void {
    cancelAnimationFrame(this.frame);
    const target = this.appCountUp;
    if (prefersReducedMotion()) {
      this.render(target);
      return;
    }
    const from = this.shown;
    this.render(from); // never blank, even if the tab isn't drawing frames yet
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.render(progress === 1 ? target : from + (target - from) * eased);
      if (progress < 1) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  private render(value: number): void {
    this.shown = value;
    this.el.nativeElement.textContent = formatFull(value);
  }
}
