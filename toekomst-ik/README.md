# Toekomst-ik

**Een financiële digital twin voor elke KBC-klant.** Proof of concept, gebouwd voor de KBC-hackathon. Draait in Expo Go op een telefoon, met een kleine Node-backend voor het gesprek met "jezelf in 2035".

## Waarom

KBC vroeg geen extra feature, maar een schaalbare manier om elke klant op het juiste moment te begrijpen, te ondersteunen en te begeleiden. Ons antwoord: elke klant krijgt een **digital twin**, een deterministische simulatie van zijn of haar eigen financiële toekomst.

- De twin kijkt mee naar je uitgaven (**De Waakhond**) en waarschuwt als iets afwijkt van *jouw* normaal, niet van een generieke drempel.
- Elk signaal vertaalt zich meteen naar de toekomst: "Als dit elke maand zo doorgaat: € 38.000 minder in 2035 en je huis 18 maanden later."
- Je kan met je twin **praten als met jezelf in 2035**. Warm, eerlijk, in het Vlaams, en zonder één verzonnen cijfer.

Het principe dat overal in de code en de UI terugkomt: **de motor rekent, de AI praat.** Alle cijfers komen uit een deterministische, pure TypeScript-engine (projectie + signalen) die elke nacht voor 2,3 miljoen klanten kan draaien voor bijna niets. Het taalmodel wordt alleen op vraag gebruikt en haalt elk cijfer via tool-aanroepen uit diezelfde engine.

## Architectuur

```
┌──────────────────────────── telefoon (Expo Go) ────────────────────────────┐
│                                                                            │
│   src/app (Expo Router, tabs)        src/store (zustand + AsyncStorage)    │
│   Vandaag · Waakhond · Toekomst ·    persona, klok, extra transacties,     │
│   Praat · Meer (+ demo, aannames,    beslissingen, gesprekken              │
│   gegevens, schaal, alert-detail)             │                            │
│              │                                │                            │
│              └──────────────► engine/ ◄───────┘                            │
│                        pure TypeScript, geen React Native                  │
│    generator (seeded PRNG) · baseline · alerts · projection · nightly ·    │
│    snapshot · tools · offline fallback · assumptions                       │
│                                   │                                        │
│         snapshot (samenvattingen, ± 14 kB) + gesprek                       │
└───────────────────────────────────┼────────────────────────────────────────┘
                                    │  POST /chat  (LAN, poort 3001)
┌───────────────────────────────────▼────────────────────────────────────────┐
│  server/ (Node + tsx, stateless)                                           │
│  zod-validatie · rate limiting · Claude (claude-opus-5-5, effort low)      │
│  tool-loop: get_financial_snapshot · simulate_scenario ·                   │
│             get_spending_details · get_alerts      ──►  engine/ (zelfde)  │
│  API-sleutel enkel in server/.env                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

Geen server bereikbaar of geen API-sleutel? De app antwoordt zelf met vaste Nederlandse sjablonen op dezelfde engine, duidelijk gelabeld **offline modus**. De demo loopt nooit vast.

## Zo draai je het

Vereisten: Node 20 of hoger, npm, de Expo Go-app op je telefoon, telefoon en laptop op **dezelfde wifi**, en SSH-toegang tot `kenny` voor de AI.

```bash
cd toekomst-ik
npm install
cp server/.env.example server/.env   # standaard: vLLM op kenny via de SSH-tunnel

# app + backend + SSH-tunnel naar kenny, samen
npm run dev
```

Scan de QR-code in de terminal met Expo Go (Android) of de camera-app (iOS). De app zoekt de backend automatisch op het IP van de Metro-server, poort 3001. Ander adres nodig? Zet `EXPO_PUBLIC_API_URL=http://192.168.x.y:3001` vóór `npm run dev`.

Apart starten kan ook: `npm start` (app), `npm run server` (backend) en `npm run tunnel` (SSH-tunnel).

### De AI: vLLM op kenny

Op `kenny` (ssh-alias `kenny`, host `kenny.vtk.be`) draait vLLM met het model `qwen3.8-27b` achter een OpenAI-compatibele API op poort 8000. Die poort is enkel via SSH bereikbaar, dus `npm run tunnel` (of `npm run dev`) opent `ssh -N -L 8000:127.0.0.1:8000 kenny`. De backend praat dan met `http://127.0.0.1:8000/v1` (`LLM_BASE_URL` en `LLM_MODEL` in `server/.env`, geen sleutel nodig). Het model gebruikt dezelfde vier tools op de engine; een antwoord duurt ongeveer 20 tot 40 seconden.

Staat er een `ANTHROPIC_API_KEY` in `server/.env`, dan krijgt Claude (`claude-opus-5-5`) voorrang. Zonder tunnel en zonder sleutel schakelt de app over op de offline modus.

### Gepubliceerd op Expo

Het project staat onder het account **vtk-it**: https://expo.dev/accounts/vtk-it/projects/toekomst-ik (branch `preview`, runtime `exposdk:57.0.0`). Open de update vanuit het dashboard in Expo Go om de app zonder laptop te tonen. Opgelet: zo'n gepubliceerde versie kent geen Metro-adres en draait dus in offline modus, tenzij je bij het publiceren een vast serveradres meegeeft:

