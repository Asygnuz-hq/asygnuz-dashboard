// SW desactivado en el demo Radia: OHIF precachea rutas absolutas que chocan con el dominio principal.
if ("serviceWorker" in navigator) { navigator.serviceWorker.getRegistrations().then(function(r){ r.forEach(function(x){ if (x.scope.indexOf("/radia/visor")!==-1) x.unregister(); }); }); }
