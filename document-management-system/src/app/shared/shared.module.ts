import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toolbar } from './components/toolbar';
import { TruncatePipe } from './pipes/truncate-pipe';
import { Autofocus } from './directives/autofocus';
import { FeatherIcon } from './directives/feather-icon';

@NgModule({
  declarations: [Toolbar],
  imports: [CommonModule, TruncatePipe, Autofocus, FeatherIcon],
  exports: [CommonModule, Toolbar, TruncatePipe, Autofocus, FeatherIcon],
})
export class SharedModule {}
