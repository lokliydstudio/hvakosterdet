# Hva koster det?

En statisk, responsiv nettside med fem norske hverdagskalkulatorer. Strømkalkulatorene bruker spotpris for valgt norsk prisområde.

## Ny spotprisfunksjon

- Postnummer foreslår automatisk prisområde NO1–NO5.
- Prisområdet kan alltid overstyres manuelt.
- Spotpris hentes time for time fra det åpne API-et til Hva koster strømmen?.
- Brukeren kan velge pris akkurat nå, dagens gjennomsnitt eller en egen spotpris.
- Mva. legges til automatisk i NO1, NO2, NO3 og NO5. NO4 vises uten mva.
- Nettleie, leverandørpåslag, strømstøtte og andre avgifter er ikke med.
- Ved API-feil går siden over til manuell spotpris.

Postnummerdataene bygger på Brings åpne postnummerregister, oppdatert 26. mai 2026. Prisområder følger strømnettet og kan enkelte steder krysse postnummer- og kommunegrenser. Derfor er manuelt områdevalg tilgjengelig.

## Publisering

1. Bytt `https://dittdomene.no/` i `index.html`, `robots.txt` og `sitemap.xml`.
2. Oppdater kontaktinformasjon og personvernerklæring.
3. Last opp alle filene til rotmappen på webhotellet.
4. Nettstedet må publiseres via HTTPS for stabil tilgang til pris-API-et.
5. Koble nyhetsbrevskjemaet til ønsket e-posttjeneste.
6. Erstatt annonseplassene med annonsekode først etter at samtykkeløsning og personvern er på plass.

## Filer

- `index.html` – forside og kalkulatorer
- `styles.css` – design og mobiltilpasning
- `app.js` – beregninger, spotpris og interaksjon
- `postal-data.js` – postnummer, poststed og automatisk prisområdeforslag
- `personvern.html` – enkel personvernmal
- `kontakt.html` – kontaktside
- `robots.txt` og `sitemap.xml` – grunnleggende SEO

## Viktig

Beregningene er estimater. Spotpris alene er ikke det samme som sluttprisen på strømregningen. Test og kvalitetssikre formler, områdeoppslag og standardverdier før kommersiell publisering.
