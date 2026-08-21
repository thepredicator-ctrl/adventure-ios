# LineSidebar props

| Prop              | Type                           | Default     | Description                                              |
|-------------------|--------------------------------|-------------|----------------------------------------------------------|
| `items`           | `string[]`                     | see source  | Navigation labels.                                       |
| `accentColor`     | `string`                       | `#A855F7`   | Hover/active color.                                      |
| `textColor`       | `string`                       | `#c4c4c4`   | Idle label color.                                        |
| `markerColor`     | `string`                       | `#6c6c6c`   | Idle tick color.                                         |
| `showIndex`       | `boolean`                      | `true`      | Show `01`, `02`, … prefix.                               |
| `showMarker`      | `boolean`                      | `true`      | Show the horizontal tick next to each item.              |
| `proximityRadius` | `number`                       | `100`       | px around the cursor that triggers the effect.           |
| `maxShift`        | `number`                       | `30`        | max px the label translates when fully active.           |
| `falloff`         | `'linear'\|'smooth'\|'sharp'`| `'smooth'`  | Proximity curve.                                         |
| `markerLength`    | `number`                       | `60`        | tick length in px.                                       |
| `markerGap`       | `number`                       | `0`         | gap between tick and label.                              |
| `tickScale`       | `number`                       | `0.5`       | scale of the "tick" pseudo-element under each item.      |
| `scaleTick`       | `boolean`                      | `true`      | animate the tick scale with `--effect`.                  |
| `itemGap`         | `number`                       | `20`        | vertical gap between items in px.                        |
| `fontSize`        | `number`                       | `1.1`       | label font size in `rem`.                                |
| `smoothing`       | `number`                       | `100`       | easing time constant in ms (lower = snappier).           |
| `defaultActive`   | `number\|null`                | `null`      | index to mark active on mount.                           |
| `onItemClick`     | `(index, label) => void`       | —           | click callback.                                          |
| `className`       | `string`                       | `''`        | extra classes on the `<nav>`.                            |
