import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { environment } from '../environments/environment';
import { ApiService } from './core/services/api/api.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [ FormsModule, CommonModule, MultiSelectModule, Select],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  angularVersions = [
    {version:'14'},
    {version:'15'},
    {version:'16'},
    {version:'17'},
    {version:'18'},
    {version:'19'},
  ];
  selectedAngularVersion = '17';

  styleLibraries= [
    {name: 'Angular Material', code: 'angular-material'},
    {name: 'Bootstrap', code: 'bootstrap'},
    {name: 'PrimeNG', code: 'primeNG'},
];
  selectedLibraries!: any[];

  graphLibraries = [
    {name:'chart.js'},
    {name:'d3'},
    {name:'echarts'},
    {name:'google charts'},
    {name:'highcharts'},
  ]
  selectedGraphLibraries!: any[];

  mapLibraries = [
    {name:'leaflet'},
    {name:'openLayers'}
  ]
  selectedMapLibraries!: any[];

  bootstrapVersions: string[] = []
  selectedBootstrapVersion!: string;
  loadingBootstrapVersions:boolean = false;

  result:any;
  useCss:boolean = false;
  setupFont:boolean = false;
  setupHttpClient:boolean = true;
  loading: boolean = false;

  figmaApiToken:string = '';
  figmaFilePath:string = 'C57bZYzWGEpVbS3S5FswXo';

  projectName:string = '';

  constructor(private http: HttpClient, private api:ApiService) {}

  ngOnInit(){
    this.figmaApiToken = environment.apiToken;
    this.getBootstrapVersions()
  }

  getBootstrapVersions(){
    this.loadingBootstrapVersions = true
     this.api.get<{tags:any, versions:string[]}>(`${environment.bootstrapApi}`)
     .pipe(take(1))
     .subscribe({
      next: (data) => {
         this.bootstrapVersions = data.versions;
         this.loadingBootstrapVersions = false
       },
       error: (error) => {
         console.log(error);
       }
     });
  }
  
  async extractDesignTokens(json: any) {
    let htmlOutput = `/* Generated Design html */\n:root {\n`;
    const tokens: any = {
      fonts: new Set<string>(),
      fontSizes: new Set<number>(),
      colors: new Set<string>()
    };
  
    const walk = (node: any) => {
      if (node.style) {
        if (node.style.fontFamily) tokens.fonts.add(node.style.fontFamily);
        if (node.style.fontSize) tokens.fontSizes.add(node.style.fontSize);
      }
  
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color) {
            const { r, g, b } = fill.color;
            const hex = this.rgbToHex(r, g, b);
            tokens.colors.add(hex);
          }
        });
      }

      htmlOutput += this.generateHTML(node);
  
      if (node.children) node.children.forEach(walk);
    };
  
    walk(json.document);
    this.generateCSS(tokens);
    // const component = await this.generateHTML(this.frame);
    // const component =  this.generateHTML(json.document);
    // console.log(component);
    // this.downloadFile(component, 'text/html', 'frameTest.html')
  }
  
  rgbToHex(r: number, g: number, b: number): string {
    const to255 = (v: number) => Math.round(v * 255);
    return `#${[r, g, b].map(to255).map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }

  generateCSS(tokens: {
    fonts: Set<string>,
    fontSizes: Set<number>,
    colors: Set<string>
  }) {
    let output = `/* Generated Design Tokens */\n:root {\n`;
    let fontImports = ``;
  
    [...tokens.fonts].forEach((font, i)=>{
      fontImports += `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}&display=swap');\n`
    });
    [...tokens.colors].forEach((color, i) => {
      output += `  --color-${i + 1}: ${color};\n`;
    });
  
    [...tokens.fontSizes].forEach((size, i) => {
      output += `  --font-size-${i + 1}: ${size}px;\n`;
    });
  
    [...tokens.fonts].forEach((font, i) => {
      output += `  --font-family-${i + 1}: '${font}';\n`;
    });
  
    output += `}\n`;
    output = fontImports + output;
    
    // console.log(output);
    const payload = {
      projectName: this.projectName,
      angular_v: this.selectedAngularVersion,
      setupHttpClient: this.setupHttpClient,
      styleLibraries: this.selectedLibraries,
      bootstrapVersion: this.selectedBootstrapVersion,
      graphLibraries: this.selectedGraphLibraries,
      mapLibraries: this.selectedMapLibraries,
      figmaApiToken: this.figmaApiToken,
      figmaFilePath: this.figmaFilePath,
      useCss: this.useCss,
      setupFont: this.setupFont,
      css:output
    }
    console.log('payload',payload);
    this.generateProject(payload);
    // optionally download it
    // this.downloadFile(output);
  }

  downloadFile(content: string, contentType: string = 'text/css', filename: string = 'theme.css') {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getFigmaJson(){
    this.loading = true;
    this.api.get(environment.baseUrl+'/'+ this.figmaFilePath, environment.apiToken)
    .pipe(take(1))
    .subscribe({
      next: (response) => {
        // console.log(response);
        this.loading = false;
        this.result = response;
        this.extractDesignTokens(response);
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
      }
    })
  }

  generateHTML(node: any, className = ''): string{
    if (node.type === 'TEXT') {
      return `<p class="${className}">${node.characters}</p>`;
    } else if (node.type === 'FRAME' || node.type === 'RECTANGLE') {
      // const children = (node.children || [])
      //   .map((child:any, i:any) => this.generateComponentCSS(child, `${className}-child${i}`))
      //   .join('\n');
      // return `<div class="${className}">\n${children}\n</div>`;
    }
    return '';
  }
  
  generateComponentCSS(node: any, className = ''): string {
    const style = node.style || {};
    const fills = node.fills?.[0]?.color;
    const cssLines: string[] = [];
  
    if (style.fontFamily) cssLines.push(`font-family: '${style.fontFamily}', sans-serif;`);
    if (style.fontSize) cssLines.push(`font-size: ${style.fontSize}px;`);
    if (style.fontWeight) cssLines.push(`font-weight: ${style.fontWeight};`);
    if (style.lineHeightPx) cssLines.push(`line-height: ${style.lineHeightPx}px;`);
    if (fills) {
      const r = Math.round(fills.r * 255);
      const g = Math.round(fills.g * 255);
      const b = Math.round(fills.b * 255);
      cssLines.push(`color: rgb(${r}, ${g}, ${b});`);
    }
  
    return `.${className} {\n  ${cssLines.join('\n  ')}\n}`;
  }

  generateProject(payload: any) {
    console.log('generating...');
    this.http.post(`/api/generate`, payload, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
        console.log('blob');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `angular-v${this.selectedAngularVersion}-project.zip`;
        a.click();
      },
      error: err => {
        console.log('error', err);
      }
    });
  }

  saveConfig(){
    
    this.getFigmaJson();
  }
}
