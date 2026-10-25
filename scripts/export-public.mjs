import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, lstatSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=process.argv[2];
if(!destination)throw Error('Indiquez un dossier de destination vide : npm run export:public -- /chemin/destination');
const dest=resolve(destination);
if(existsSync(dest))throw Error('La destination existe déjà : choisissez un nouveau dossier pour préserver son contenu.');
const allowed=['package.json','server.mjs','config.example.json','.env.example','.gitignore','.dockerignore','Dockerfile','README.md','NANOCORP.md','DEPLOYMENT.md','wrangler.jsonc','cloudflare','lib','public','tests','scripts'];
function inspect(path) {
 const stat=lstatSync(path);if(stat.isSymbolicLink())throw Error('Lien symbolique interdit dans la livraison.');
 if(stat.isDirectory()){for(const name of readdirSync(path))inspect(join(path,name));return;}
 if(/\.(?:ttf|woff2)$/.test(path))return;
 const text=readFileSync(path,'utf8');
 // These literal patterns are split here so this scanner does not flag itself.
 const forbidden=[new RegExp('/'+'Users/','i'),new RegExp('ger'+'vais','i'),new RegExp('it'+'af\\.tech','i'),/sk_live_[A-Za-z0-9]+/,/-----BEGIN [A-Z ]*PRIVATE KEY-----/];
 if(forbidden.some(re=>re.test(text)))throw Error('Élément privé ou secret potentiel : '+path.slice(root.length+1));
}
for(const name of allowed){if(!existsSync(join(root,name)))throw Error('Livraison incomplète : '+name);inspect(join(root,name));}
mkdirSync(dest,{recursive:true});for(const name of allowed)cpSync(join(root,name),join(dest,name),{recursive:true});
console.log('Copie indépendante préparée : '+dest+' ; configuration privée, données et historique exclus.');