```bash
EXPO_PUBLIC_API_URL=http://<ip-van-je-laptop>:3001 eas update --branch preview --environment preview --message "..."
```

Handige commando's:

| Commando | Wat |
|---|---|
| `npm test` | Unit tests van de engine (node:test via tsx) |
| `npm run typecheck` | `tsc --noEmit` voor app en server |
| `npm run export:check` | Bundelt de app voor Android en iOS zonder toestel |
| `npx expo-doctor` | Controle van afhankelijkheden en configuratie |
| `npx expo lint` | ESLint |

## Demoscript (± 5 minuten)

1. **Start met Lotte** (standaard). Tab *Vandaag*: saldo's, deze maand tegenover haar normaal, twee signalen van de Waakhond, haar huis-doel. Bij de eerste start verschijnt bovenaan een banner van de Waakhond.
2. **Tab Waakhond.** Open "Maaltijdbezorging: meer dan normaal" via *Waarom zie ik dit?*. Toon de mediaan van zes maanden, het tempo, de regel, en de toekomstimpact ("… en je huis X maanden later"). Terug, en tik *Stel een budget in* of *Klopt, was eenmalig*.
3. **Tab Toekomst.** Projectie tot 2035. Tik bij *Wat als…* op `4/5`: de stippellijn en de doelen verschuiven meteen. Kies dan een huis van € 280.000: de betaalbaarheidsregel verschijnt. *Wis scenario*.
4. **Tab Praat.** Tik de chip *Kan ik in 2029 een huis kopen?*. Typ-indicator, antwoord van "Lotte, 37" met een scenario-kaart eronder. Onderaan staat welke tools de cijfers leverden. Zonder API-sleutel zie je hetzelfde in *offline modus*.
5. **Meer → Demo-paneel.** Tik *Zalando € 189*: binnen een seconde verschijnt de banner "Ongewone uitgave bij Zalando" en de toast zegt waar het signaal terechtkwam. Tik *Nieuw abonnement Disney+*: signaal "Nieuw abonnement", en bij Lotte groeit het overzicht van overlappende streamingdiensten naar vier. (*Uber Eats € 42* is bewust een gewone bestelling: bij Lotte verhoogt hij het bestaande signaal, bij de anderen gebeurt er terecht niets. Zo toon je dat de Waakhond niet bij elke uitgave blaft.) Tik *Run de nachtelijke batch*: klaar in enkele milliseconden, met proactieve boodschappen.
6. **Wissel naar Emma** in het demo-paneel: haar saldo dreigt onder nul te gaan vóór haar volgende loon (dringend). Of naar **Marc**: de TUI-boeking van € 1.850 en zijn reisbudget. **Sam & Noor**: de energiefactuur van Luminus die 56 % duurder werd; vraag in de chat "Wat als Noor 4/5 gaat werken?".
7. **Meer → Hoe schaalt dit** voor het verhaal naar de jury: signalen → regels op de transactiestroom + nachtelijke batch → twin per klant → app, Kate, adviseur, kantoor; het taalmodel alleen op vraag. **Welke gegevens** toont exact wat naar de server gaat.

Tips voor de demo-dag:

- Gebruik Metro in LAN-modus (standaard) en niet `--tunnel`: de app leidt het serveradres af uit het adres van Metro. Werkt de wifi niet mee, start dan met `EXPO_PUBLIC_API_URL=http://<ip-van-je-laptop>:3001 npm run dev`.
- Doe 's ochtends *Alles resetten* in het demo-paneel: de app volgt de echte kalender zolang je niets hebt aangepast, maar na demo-acties blijft de klok bewust deterministisch staan op de dag van die acties.
- De app vraagt bij de eerste start toestemming voor meldingen; beantwoord die vóór de jury kijkt. Zonder toestemming werkt alles, alleen de pushmelding niet.

## Wat er precies gebeurt

