import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { App } from './app';
import { appRoutes } from './app.routes';
import { SharedModule } from './shared/shared.module';
import { tokenInterceptor } from './auth/token.interceptor';

@NgModule({
  declarations: [App],
  imports: [BrowserModule, SharedModule, RouterModule.forRoot(appRoutes)],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([tokenInterceptor])),
  ],
  bootstrap: [App],
})
export class AppModule {}
