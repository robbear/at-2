# UI Vision Overview

Guide to UI Vision Overview Documents

The goal of this overview is to begin building a framework for Atlasphere's component UI and layout such that progress can begin with mock ups and drill downs on each area with an overall container architecture that is flexible for design reconsideration over time.

Atlasphere is intended to run both on mobile devices as well as wide-screen desktop devices.

The outer most window may need room for a banner at the top to display the Atlasphere logo and room for accessing a menu and invoking the search view.

## Important Resource Consideration

The map resource (Mapbox or Google Map) is expensive and so the implementation design should be to load it once and only once, if possible in a Single Page Application design.

## Map View

See `ui-vision-map-view.md`

## Marker Detail View

See `ui-vision-detail-view.md`

## Marker Editor View

See `ui-vision-editor-view.md`

## Search View

See `ui-vision-search-view.md`

## Menu

See `ui-vision-menu.md`

## Auth Flow

See `ui-vision-auth-flow.md`
