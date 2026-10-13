
# Regional Traffic Explorer (RTE) — 2025 Beta

An interactive transportation data explorer developed by the **Metropolitan Area Planning Agency (MAPA)** to visualize and explore regional traffic patterns across the Omaha–Council Bluffs metropolitan area.

The application brings together interactive maps, charts, tables, and traffic rankings to support exploration of regional transportation trends.

## Features

- **Interactive Maps:** Explore regional traffic volumes, patterns, and transportation networks using ArcGIS web maps.
- **Traffic Rankings:** View and compare intersection and interchange traffic volumes across jurisdictions.
- **Charts & Tables:** Explore transportation indicators through interactive visualizations and searchable data tables.
- **Regional Trends:** Examine traffic patterns and changes across the reporting period.
- **Accessibility:** Responsive layouts, English/Spanish content, keyboard navigation, and customizable display preferences.

## Technology

- React + Vite
- ArcGIS Maps SDK for JavaScript
- ArcGIS Online Feature Services
- Google Charts
- GitHub Pages

## Deployment

The application is hosted on GitHub Pages, with deployment managed through the repository's GitHub Actions workflow.

## Data Sources

Transportation data and visualizations are sourced from MAPA's published reports, ArcGIS Online services, and supporting public datasets.

Data availability and updates depend on the respective source services.

PDF report links open the Google Drive files configured in `src/data/reportDownloads.json`, rather than the bundled PDF copies. Upload revised PDFs as new versions of the same Drive files to retain their links; replacing them with new file IDs requires updating the configuration. Ensure approved reports are viewable by the public without signing in. The app does not change Drive sharing permissions.

Location photography is configured in `src/data/metroPhotos.json` and stored as optimized WebP assets in `public/assets/metro-photos`. These images provide place and travel-mode context, not dated traffic observations. Camera metadata is removed from the published assets; original photos remain outside the public asset folder.

## Accessibility

The Regional Traffic Explorer is designed with **Web Content Accessibility Guidelines (WCAG) 2.2 Level AA** as its accessibility target.

Accessibility features include keyboard navigation, responsive layouts, screen-reader-friendly controls, adjustable text sizes, high-contrast display options, reduced-motion support, and English/Spanish content.

Full WCAG 2.2 AA conformance has not been independently verified. Third-party components, including ArcGIS maps and embedded Google charts, may have accessibility limitations.

## Disclaimer

This application is a beta release. Data and visualizations are provided for informational purposes and may be updated as reporting and validation continue.

## Maintained By

**Metropolitan Area Planning Agency (MAPA)**  
https://mapacog.org
