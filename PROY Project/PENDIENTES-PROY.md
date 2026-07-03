# Pendientes Generales — DASHBOARD PROY

Este archivo centraliza los pendientes **compartidos** del ecosistema. Cada proyecto tiene su propio archivo con issues específicos:

| Archivo | Proyecto |
|--------|---------|
| `frontend/PENDIENTES-FRONTEND.md` | PROY Dashboard (Next.js) |
| `../aplicaciones-web/vitaldent-web/PENDIENTES-VITALDENT-WEB.md` | VitalDent Web (Next.js) |
| `../aplicaciones-web/zammy-portal/PENDIENTES-ZAMMY.md` | Zammy Portal (Next.js) |
| `../scripts-automatizacion/vitaldent/PENDIENTES-VITALDENT-GAS.md` | VitalDent Google Apps Script |
| `../sitios-web/dra-angela-ramirez/PENDIENTES-DRA.md` | Dra. Ángela Ramírez (Hostinger) |
| `../../ZammyDeportes/PENDIENTES-ZAMMYDEPORTES.md` | ZammyDeportes (docs/plan) |

---

## 🔴 Críticos — Seguridad

> **Verificado 2026-07-02**: se auditó el historial completo de git (`git rev-list --all` + búsqueda de JWTs y del nombre de la variable) en `PROY`, `zammy-portal`, `vitaldent-web` y `scripts-automatizacion/vitaldent`. Dos de los tres puntos críticos originales resultaron ser falsas alarmas ya resueltas; se dejan documentados abajo con su estado real.

### 1. ~~SUPABASE_SERVICE_ROLE_KEY expuesta en git~~ — ✅ Falsa alarma, verificado
**Verificación:** Se buscó el valor real de la key (patrón JWT `eyJ...`) y el nombre de la variable en todo el historial de los 4 repos. `.env.local` **nunca fue trackeado** en ninguno; el código (`src/lib/supabase/admin.ts`, scripts) solo referencia `process.env.SUPABASE_SERVICE_ROLE_KEY`, nunca el valor hardcodeado.
**Estado:** Sin acción requerida. No rotar la key innecesariamente.

### 2. SSH Hostinger en texto plano — 🔴 Real, pendiente
**Archivos:** `../sitios-web/dra-angela-ramirez/Consultorio/SSH.txt`, `../sitios-web/dra-angela-ramirez/SSH Hostinger.md`
**Riesgo:** IP, puerto, usuario y contraseña del VPS Hostinger en texto plano. No están en git (esa carpeta no tiene repo propio y PROY la ignora), pero sí se sincronizan vía OneDrive.
**Estado:** El usuario pidió **no borrar los archivos todavía** (2026-07-02). Se guardó una copia de respaldo en el scratchpad de la sesión para facilitar el paso a un gestor de contraseñas, pero los archivos originales siguen intactos.
**Acción pendiente:**
1. Mover las credenciales a un gestor de contraseñas
2. Eliminar `SSH.txt` y `SSH Hostinger.md` del disco (solo cuando el usuario lo confirme)
3. Considerar rotar la contraseña del VPS en Hostinger, ya que estuvo en texto plano

### 3. ~~.env.local sin .gitignore en subproyectos~~ — ✅ Falsa alarma, verificado
**Verificación:** `frontend/`, `vitaldent-web/` y `zammy-portal/` ya tienen `.env*` en su propio `.gitignore`, y ninguno aparece en su historial de git.
**Estado:** Sin acción requerida.

---

## 🟡 Salud General de Proyectos

### Script Único de Diagnóstico (correr en cualquier proyecto)

