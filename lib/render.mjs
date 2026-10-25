import { readFileSync } from 'node:fs';
import { render as renderCore } from './render-core.mjs';
export { routes, readiness } from './render-core.mjs';
const template=readFileSync(new URL('../public/template.html',import.meta.url),'utf8');
export const render=(path,config,settings)=>renderCore(path,config,settings,template);
