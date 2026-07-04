# The Legacy Lab — PRD

## Problem statement (originale, IT)
App mobile per il progetto "The Legacy Lab": la gente si candida pubblicando mini video, e si pubblica il viaggio nazionale, con i colori del brand (navy scuro #0F1A2A + arancione #F57C00). Correzione utente: non seminari ma visite alle aziende selezionate in tutta Italia con riprese/interviste per un format TV; aggiungere Hub Universitario e sezione Chi Siamo/Visione con il Founder.

## Architettura
- Frontend: Expo Router (React Native), tabs (Home, Tour, Candidati, Classifica, Profilo) + schermata Progetto + modal Auth.
- Backend: FastAPI + MongoDB (motor). Auth JWT custom (pyjwt + passlib/bcrypt).
- Video: upload multipart su disco backend (backend/uploads), streaming via /api/videos/{id}/file.
- Font: Cormorant Garamond (display) + Satoshi (testo) via expo-font.

## Personas
- Imprenditori/artigiani che si candidano con un video.
- Community che vota le storie.
- Studenti/università (Hub) e partner.

## Implementato (2026-07)
- Auth JWT (register/login/me), storage token sicuro.
- Candidatura 3-step: video (registra/galleria con permessi), descrizione, pilastro.
- Feed video verticale + Classifica (leaderboard) con voto pubblico e filtri per pilastro.
- Tour nazionale: 8 tappe seed (visite aziende + riprese/interviste), "Segui la tappa".
- Home editoriale (hero, stats, in evidenza, 5 pilastri, visione) + banner Progetto.
- Schermata Progetto: Chi Siamo, origine idea, Founder (Dario Faccendini), pilastri, format TV, Hub Universitario.
- Fix: crash Classifica (viewabilityConfigCallbackPairs), guard expo-video su web.

## Backlog / Prossimi passi
- P1: Founder — nome/foto/bio reali da confermare con l'utente (ora placeholder da deck).
- P1: Hub Universitario — elenco atenei partner e progetti reali.
- P2: Storage cloud per i video (ora su disco), thumbnail video reali.
- P2: Monetizzazione (Stripe/membership), condivisione social dei video.
- P2: Notifiche tappe (solo su richiesta esplicita).

## Note
- Registrazione video via fotocamera testabile solo su dispositivo reale (Expo Go), non nel preview web.