```bash
#!/bin/bash
echo "══════════════════════════════════════════════"
echo "  DIAGNÓSTICO AUTOMÁTICO — $(basename $(pwd))"
echo "══════════════════════════════════════════════"

echo ""
echo "── 1. GIT ──"
if [ -d .git ]; then
  echo "   Remoto: $(git remote -v 2>/dev/null | head -2)"
  echo "   Branch: $(git branch --show-current)"
  echo "   Status: $(git status --short | wc -l) archivos modificados"
  git log --oneline -3 | sed 's/^/   /'
  echo "   ⚠️  Keys en git?: $(git grep -l 'SUPABASE_SERVICE_ROLE_KEY\|SUPABASE_KEY\|password' 2>/dev/null | head -5 || echo 'Ninguna detectada')"
else
  echo "   ❌ NO HAY REPOSITORIO GIT"
fi

echo ""
echo "── 2. .ENV ──"
ls .env* 2>/dev/null || echo "   Sin archivos .env"
for f in .env*; do
  [ -f "$f" ] && echo "   $f: $(grep -c 'KEY\|SECRET\|PASSWORD\|TOKEN' "$f" 2>/dev/null) claves detectadas"
done

echo ""
echo "── 3. SUABASE ──"
grep -roh 'https\?://[^/]*supabase\.co' src/ 2>/dev/null | sort -u | sed 's/^/   URL: /'
[ -f supabase/config.toml ] && echo "   Config local: ✅" || echo "   Config local: ❌ No encontrada"
if [ -d supabase/migrations ]; then
  echo "   Migraciones: $(ls supabase/migrations/*.sql 2>/dev/null | wc -l) archivos"
fi

echo ""
echo "── 4. VERCEL ──"
if [ -f .vercel/project.json ]; then
  echo "   Proyecto: $(grep '"projectName"' .vercel/project.json 2>/dev/null | head -1)"
else
  echo "   ❌ No hay config Vercel local"
fi
grep -i vercel package.json 2>/dev/null | sed 's/^/   Script: /'

echo ""
echo "── 5. DEPENDENCIAS ──"
[ -d node_modules ] && echo "   node_modules: ✅ Instalado ($(ls node_modules | wc -l) paquetes)" || echo "   node_modules: ❌ FALTANTE"
[ -f package-lock.json ] && echo "   package-lock: ✅ Presente" || echo "   package-lock: ❌ Faltante"
# Dependencias sin usar u obsoletas
echo "   npm audit: $(npm audit --production 2>/dev/null | grep 'found\|vulnerabilities' || echo 'no ejecutado')"

echo ""
echo "── 6. BUILD ──"
echo "   (Ejecutar manual: npm run build 2>&1 | tail -5)"
echo "   (Ejecutar manual: npx tsc --noEmit 2>&1 | tail -5)"

echo ""
echo "── 7. ARCHIVOS SENSIBLES ──"
find . -not -path "*/node_modules/*" -not -path "*/.git/*" \( -name "*.txt" -o -name "*.pem" -o -name "*.key" \) 2>/dev/null | sed 's/^/   📄 /'
grep -rl 'password\|contraseña\|PASSWORD' --include="*.txt" . 2>/dev/null | sed 's/^/   ⚠️  Contraseña detectada en: /'

echo ""
echo "── 8. TAMAÑO ──"
echo "   Peso total: $(du -sh . 2>/dev/null | cut -f1)"
echo "   node_modules: $(du -sh node_modules 2>/dev/null | cut -f1)"
echo "   Archivos > 1MB no git: $(find . -not -path '*/node_modules/*' -not -path '*/.git/*' -size +1M -type f | wc -l)"

echo ""
echo "── 9. SERVICIOS EN LÍNEA ──"
vercel_url=$(grep -o 'https://[^"]*\.vercel\.app' .vercel/project.json 2>/dev/null | head -1)
[ -n "$vercel_url" ] && echo "   Vercel: $vercel_url" || echo "   Vercel: No se pudo extraer URL"
supabase_urls=$(grep -roh 'https\?://[^/]*supabase\.co' src/ 2>/dev/null | sort -u)
[ -n "$supabase_urls" ] && for u in $supabase_urls; do
  echo "   Supabase: $u"
  # Ping al endpoint de health
  curl -s -o /dev/null -w "   Health: HTTP %{http_code}" "$u/rest/v1/" --max-time 5 2>/dev/null || echo "   Health: No responde"
done

echo ""
echo "── 10. DIAGNÓSTICO COMPLETADO ──"
```

