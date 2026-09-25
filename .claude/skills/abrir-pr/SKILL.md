---
name: abrir-pr
description: Abre un pull request hacia develop cumpliendo la regla A.14 de AGENTS.md. Usar siempre que alguien del equipo pida abrir, crear o subir un PR o pull request, o integrar una rama a develop.
---

# Abrir un pull request (regla A.14)

Un pull request a `develop` declara `IA:`, `HU:` y `Revisor:` en su descripción, y no se integra
sin la aprobación de ese revisor, que no puede ser quien lo abre. Un check de GitHub lo valida;
esta skill existe para que el PR salga bien la primera vez.

## 1. Verificar la rama

- La rama actual no puede ser `develop` ni `master` (regla A.8). Si lo es, parar y avisar.
- Si la rama no está publicada, preguntar antes de hacer `git push -u origin <rama>`.
- Si ya existe un PR abierto para la rama (`gh pr view --json url`), mostrarlo y no crear otro.

## 2. Reunir lo que ya está declarado

```bash
git log origin/develop..HEAD --format='%s%n%b'
gh api user --jq .login
```

De los trailers de los commits (regla A.13) sacar:

- **HU sugeridas:** las `HU:` distintas de `ninguna`.
- **IA sugerido:** `agente` si algún commit es `agente`; si no, `asistido` si alguno lo es; si no, `no`.
- **Autor:** el login que devuelve `gh api user`.

## 3. Preguntar los campos

Si la herramienta tiene una función para hacer preguntas con opciones (en Claude Code,
AskUserQuestion), usarla con **las tres preguntas en una sola llamada**. Si no la tiene, hacer
las tres preguntas juntas en el chat, con las opciones numeradas, y esperar la respuesta.
Nunca completarlos por cuenta propia, aunque la sugerencia parezca obvia.

1. **HU:** las HU sugeridas como opciones, más `ninguna`.
2. **IA:** `agente`, `asistido`, `no`, con la sugerida primero y marcada "(sugerido)".
3. **Revisor:** el equipo **menos el autor**. Nunca ofrecer al autor.

| Usuario | Integrante | Responsabilidad |
|---|---|---|
| `Ana-Araya` | Ana Araya | UX/UI y QA |
| `blindjamin` | Benjamín Paicil | Scrum Master |
| `MaxiLP-ai` | Maximiliano López | Front-End |
| `Miikkkkk` | Miguel Segovia | Product Owner |
| `Starossta` | Javier Figueroa | Back-End |

Si la persona no quiere elegir revisor, no crear el PR: la regla no admite `pendiente` aquí.

## 4. Mostrar el aviso y confirmar

Antes de crear nada, mostrar el título, la descripción completa y este aviso tal cual:

> **Regla A.14 de AGENTS.md, acordada por el equipo.** Este pull request no se integra sin la
> aprobación de @<revisor>. Si entran commits nuevos después de la aprobación, hay que volver a
> pedirla.

Crear el PR solo con una confirmación explícita (regla A.9).

## 5. Crear el PR

Título en el formato de commit del equipo (`<tipo>(<scope>): <descripción>`). La descripción
sigue `.github/pull_request_template.md` y termina con las tres líneas:

```
IA: agente
HU: HU-07
Revisor: Starossta
```

```bash
gh pr create --base develop --title "<título>" --body-file <archivo> --reviewer <revisor>
```

`--reviewer` deja a la persona solicitada en GitHub y le llega la notificación. Terminar
mostrando la URL del PR.
