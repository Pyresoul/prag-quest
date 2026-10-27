// Bier-Guide. Angaben aus Web-Recherche (Brauereiseiten, Prag-Tourismus, Reiseführer). Sorten, Hähne und Öffnungszeiten ändern sich.
// where: { pid, note } verweist auf einen Ort der App, { t, q, note } auf eine Google-Maps-Suche.
window.BEER_GUIDE = [
  { id: 'pilsner', cat: 'klassiker', name: 'Pilsner Urquell vom Tank', from: 'Plzeň · Brauerei seit 1842', style: 'Pils, hell',
    why: 'Das Original aller Pilsner. Als „Tankovna“ kommt es unpasteurisiert aus gekühlten Tanks direkt in die Kneipe, oft nur wenige Tage alt und deutlich frischer als aus der Flasche.',
    where: [{ pid: 'b-lokal', note: 'Lokál-Kneipen sind für frisch gezapftes Tankbier bekannt' }, { pid: 'b-zlatytygr', note: 'Klassische Bierkneipe mit Pilsner vom Fass' }, { t: 'Lokál U Bílé Kuželky (Kleinseite)', q: 'Lokál U Bílé Kuželky Praha', note: 'Stand auf der Liste der Brauerei für besonders frisches Pilsner Urquell' }] },
  { id: 'kozel', cat: 'klassiker', name: 'Kozel Dunkel (Černý)', from: 'Velké Popovice', style: 'Dunkles Lager',
    why: 'Das typische tschechische Dunkelbier: mild, leicht malzig, nicht schwer. Guter Einstieg, auch wenn du sonst kein Dunkelbier magst.',
    where: [{ pid: 'b-vol', note: 'Kneipe bei der Burg, bekannt für Kozel' }] },
  { id: 'budvar', cat: 'klassiker', name: 'Budvar (Budweiser Budvar)', from: 'České Budějovice', style: 'Helles Lager',
    why: 'Das Original-Budweiser aus Südböhmen, herber als das amerikanische Gegenstück gleichen Namens (um den Namen gibt es seit Langem Streit).',
    where: [{ pid: 'b-medvidku', note: 'Schenkt Budvar aus, dazu eigene Hausbiere' }] },
  { id: 'rezane', cat: 'klassiker', name: 'Řezané (halb hell, halb dunkel)', from: 'Überall in Tschechien', style: 'Mischbier',
    why: 'Typisch tschechisch: helles und dunkles Bier zusammen gezapft. Bestell „řezané“, wenn du dich nicht zwischen hell und dunkel entscheiden kannst.',
    where: [{ t: 'In fast jeder Hospoda', q: 'Hospoda Praha řezané pivo', note: 'Einfach nach „řezané“ fragen' }] },
  { id: 'fleku', cat: 'haus', name: 'Flekovský tmavý ležák 13°', from: 'U Fleků, Prag · Brauerei seit 1499', style: 'Dunkles Lager, ca. 5 %',
    why: 'Hausgebrautes dunkles Lager aus einer der ältesten Brauereien der Stadt, süßlich-röstig. Es wird vor Ort gebraut. Seit 2020 gibt es dort zusätzlich ein helles Lager.',
    where: [{ pid: 'b-flek', note: 'Große Bierhalle mit Hof, oft voll mit Gruppen' }] },
  { id: 'xbeer', cat: 'stark', name: 'X-BEER 33°', from: 'U Medvídků, Prag', style: 'Dunkel, sehr stark',
    why: 'Wird als eines der stärksten Biere Tschechiens beworben. Eher zum Teilen und Probieren als zum Durstlöschen. Dazu gibt es dort unfiltrierte Hausbiere wie „Oldgott“ und „1466“.',
    where: [{ pid: 'b-medvidku', note: 'Eigene Mikrobrauerei im Haus, Führungen möglich' }] },
  { id: 'norbert', cat: 'haus', name: 'St. Norbert', from: 'Klosterbrauerei Strahov', style: 'Amber, Dunkel, IPA, Weizen',
    why: 'Unfiltriert und unpasteurisiert gebraut. Das Amber (ca. 5,3 %) ist der Klassiker, das Dunkle ist malzig mit leichtem Kaffeearoma, dazu gibt es ein IPA.',
    where: [{ pid: 'b-strahovbrew', note: 'Am Kloster, mit Aussicht über Prag' }] },
  { id: 'benedict', cat: 'haus', name: 'Benedict-Biere', from: 'Klosterbrauerei St. Adalbert, Břevnov', style: 'ca. 20 Sorten',
    why: 'Brauerei im ältesten Männerkloster Böhmens (gegründet 993), seit etwa 2011 wieder in Betrieb. Die Biere gibt es nicht im Laden, nur in ausgewählten Kneipen und im Klosterschank.',
    where: [{ pid: 'k-breunov', note: 'Klosterschank „Klášterní šenk“ mit Sommergarten, Öffnungszeiten prüfen' }] },
  { id: 'dvoukocek', cat: 'haus', name: 'Hausbier „Kočka“', from: 'U Dvou koček, Altstadt', style: 'Hausbrauerei',
    why: 'Kneipe mit eigener Brauerei, die Braukessel stehen gleich am Eingang. Laut Reiseberichten statt des Standard-Pilsners lieber das Hausbier bestellen.',
    where: [{ t: 'U Dvou koček (Altstadt)', q: 'U Dvou koček Praha', note: 'Hausbrauerei, Öffnungszeiten prüfen' }] },
  { id: 'pivdum', cat: 'haus', name: 'Spezialbiere vom Brauhaus', from: 'Pivovarský dům, Neustadt', style: 'wechselnde Sorten',
    why: 'Brauhaus mit wechselndem Angebot an Spezialbieren, zum Beispiel Weizen, Frucht- oder Kaffeebier. Schau vor Ort auf die aktuelle Karte.',
    where: [{ pid: 'b-pivdum' }] },
  { id: 'unetice', cat: 'craft', name: 'Únětické pivo', from: 'Únětice, am Rand von Prag', style: 'Lager, filtriert und unfiltriert',
    why: 'Kleine Brauerei bei Prag, bei Kennern für frisches, gut gemachtes Lager beliebt. Gibt es auch unfiltriert.',
    where: [{ t: 'Únětický pivovar, Únětice', q: 'Únětický pivovar Únětice', note: 'Etwas außerhalb des Zentrums, Verbindung prüfen' }] },
  { id: 'matuska', cat: 'craft', name: 'Matuška (hopfig, Craft)', from: 'Broumy', style: 'Craft, oft hopfig',
    why: 'Bekannte tschechische Craft-Brauerei. Sie hat keine eigene Kneipe in Prag, wird aber in den Craft-Bars ausgeschenkt.',
    where: [{ t: 'BeerGeek Bar', q: 'BeerGeek Bar Praha' }, { t: 'Zlý Časy', q: 'Zlý Časy Praha' }, { t: 'Pivovarský klub', q: 'Pivovarský klub Karlín' }] }
];
window.BEER_VENUES = [
  { t: 'Zlý Časy', area: 'Nusle', q: 'Zlý Časy Praha', d: 'Sehr bekannte Craft-Kneipe mit rund 40 bis 48 Hähnen auf mehreren Etagen. Abends voll, Reservierung empfohlen.' },
  { t: 'Pivovarský klub', area: 'Karlín', q: 'Pivovarský klub Karlín', d: 'Bar und Flaschenladen in einem, viele tschechische und internationale Flaschenbiere.' },
  { t: 'BeerGeek Bar', area: 'Prag', q: 'BeerGeek Bar Praha', d: 'Etwa 30 Hähne und viele Flaschen. Guter Ort, um Craft-Sorten zu vergleichen.' },
  { t: 'Prague Beer Museum', area: 'Altstadt', q: 'Prague Beer Museum Praha', d: 'Rund 30 Biere vom Fass, meist sehr voll und touristisch.' }
];
window.BEER_CATS = [['all', 'Alle'], ['klassiker', 'Klassiker'], ['haus', 'Hausbrauerei'], ['craft', 'Craft'], ['stark', 'Stark']];
