# Lucide Icons

The active pages (`index.html` and `overview.html`) use **Lucide**, pinned to `lucide-react` **0.552.0**, sourced from the existing Naive / Pixel-Perfect project. Icons use the official 24 px grid and 2 px rounded strokes. The credit star and status circle retain their filled presentation.

- Upstream: https://github.com/lucide-icons/lucide
- License: ISC, with MIT notices for portions derived from Feather. Commercial use, modification and redistribution are permitted with the notices retained.
- Full notices: [lucide-LICENSE.txt](../../licenses/lucide-LICENSE.txt)
- Provenance: [manifest.json](manifest.json), including upstream modules and their SHA-256 hashes.

## Usage

```html
<svg class="app-icon" data-icon="search" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <use href="./assets/icons/lucide-sprite.svg#search"></use>
</svg>
```

Dynamic HTML uses `UI_ICON('search')` or `UI_ICON('search', 'w-4 h-4')` from `icons.js`. Semantic names in the manifest are stable across the app; each maps to an official Lucide module. Accessible labels belong on the surrounding controls. `icons.css` applies the shared stroke style and inherits the surrounding text color.

The sprite, runtime helper, and standalone CSS mask assets load locally, without React or a third-party icon service at runtime. Regenerate them from the pinned package with:

```sh
python3 scripts/build-icons.py /path/to/node_modules/lucide-react
```

Brand artwork, user avatars, data charts, progress rings, and symbols inside research/log content remain their own assets or content. The historical `index_backup_chat-center.html` snapshot is not an active page and is left intact.
