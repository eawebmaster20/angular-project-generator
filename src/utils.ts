import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface FileContent  { data: string; fileType: 'module' | 'standalone' }
export interface Schema {
  /** Name of the project. */
  project: string;

  /** Name of pre-built theme to install. */
  theme: 'azure-blue' | 'rose-red' | 'magenta-violet' | 'cyan-orange' | 'custom';

  /** Whether to set up global typography styles. */
  typography: boolean;
}

export function setAngularHttpClient(
    agVersion: number,
):FileContent {
    let fileContent: FileContent = {
        data:'',
        fileType:'module'
    }
  if (agVersion < 17) {
      fileContent.data=`
      import { NgModule } from '@angular/core';
        import { BrowserModule } from '@angular/platform-browser';
        import { HttpClientModule } from '@angular/common/http';

        @NgModule({
        imports: [
            BrowserModule,
            HttpClientModule,
        ],
        declarations: [
            AppComponent,
        ],
        bootstrap: [ AppComponent ]
        })
        export class AppModule {}
      `
        fileContent.fileType = 'module'
  } else if (agVersion >= 17 && agVersion < 19) {
        fileContent.data = `import { ApplicationConfig } from '@angular/core';
        import { provideRouter } from '@angular/router';
        import { routes } from './app.routes';
        import { provideHttpClient, withFetch } from '@angular/common/http';
        export const appConfig: ApplicationConfig = {
            providers: [
            provideRouter(routes),
            provideHttpClient(withFetch())
            ]
        };`;
        fileContent.fileType = 'standalone'
  }
  return fileContent;
}

export function addBootstrap(version:string, htmlFile:string){
    const $ = cheerio.load(htmlFile);
    const bootstrapCss = `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/css/bootstrap.min.css`;
    const bootstrapJs = `https://cdn.jsdelivr.net/npm/bootstrap@${version}/dist/js/bootstrap.bundle.min.js`;
    $('head').append(`<link rel="stylesheet" href="${bootstrapCss}">`);
    $('body').append(`<script src="${bootstrapJs}"></script>`);
    return $;
}

export function addAngularMaterial(projectPath:string, version:number,){
    if (version >= 17) {
        const appConfigPath = path.join(projectPath, 'src', 'app', 'app.config.ts');
        const indexHtmlPath = path.join(projectPath, 'src', 'index.html');
        const mainStylePath = path.join(projectPath, 'src', 'styles.css');
        const angularJsonPath = path.join(projectPath, 'angular.json');
        const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
        const appConfig = fs.readFileSync(appConfigPath, 'utf-8');
    }
}