- **Synthetische data.** Vier persona's, elk ± 18 maanden transacties tot vandaag, gegenereerd met een seeded PRNG (mulberry32) zodat elke start identiek is. Bedragen in integer cents. Belgische handelaars, loon van een genoemde werkgever, huur of KBC-woningkrediet, KBC-verzekeringen, eenmalige kosten.
- **Baseline.** Per categorie de mediaan van de laatste zes volledige maanden. Variabele categorieën worden aan het huidige tempo doorgerekend naar het einde van de maand; in de eerste zes dagen van de maand kijken we naar de laatste 30 dagen.
- **Signalen.** Categorie boven normaal (met een ruisdrempel op basis van de eigen maandelijkse spreiding), budget (bijna) overschreden, nieuw abonnement, abonnement duurder, overlappende abonnementen, ongewone uitgave (z-score ≥ 3 en ≥ € 150), buffer/negatief saldo vóór het volgende inkomen, doel dat opschuift. Elk signaal: ernst, warme boodschap, *Waarom zie ik dit?* met de cijfers en de regel, toekomstimpact via de twin, en acties.
- **Aandacht.** Deduplicatie op stabiele sleutels, maximaal drie actieve signalen gerangschikt op relevantie, snooze van drie dagen, één pushmelding per dag, stille uren 21:00–08:00 (melding wordt dan ingepland om 08:00). De in-app banner werkt altijd; lokale meldingen zijn best effort in Expo Go.
- **Twin.** Maandelijkse projectie tot 2035 en tot de pensioenleeftijd: spaargeld, beleggingen, schuld, woningwaarde, vermogen. Scenario's: werkregime, huis kopen (registratierechten, notaris, quotiteit, betaalbaarheidsregel), extra sparen, anders uitgeven per categorie, een kind (kost min Groeipakket), een auto.
- **Nachtelijke run.** Herrekent de twin en maakt boodschappen: doel schuift op, mijlpaal bereikt, geld dat stilstaat, woonkrediet bijna afbetaald. Ongeveer 10 ms per klant op een telefoon.
- **Chat.** De app stuurt een snapshot met enkel samenvattingen (geen transacties, geen rekeningnummers) plus het gesprek. De server draait Claude (`claude-opus-5-5`, `effort: low`, server-side refusal fallbacks) met vier tools op de gedeelde engine. Weigering → vriendelijke Nederlandse boodschap. Geen verkoop, geen garanties, wel af en toe de suggestie om met een KBC-adviseur te praten.

## Aannames en beperkingen

Alle aannames staan in `engine/assumptions.ts` en op het scherm *Aannames*: inflatie en loonindexering 2 %, spaarrente 2 %, rendement beleggingen 5 % (geen garantie), hypotheekrente 3,5 % over 25 jaar, registratierechten 2 % (Vlaanderen, enige eigen woning), notaris 1,5 % + € 2.500, quotiteit 90 %, betaalbaarheid 35 % van het netto-inkomen, 4/5 werken = 87 % netto, halftijds = 56 %, kind € 600 min Groeipakket € 180, auto € 280 per maand, pensioen 60 % van het laatste nettoloon, wettelijke pensioenleeftijd 67. Bewust vereenvoudigd en zo gelabeld.

Keuzes die niet in de opdracht stonden en die we zelf maakten:

- De historiek wordt bij elke start opnieuw gegenereerd uit de seed; enkel de "overlay" (persona, klok, toegevoegde transacties, beslissingen, gesprekken, budgetten) wordt bewaard in AsyncStorage. Zo blijft de opslag klein en blijft de data identiek.
- Saldo's zijn vaste startwaarden per persona en worden niet gereconcilieerd met de gegenereerde historiek. Demo-transacties en betalingen die door tijdsprongen vallen, worden wel geboekt.
- Lotte's derde streamingdienst is Amazon Prime naast Netflix en Streamz, zodat de demo-knop "Nieuw abonnement Disney+" ook bij haar een nieuw signaal geeft.
- Vroeg in de maand (dag 1 tot 6) gebruikt de regel "meer dan normaal" een venster van 30 dagen in plaats van het maandtempo, zodat de demo ook op de eerste van de maand werkt.
- Pensioen: na de pensioenleeftijd rekent de twin met 60 % van het laatste nettoloon als inkomen, zodat de grafiek tot de pensioenleeftijd betekenis houdt.
- De typed routes van Expo Router staan uit, zodat `tsc --noEmit` niet afhangt van gegenereerde bestanden.

Beperkingen en wat niet af is:

- Niet getest op een fysieke telefoon in deze sessie: wel `expo export` voor Android en iOS, `expo-doctor`, `tsc`, ESLint, 39 unit tests en twee onafhankelijke code-reviews (spec-dekking en runtime-risico's). Het Claude-pad (`/chat` met een echte sleutel) kon niet live getest worden zonder API-sleutel; het pad zonder sleutel (503), de validatie en de offline fallback zijn getest.
- De snapshot bevat wel de enkele betalingen waar een signaal over gaat (datum, bedrag, handelaar), maar geen transactielijst. Het scherm *Welke gegevens* zegt dat zo.
- Lokale meldingen zijn beperkt in Expo Go (zeker op Android); de in-app banner is het primaire pad.
- Geen login, geen echte bankdata, geen KBC-API's, geen KBC-logo's. Eén gebruiker per toestel.
- De chat is niet-streamend; er is een typ-indicator. Antwoorden kunnen enkele seconden duren.
- De what-if-builder werkt met vaste keuzes (chips) in plaats van vrije invoer, om de demo snel en foutloos te houden.

## Structuur

```
engine/          pure TypeScript, gedeeld door app en server (+ __tests__)
server/          Node-backend: index.ts (http, zod, rate limit), chat.ts (Claude tool-loop), schema.ts
src/app/         Expo Router: (tabs)/index|waakhond|toekomst|praat|meer, alert/[id], aannames, gegevens, schaal, demo
src/components/  UI-primitieven, AlertCard, ProjectionChart (react-native-svg), SpendingCompare, Chat, BudgetSheet
src/store/       zustand-store met persist + afgeleide hooks
src/lib/         api (server-detectie), chat (fallback), notifications, haptics, alertActions
src/theme/       kleuren en spacing
```
