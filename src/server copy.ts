import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import { exec } from 'child_process';
import * as os from 'os';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { addBootstrap, setAngularHttpClient } from './utils.js';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */

app.get('/api/**', (req, res) => {
  res.send('api is working');
} );

app.use(express.json());

app.post('/api/generate', async (req, res) => {
  const { 
    projectName, 
    angular_v, 
    setupHttpClient, 
    css, 
    setupAngularMaterial, 
    bootstrapVersion,
    styleLibraries
  } = req.body;
  console.log('...stage 1...');
  // return;
  // const __dirname = dirname(fileURLToPath(import.meta.url));
  const tempDir = path.join(os.tmpdir(), 'angular-generator-tmp');
  // const tempDir = path.join(__dirname, 'tmp');
  const projectPath = path.join(tempDir, projectName);
  const styleCssPath = path.join(projectPath, 'src', 'styles.css');

  const filePath = path.join(projectPath, 'src', 'index.html');
  

  
  
  // Clean up old
  fs.rmSync(projectPath, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  
  const command = `npx -p @angular/cli@${angular_v} ng new ${projectName} --defaults --skip-install`;
  
  exec(command, { cwd: tempDir }, (error) => {
    if (error) {
      console.error('Error executing command:', error);
      res.json({err:error})
      return; 
    };

    fs.writeFileSync(styleCssPath, css, 'utf-8');
    
    const html = fs.readFileSync(filePath, 'utf-8');

    console.log('...stage 2...');
    // setupBootstrap
    if (bootstrapVersion){
      const $ = addBootstrap(bootstrapVersion, html)
      fs.writeFileSync(filePath, $.html());
    }

    console.log('...stage 3...');
    // setupAngularHttpClient
    if (setupHttpClient) {
      const { data, fileType } = setAngularHttpClient(angular_v);
      const appModulePath = path.join(projectPath, 'src', 'app', 'app.module.ts');
      const appConfigPath = path.join(projectPath, 'src', 'app', 'app.config.ts');
      if (fileType === 'standalone') {
        fs.writeFileSync(appConfigPath, data, 'utf-8');
      }
      else {
        fs.writeFileSync(appModulePath, data, 'utf-8');
      }
    }

    console.log('...stage 4...');
    // Add Angular Material if requested
    if (styleLibraries.includes('angular-material')) {
      const addMaterialCommand = `npx -p @angular/cli@${angular_v} ng add @angular/material --skip-confirmation --skip-install`;
      console.log('...stage 5...');
      
      exec(addMaterialCommand, { cwd: projectPath }, (materialError) => {
        if (materialError) {
          console.error('Error adding Angular Material:', materialError);
          // Continue with packaging even if Material fails
        }
        
        console.log('Adding Angular Material after...');
        // Package the project after adding Material
        packageProject();
      });
    } else {
      console.log('...stage 5 alt...');
      // No Angular Material requested, proceed with packaging
      packageProject();
    }

    function packageProject() {
      console.log('...stage last...');
      const zipPath = path.join(tempDir, `${projectName}.zip`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        res.download(zipPath, `${projectName}.zip`, () => {
          fs.rmSync(projectPath, { recursive: true, force: true });
          fs.rmSync(zipPath);
        });
        console.log('Archive closed total bytes...');
      });

      archive.on('error', (archiveErr) => {
        console.error('Archive error:', archiveErr);
        res.json({archiveErr});
      });

      archive.pipe(output);
      archive.directory(projectPath, false);
      console.log('zip footer written...');
      archive.finalize();
    }
    // const zipPath = path.join(tempDir, `${projectName}.zip`);
    // const output = fs.createWriteStream(zipPath);
    // const archive = archiver('zip', { zlib: { level: 9 } });
    
    // output.on('close', () => {
    //   res.download(zipPath, `${projectName}.zip`, () => {
    //     fs.rmSync(projectPath, { recursive: true, force: true });
    //     fs.rmSync(zipPath);
    //   });
    // });

    // archive.on('error', (archiveErr) => {
    //   console.error('Archive error:', archiveErr);
    //   res.json({archiveErr});
    // });

    // archive.pipe(output);
    // archive.directory(projectPath, false);
    // console.log('zip footer written...');
    // archive.finalize();
  });
});


app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});



/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export default app;
