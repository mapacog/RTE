# RTE

A fuller MAPA regional traffic dashboard for the Omaha-Council Bluffs metropolitan area.

RTE is the shortened project name for the Regional Traffic Explorer. It keeps the dashboard interface, uses static report maps/charts as placeholders, and reserves map areas for future interactive ArcGIS web maps and charts.

## What Is Included

- React/Vite public-facing dashboard prototype
- MAPA-aligned visual system using official colors, Roboto/Oswald typography, logo assets, and restrained route/arrow linework
- Responsive desktop and mobile layouts
- Sticky navigation and mobile filter drawers
- Overview, Regional Patterns, Intersections, Interchanges, and Multimodal & Freight sections
- Static map and chart placeholders integrated into the relevant dashboard sections
- Short report finding panels that convert report text into public-facing web copy
- Parsed local JSON for 527 intersection rows and 90 interchange rows
- ArcGIS-ready web map slots with layer placeholders for hosted Feature Layers
- GitHub Pages workflow and Vite base path configuration

## Project Structure

```text
.
|- public/
|  `- assets/
|     |- mapa-logo-tag-blue-grey.png
|     |- mapa-logo-white-yellow.png
|     `- report-figures/
|- scripts/
|  |- extractFigureAssets.py
|  `- extractReportData.py
|- src/
|  |- components/
|  |- config/
|  |  `- arcgisLayers.js
|  |- data/
|  |  |- brandTokens.json
|  |  |- dashboardCards.json
|  |  |- reportFigures.json
|  |  |- reportNarrative.json
|  |  |- regionalMetrics.json
|  |  |- topInterchanges.json
|  |  `- topIntersections.json
|  |- styles/
|  |- App.jsx
|  `- main.jsx
|- index.html
|- package.json
`- vite.config.js
```

## Run Locally

```bash
npm install
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173/`.

## Build

```bash
npm run build
npm run preview
```

## ArcGIS Web Map Connection

Hosted layer URLs should be added in:

```text
src/config/arcgisLayers.js
```

The current map areas are designed as web map slots. Replace the placeholder stage in `src/components/ResponsiveMapPanel.jsx` with ArcGIS Maps SDK for JavaScript when authoritative hosted layers or WebMap IDs are available. The static report images are placeholders to keep the dashboard meaningful before GIS services are connected.

Suggested future layer slots:

- Traffic Analysis District layer
- Intersection points layer
- Interchange points layer
- Traffic flow/AADT layer
- Heat map layer

## Data Notes

Intersection and interchange volumes are parsed from report tables. Extracted static visuals are stored in `public/assets/report-figures`. Map positions are sample data pending a source GIS layer/table. Regional trend cards use values explicitly stated in the Regional Traffic Patterns report; small sparkline series are sample display data pending source tables.

The MAPA Brand Identity Guide is used only for visual design guidance, not as a traffic data source.
