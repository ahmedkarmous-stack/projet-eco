# 🔐 Système d'Ouverture de Portes — Raspberry Pi 4

> Simulation interactive et documentation technique d'un système de contrôle d'accès basé sur **Raspberry Pi 4**, avec lecteur de badge RFID, servomoteur, LEDs, buzzer, relais et afficheur LCD.

🌐 **Live Demo** → [ahmedkarmous-stack.github.io/projet-eco](https://ahmedkarmous-stack.github.io/projet-eco/)

---

## 📋 Description

Ce projet est une application web interactive qui simule et documente le câblage et le fonctionnement d'un système d'ouverture de portes électronique. Il comprend trois vues principales :

| Onglet | Description |
|--------|-------------|
| **Simulation Montage** | Animation interactive — scan de badge → ouverture/blocage de porte |
| **Schéma Câblage** | Diagramme détaillé des connexions GPIO du Raspberry Pi 4 |
| **Schéma Électrique ISIS** | Schéma électronique complet du circuit |

---

## 🛠️ Composants Matériels

| Composant | Rôle |
|-----------|------|
| Raspberry Pi 4 | Unité de contrôle centrale |
| Lecteur RFID | Lecture des badges d'accès |
| Servomoteur | Mécanisme d'ouverture de la porte |
| LED Verte × 2 | Indicateur accès autorisé |
| LED Rouge × 2 | Indicateur accès refusé |
| Buzzer | Signal sonore |
| Relais | Commande électrique |
| Afficheur LCD (I2C) | Affichage du statut (SDA/SCL) |

---

## 🔌 Brochage GPIO

| GPIO | Composant |
|------|-----------|
| GPIO 2 (SDA) | LCD I2C |
| GPIO 3 (SCL) | LCD I2C |
| GPIO 17 | LED Verte 1 |
| GPIO 18 (PWM) | Servomoteur |
| GPIO 22 | LED Rouge 1 |
| GPIO 23 | LED Rouge 2 |
| GPIO 24 | Buzzer |
| GPIO 25 | Relais |
| GPIO 27 | LED Verte 2 |

---

## 🚀 Lancer le projet en local

### Prérequis
- [Node.js](https://nodejs.org/) v18+
- npm

### Installation

```bash
git clone https://github.com/ahmedkarmous-stack/projet-eco.git
cd projet-eco
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173) dans le navigateur.

### Build de production

```bash
npm run build
```

---

## 🏗️ Stack Technique

- **React 18** — Interface utilisateur
- **Vite 5** — Bundler & serveur de développement
- **CSS-in-JS** — Styles inline React
- **GitHub Actions** — CI/CD déploiement automatique
- **GitHub Pages** — Hébergement

---

## 📁 Structure du projet

```
projet-eco/
├── src/
│   └── main.jsx                  # Point d'entrée — navigation par onglets
├── simulation_montage.jsx        # Animation simulation accès
├── schema_cablage.jsx            # Schéma câblage GPIO
├── schema_electrique_isis.jsx    # Schéma électrique ISIS
├── index.html
├── vite.config.js
└── .github/
    └── workflows/
        └── deploy.yml            # Déploiement automatique GitHub Pages
```

---

## ⚙️ Déploiement automatique

Chaque `git push` sur la branche `main` déclenche automatiquement :
1. Installation des dépendances (`npm install`)
2. Build de production (`npm run build`)
3. Déploiement sur GitHub Pages (branche `gh-pages`)

---

## 📄 Licence

MIT © [Ahmed Karmous](https://github.com/ahmedkarmous-stack)