```bash
# Para correrlo en todos los proyectos a la vez (desde la raíz de PROY/):
for dir in "PROY Project/frontend" aplicaciones-web/vitaldent-web aplicaciones-web/zammy-portal; do
  echo ""; echo ">>> $dir <<<"
  (cd "$dir" && npm run build 2>&1 | tail -3 && npx tsc --noEmit 2>&1 | tail -3)
done
```

### Checklist Rápido por Tipo de Proyecto

#### Next.js (frontend, vitaldent-web, zammy-portal)
- [ ] `git remote -v` → remote apunta a GitHub correcto
- [ ] `git status` → sin archivos sensibles (`.env.local` no debe aparecer)
- [ ] `.env.local` → existe con keys correctas
- [ ] `.env.local` → NO tiene `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ls supabase/migrations/` → migraciones presentes
- [ ] `ls .vercel/project.json` → proyecto Vercel configurado
- [ ] `npm run build` → compila sin errores
- [ ] `npx tsc --noEmit` → sin errores de tipos
- [ ] `npx next lint` → sin errores de lint
- [ ] `node -e "require('./next.config.ts')"` → config válida
- [ ] `npm audit --production` → sin vulnerabilidades críticas

#### Google Apps Script (vitaldent/scripts)
- [ ] `.clasp.json` → scriptId presente
- [ ] `appsscript.json` → manifiesto válido
- [ ] `clasp status` → deploy sincronizado con remote
- [ ] `clasp versions` → última versión desplegada
- [ ] Sheets de origen existen (verificar en Google Sheets)

#### Sitios Estáticos (Labdent, Consultorio)
- [ ] Archivos HTML principales existen
- [ ] Assets referenciados existen en `*_files/`
- [ ] URLs de producción responden (Hostinger)
- [ ] Google Analytics o scripts embebidos funcionan
- [ ] Versión Hostinger Builder vs exportado local están sincronizados

---

## Estado por Proyecto

### 1. PROY Dashboard (`PROY Project/frontend/`)
| Aspecto | Estado |
|---------|--------|
| Git | ✅ `github.com/rrhb0911/PROY.git` — branch `main` |
| Supabase | ✅ `ajepmezimkestxjrwqna.supabase.co` |
| Vercel | ✅ `proy-dashboard` desplegado |
| .env.local | ✅ Nunca trackeado, `.gitignore` local con `.env*` |
| Auth Google | ⚠️ Configurado en Supabase + Google Cloud, falta probar en producción |
| Pendientes | Ver `README.md` — módulos sin implementar |

### 2. VitalDent Web (`aplicaciones-web/vitaldent-web/`)
| Aspecto | Estado |
|---------|--------|
| Git | ✅ `github.com/rrhb0911/vitaldent-web.git` — branch `main` |
| Supabase | ✅ `vqjrjndgaribzxwqudkm.supabase.co` |
| Vercel | ✅ `vitaldent-web` desplegado |
| .env.local | ✅ Nunca trackeado, `.gitignore` local con `.env*` |
| Cron | ✅ `vercel.json` con cron `/api/resumen-diario` |
| Pendientes | Apps Script necesita mejoras en POS — ver `../scripts-automatizacion/vitaldent/PENDIENTES-VITALDENT-GAS.md` |

### 3. Zammy Portal (`aplicaciones-web/zammy-portal/`)
| Aspecto | Estado |
|---------|--------|
| Git | ✅ `github.com/rrhb0911/zammy-portal.git` — branch `master` |
| Supabase | ✅ `wnkcovmqwkunbnaezchy.supabase.co` |
| Vercel | ✅ `zammy-portal` desplegado |
| .env.local | ✅ Nunca trackeado, `.gitignore` local con `.env*` (verificado 2026-07-02) |
| Duplicado | ⚠️ Existe copia en `ZammyDeportes/zammy-portal/` — mantener sincronizado |
| Pendientes | Producción activa, varias migraciones sin aplicar |

