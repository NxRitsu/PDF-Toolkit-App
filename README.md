# PDF Toolkit — Application de bureau

Application de gestion de PDFs packagée avec Electron. Compresser, fusionner, découper, convertir et signer vos PDFs directement depuis votre bureau.

## Prérequis

- **Node.js** 18+ → [nodejs.org](https://nodejs.org)
- **npm** (inclus avec Node.js)

## Installation

```bash
cd pdf-toolkit-app
npm install
```

## Lancer en mode développement

```bash
npm start
```

L'application s'ouvre dans une fenêtre native.

## Générer les installateurs

### Windows (.exe)
```bash
npm run build:win
```
→ Crée `dist/PDF-Toolkit-Setup-1.0.0.exe`

### macOS (.dmg)
```bash
npm run build:mac
```
→ Crée `dist/PDF-Toolkit-1.0.0-arm64.dmg` (Apple Silicon) et `dist/PDF-Toolkit-1.0.0-x64.dmg` (Intel)

### Les deux à la fois
```bash
npm run build:all
```

> **Note :** Pour builder un .exe depuis un Mac (ou un .dmg depuis Windows), tu peux utiliser des outils de CI/CD comme GitHub Actions. Le cross-compilation n'est pas nativement supportée par electron-builder sans configuration spéciale.

## Structure du projet

```
pdf-toolkit-app/
├── build/
│   ├── icon.png          # Icône de l'application (512x512)
│   └── icon.svg          # Source vectorielle de l'icône
├── src/
│   ├── index.html        # L'application PDF Toolkit
│   ├── main.js           # Process principal Electron
│   └── preload.js        # Script de préchargement (bridge sécurisé)
├── package.json          # Config npm + electron-builder
└── .gitignore
```

## Personnalisation

- **Icône** : remplace `build/icon.png` par ta propre icône (512x512 minimum). Pour Windows, ajoute aussi un fichier `build/icon.ico`.
- **Version** : modifie le champ `version` dans `package.json`.
- **Nom** : modifie `productName` dans la section `build` de `package.json`.
