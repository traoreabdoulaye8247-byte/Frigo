/* ============================================================
   FRIGO — assistant hors connexion
   Garde l'application dans la mémoire du téléphone pour qu'elle
   s'ouvre même sans internet.
   À déposer UNE SEULE FOIS sur GitHub, à côté de index.html.
   Ce fichier n'a plus jamais besoin d'être modifié.
   ============================================================ */
const CACHE_APP = 'frigo-app-v1';
const CACHE_POLICES = 'frigo-polices-v1';
const BASE = new URL('./', self.location.href).pathname;   // ex : /Frigo/
const PAGE = BASE + 'index.html';

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(function(c){ return c.add(new Request(PAGE, {cache:'reload'})); })
      .catch(function(){})
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  if(req.headers.get('range')) return;          // extrait de 3 Ko : vérification de version

  let url;
  try{ url = new URL(req.url); }catch(err){ return; }

  // 1) Polices : gardées en mémoire dès la première ouverture avec internet
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith((async function(){
      const c = await caches.open(CACHE_POLICES);
      const enCache = await c.match(req);
      if(enCache) return enCache;
      try{
        const r = await fetch(req);
        if(r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
        return r;
      }catch(err){
        return new Response('', {status:504});
      }
    })());
    return;
  }

  if(url.origin !== self.location.origin) return;
  if(url.search.indexOf('maj=') >= 0) return;   // vérification de version : toujours le réseau

  // 2) Uniquement la page de FRIGO (les autres fichiers du dépôt ne sont pas touchés)
  if(url.pathname !== BASE && url.pathname !== PAGE) return;

  e.respondWith((async function(){
    const c = await caches.open(CACHE_APP);
    const enCache = await c.match(PAGE);
    // mise à jour discrète en arrière-plan quand il y a du réseau
    const reseau = fetch(req).then(function(r){
      if(r && r.ok) c.put(PAGE, r.clone());
      return r;
    }).catch(function(){ return null; });
    if(enCache) return enCache;                 // ouverture instantanée, même sans internet
    const r = await reseau;
    if(r) return r;
    return new Response(
      '<meta charset="utf-8"><h2 style="font-family:sans-serif;text-align:center;margin-top:40px;padding:0 20px">' +
      'FRIGO n\'est pas encore gardé en mémoire.<br>Ouvrez-le une fois avec internet.</h2>',
      {headers:{'Content-Type':'text/html; charset=utf-8'}}
    );
  })());
});
