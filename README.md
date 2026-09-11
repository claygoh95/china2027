# Travel 2027

Multi-trip dashboard: Japan (potential snowboarding), 5–14 March 2027 tentatively; Yunnan, China, 14–23 May 2027.

## Edit the dashboard

- `dist/index.html`: all-trips overview.
- `dist/japan.html`: Japan plans and participants.
- `dist/yunnan.html`: Yunnan details, participants, and pre-wedding shoot planner.
- `dist/style.css`: layout, colours, typography, and mobile styles.
- `dist/app.js`: shared itinerary day selection; trip name and start date come from each page's body data attributes.
- `dist/yunnan.jpg`: banner photograph.

No build step or dependencies are required. To preview locally, run `python3 -m http.server 4173 --directory dist`, then open http://localhost:4173.

Bookings and daily activities are placeholders until real details are supplied. This version has no editing form or database.

## Publishing

The current dashboard is hosted separately on Sites. GitHub edits do not automatically update that deployment. Publish the updated source through Sites after editing, or configure a separate hosting workflow.

## Image credit

Lugu Lake photograph by Aqu1248050, CC BY-SA 4.0. Displayed with a banner crop.
Source: https://commons.wikimedia.org/wiki/File:Lugu_lake_China_Yunnan.jpg
License: https://creativecommons.org/licenses/by-sa/4.0/
