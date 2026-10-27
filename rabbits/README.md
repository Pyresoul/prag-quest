# Eigene Hasen-Bilder

Die App zeichnet die Hasen standardmäßig als SVG (`rabbits.js`). Wer lieber eigene Bilder nutzt (z. B. mit ComfyUI/SDXL erzeugt oder gezeichnet):

1. PNG oder WebP mit transparentem Hintergrund hier ablegen, Dateiname `<farbe>-<pose>.png`.
   Farben: `mustard`, `grey`, `orange`, `red`. Posen: `stand`, `guard`, `trumpet`, `lens`, `point`, `stop`, `burst`, `walk`, `attack`, `peek`.
   Beispiel: `orange-attack.png`
2. Dateinamen in `rabbits.js` in die Liste eintragen: `window.RABBIT_IMAGES = ['orange-attack.png', ...];`
3. Fehlende Kombinationen bleiben automatisch bei der SVG-Zeichnung.

Empfohlen: quadratisch bis hochkant, ca. 400 px, freigestellt. Nur Bilder verwenden, für die ihr die Rechte habt (offizielles Artwork ist urheberrechtlich geschützt).