### 4. Zammy Portal (copia `ZammyDeportes/`)
| Aspecto | Estado |
|---------|--------|
| Git | ✅ Mismo remote (`github.com/rrhb0911/zammy-portal.git`), mismo proyecto Vercel |
| .env.local | ✅ Nunca trackeado, `.gitignore` local con `.env*` (verificado 2026-07-02) |
| Riesgo | Copia duplicada puede divergir del original |

### 5. LabDent — Dra. Angela (`sitios-web/dra-angela-ramirez/Labdent/`)
| Aspecto | Estado |
|---------|--------|
| Git | 🔴 **Sin control de versiones** |
| Hosting | Hostinger Website Builder (probablemente) |
| Archivos | HTML estático exportado |
| Acción | Inicializar git o agregar al monorepo PROY |

### 6. Consultorio — Dra. Angela (`sitios-web/dra-angela-ramirez/Consultorio/`)
| Aspecto | Estado |
|---------|--------|
| Git | 🔴 **Sin control de versiones** |
| Hosting | Hostinger VPS (`212.85.28.100:65002`) |
| SSH | 🔴 **Credenciales en texto plano (`SSH.txt`, `SSH Hostinger.md`)** — no están en git, pero sí en OneDrive |
| Acción | Inicializar git; mover creds a gestor de contraseñas; el usuario pidió NO borrar los archivos aún (2026-07-02) |

### 7. VitalDent Apps Script (`scripts-automatizacion/vitaldent/`)
| Aspecto | Estado |
|---------|--------|
| Git | 🔴 **Sin control de versiones** |
| Deploy | ✅ `.clasp.json` configurado con scriptId |
| Archivos | `Code.js`, `AbrirCaja.js`, `Dashboard.js`, `Interfaz.html`, `Menu.js` |
| Pendientes | Ver `PENDIENTES-VITALDENT-GAS.md` dentro del directorio — medios de pago múltiples, flujo por canal, caja menor, cartera, exportación |

---

## Conexiones Cross-Proyecto

```
PROY (monorepo git)
├── PROY Project/ (proyecto único e independiente del dashboard)
│   └── frontend/ (Next.js → Vercel → Supabase)
├── aplicaciones-web/
│   ├── vitaldent-web/ (Next.js → Vercel → Supabase distinta)
│   └── zammy-portal/ (Next.js → Vercel → Supabase distinta)
├── sitios-web/ (Hostinger, sin git)
└── scripts-automatizacion/ (GAS, clasp deploy, sin git)

ZammyDeportes/ (carpeta independiente)
└── zammy-portal/ (mismo remote que PROY/aplicaciones-web/zammy-portal)
```

---

## Comandos Rápidos de Diagnóstico

