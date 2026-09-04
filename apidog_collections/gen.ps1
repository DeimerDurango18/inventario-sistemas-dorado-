const BASE = "https://its-songs-cosmetic-example.trycloudflare.com";
const bodyJson=(b)=>({mode:"raw",raw:JSON.stringify(b,null,2),options:{raw:{language:"json"}}});
const BODIES={
 "Login":{correo:"admin@sistemasbogota.com",password:"Admin2026!"},
 "Register":{nombre:"Nuevo Usuario",correo:"nuevo@correo.com",password:"temp1234",rol:"inventario",activo:true},
 "Crear Categoria":{nombre:"Laptop",descripcion:"Equipos portatiles"},
 "Crear Ubicacion":{nombre:"Principal",ciudad:"Bogota",direccion:"Calle 1 #2-3"},
 "Crear Equipo":{marca:"HP",modelo:"ProBook 450",serie:"SN12345",estado:"disponible",categoria_id:1,ubicacion_id:1,valor_aprox:1500000,observaciones:"Nuevo"},
 "Crear Mantenimiento":{equipo_id:1,tipo:"preventivo",descripcion:"Mantenimiento anual",tecnico:"Juan Perez",estado:"en_proceso",fecha_programada:"2026-09-10"},
 "Crear Acta":{tipo:"ENTRADA",entregado_por:"Proveedor",proyecto:"Remodelacion",responsable_destino:"Area TI",ciudad_destino:"Bogota",items:[{dispositivo:"Mouse",marca:"Logitech",cantidad:2,serial:"M001"}]},
 "Crear Usuario":{nombre:"Carlos",correo:"carlos@correo.com",password:"temp1234",rol:"inventario",activo:true}
};
const r=(name,method,path,tag)=>{
  let p=path,q=[];const qi=path.indexOf("?");if(qi>=0){q.push({key:path.slice(qi+1).split("=")[0],value:path.slice(qi+1).split("=")[1]||""});p=path.slice(0,qi);}
  const item={name,request:{method,header:[{key:"Content-Type",value:"application/json"}],url:{raw:BASE+path,path:p.split("/").filter(Boolean)},description:"["+tag+"] "+name,response:[]}};
  if(q.length)item.request.url.query=q;
  const b=Object.keys(BODIES).find(k=>name===k);
  if(b)item.request.body=bodyJson(BODIES[b]);
  return [tag,item];
};
const A=(n,m,p,g)=>R.push(r(n,m,p,g)); const R=[];
A("Login","POST","/api/auth/login","auth");A("Me","GET","/api/auth/me","auth");A("Register","POST","/api/auth/register","auth");
A("Listar Categorias","GET","/api/catalogo/categorias","Catalogo");A("Crear Categoria","POST","/api/catalogo/categorias","Catalogo");A("Actualizar Categoria","PUT","/api/catalogo/categorias/{categoria_id}","Catalogo");A("Eliminar Categoria","DELETE","/api/catalogo/categorias/{categoria_id}","Catalogo");A("Seed Catalogos","POST","/api/catalogo/seed","Catalogo");A("Listar Ubicaciones","GET","/api/catalogo/ubicaciones","Catalogo");A("Crear Ubicacion","POST","/api/catalogo/ubicaciones","Catalogo");A("Actualizar Ubicacion","PUT","/api/catalogo/ubicaciones/{ubicacion_id}","Catalogo");A("Eliminar Ubicacion","DELETE","/api/catalogo/ubicaciones/{ubicacion_id}","Catalogo");
A("Listar Equipos","GET","/api/inventory/equipos","Inventario");A("Crear Equipo","POST","/api/inventory/equipos","Inventario");A("Obtener Equipo","GET","/api/inventory/equipos/{equipo_id}","Inventario");A("Actualizar Equipo","PUT","/api/inventory/equipos/{equipo_id}","Inventario");A("Eliminar Equipo","DELETE","/api/inventory/equipos/{equipo_id}","Inventario");A("Subir Foto Equipo","POST","/api/inventory/equipos/{equipo_id}/foto","Inventario");A("QR Equipo","GET","/api/inventory/equipos/{equipo_id}/qr","Inventario");A("Buscar Equipos","GET","/api/inventory/equipos/buscar?q=","Inventario");A("Historial Equipo","GET","/api/inventory/equipos/historial/{equipo_id}","Inventario");
A("Listar Mantenimientos","GET","/api/mantenimientos","Mantenimiento");A("Crear Mantenimiento","POST","/api/mantenimientos","Mantenimiento");A("Cambiar Estado","PATCH","/api/mantenimientos/{registro_id}/estado","Mantenimiento");A("Subir Evidencia","POST","/api/mantenimientos/{registro_id}/evidencia","Mantenimiento");A("Descargar Acta PDF","GET","/api/mantenimientos/{registro_id}/pdf","Mantenimiento");
A("Ultima Acta","GET","/api/reports/acta/latest","Reportes");A("Dashboard","GET","/api/reports/dashboard","Reportes");A("Depreciacion","GET","/api/reports/depreciacion","Reportes");A("Alertas Mantenimiento","GET","/api/reports/mantenimiento/alertas","Reportes");A("Listar Actas","GET","/api/reports/actas","Reportes");A("Crear Acta","POST","/api/reports/actas","Reportes");A("Obtener Acta","GET","/api/reports/actas/{acta_id}","Reportes");A("Acta PDF","GET","/api/reports/actas/{acta_id}/pdf","Reportes");A("Exportar Actas","GET","/api/reports/exportar/actas","Reportes");A("Exportar Equipos","GET","/api/reports/exportar/equipos","Reportes");A("Exportar Mantenimientos","GET","/api/reports/exportar/mantenimientos","Reportes");
A("Listar Usuarios","GET","/api/usuarios","Usuarios");A("Crear Usuario","POST","/api/usuarios","Usuarios");A("Actualizar Usuario","PATCH","/api/usuarios/{usuario_id}","Usuarios");A("Eliminar Usuario","DELETE","/api/usuarios/{usuario_id}","Usuarios");
A("Health Check","GET","/health","Salud");
const g={};for(const[t,it]of R){(g[t]=g[t]||[]).push(it);}
const col={info:{name:"Inventario Equipos API",description:"Coleccion generada desde openapi.json. Base URL (tunel): "+BASE+"\nNota: la URL trycloudflare cambia en cada reinicio del servicio; actualiza la base si hace falta.",schema:"https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},item:Object.entries(g).map(([n,item])=>({name:n,item}))};
require("fs").writeFileSync("Inventario-Equipos.postman_collection.json",JSON.stringify(col,null,2));
console.log("OK con bodies. Grupos:",Object.keys(g).length,"| Requests:",R.length);