```bash
# Verificar todos los remotos git en todo el ecosistema
find /c/Users/ilbici/OneDrive\ -\ ilbici.godaddylogin.com/PROY /c/Users/ilbici/ZammyDeportes \
  -name ".git" -type d -exec sh -c 'cd "$1/.." && echo "--- $(pwd)" && git remote -v && echo "Branch: $(git branch --show-current)" && echo "Status: $(git status --short | wc -l) cambios"' _ {} \;

# Buscar archivos .env en todo el ecosistema
find /c/Users/ilbici/OneDrive\ -\ ilbici.godaddylogin.com/PROY /c/Users/ilbici/ZammyDeportes \
  -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null

# Buscar keys sensibles en TODO el arbol
find /c/Users/ilbici/OneDrive\ -\ ilbici.godaddylogin.com/PROY \
  -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -exec grep -l "SUPABASE_SERVICE_ROLE_KEY\|sk-" {} \; 2>/dev/null

# Buscar passwords en txt
find /c/Users/ilbici/OneDrive\ -\ ilbici.godaddylogin.com/PROY \
  -name "*.txt" -exec grep -l "password\|contraseña\|passwd\|PASSWORD" {} \; 2>/dev/null

# Verificar node_modules faltantes
find /c/Users/ilbici/OneDrive\ -\ ilbici.godaddylogin.com/PROY \
  -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" | while read f; do
  d=$(dirname "$f")
  [ ! -d "$d/node_modules" ] && echo "FALTA node_modules: $d"
done

# Build + Types en todos los Next.js a la vez
for p in "PROY Project/frontend" aplicaciones-web/vitaldent-web aplicaciones-web/zammy-portal; do
  echo "======== BUILD $p ========"
  (cd "/c/Users/ilbici/OneDrive - ilbici.godaddylogin.com/PROY/$p" && \
    echo "--- tsc ---" && npx tsc --noEmit 2>&1 | tail -5 && \
    echo "--- lint ---" && npx next lint 2>&1 | tail -5 && \
    echo "--- build (dry) ---" && npm run build 2>&1 | tail -5)
done

# Verificar migraciones Supabase pendientes
for p in aplicaciones-web/vitaldent-web aplicaciones-web/zammy-portal; do
  d="/c/Users/ilbici/OneDrive - ilbici.godaddylogin.com/PROY/$p"
  [ -d "$d/supabase/migrations" ] && echo "$p: $(ls "$d/supabase/migrations"/*.sql 2>/dev/null | wc -l) migraciones"
done

# Estado de clasp (GAS)
cd /c/Users/ilbici/OneDrive\ -\ ilbici.godaddylogin.com/PROY/scripts-automatizacion/vitaldent && \
  clasp status 2>/dev/null || echo "clasp no disponible"
```

---

## Información de Contacto y Acceso

```yaml
# Datos para que Claude sepa a qué servicios conectarse
proyectos:
  - nombre: PROY Dashboard
    supabase_url: https://ajepmezimkestxjrwqna.supabase.co
    supabase_ref: ajepmezimkestxjrwqna
    vercel: proy-dashboard
    github: rrhb0911/PROY
    branch: main

  - nombre: vitaldent-web
    supabase_url: https://vqjrjndgaribzxwqudkm.supabase.co
    supabase_ref: vqjrjndgaribzxwqudkm
    vercel: vitaldent-web
    github: rrhb0911/vitaldent-web
    branch: main

  - nombre: zammy-portal
    supabase_url: https://wnkcovmqwkunbnaezchy.supabase.co
    supabase_ref: wnkcovmqwkunbnaezchy
    vercel: zammy-portal
    github: rrhb0911/zammy-portal
    branch: master

  - nombre: vitaldent-script (GAS)
    script_id: 1KOcfslVDqOWkyCDcHsI7y5HkV0Q9tgfeYjQbSQ-oKM2QM44uveoXOHpW
    deploy: clasp push

  - nombre: consultorio-angela
    hostinger_host: 212.85.28.100
    hostinger_port: 65002
    hostinger_user: u595800302

  - nombre: labdent
    url: https://labdent-builder-mm978wcxvijcxlxw.hostingersite.com/
```

---

## Prioridades

| Prioridad | Tarea | Proyecto |
|-----------|-------|----------|
| 🔴 P0 | Mover SSH.txt/SSH Hostinger.md a gestor de contraseñas (borrado pendiente de confirmación del usuario) | Consultorio |
| ✅ Resuelto | ~~Rotar SERVICE_ROLE_KEY + eliminar de git~~ — verificado 2026-07-02, nunca se commiteó | zammy-portal |
| ✅ Resuelto | ~~Agregar .env.local a .gitignore en subproyectos~~ — verificado 2026-07-02, ya estaba | frontend, vitaldent-web, zammy-portal |
| 🟡 P1 | Inicializar git para sitios estáticos | Labdent, Consultorio |
| 🟡 P1 | Inicializar git para scripts GAS | vitaldent scripts |
| 🟢 P2 | Sincronizar copias duplicadas de zammy-portal | ZammyDeportes vs PROY |
| 🟢 P2 | Implementar mejoras POS (ver PENDIENTES-VITALDENT-GAS.md de vitaldent) | vitaldent scripts |
