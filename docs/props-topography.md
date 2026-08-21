# Topography props

| Prop                | Type                                  | Default       | Description                                              |
|---------------------|---------------------------------------|---------------|----------------------------------------------------------|
| `lowColor`          | `string`                              | `#5227FF`     | Lowest elevation color.                                  |
| `midColor`          | `string`                              | `#FF9FFC`     | Mid elevation color.                                     |
| `highColor`         | `string`                              | `#FFFFFF`     | Highest elevation color.                                 |
| `speed`             | `number`                              | `0.35`        | Field evolution speed.                                   |
| `morphAmount`       | `number`                              | `3.0`         | Bezier control amplitude.                                |
| `morphSpeed`        | `number`                              | `0.05`        | Bezier control wobble speed.                             |
| `bands`             | `number`                              | `2.0`         | Contour band density.                                    |
| `thickness`         | `number`                              | `0.01`        | Line thickness.                                          |
| `scale`             | `number`                              | `1.0`         | Field zoom.                                              |
| `pixelSize`         | `number`                              | `1.0`         | >1 enables pixelation.                                   |
| `glow`              | `number`                              | `0.5`         | Soft glow around lines.                                  |
| `colorMode`         | `'elevation'\|'uniform'\|'alternating'` | `'elevation'` | How line color is chosen.                                |
| `contrast`          | `number`                              | `3.0`         | Coverage gamma.                                          |
| `brightness`        | `number`                              | `1.0`         | Final multiplier.                                        |
| `fillBands`         | `boolean`                             | `false`       | Fill the area between lines.                             |
| `opacity`           | `number`                              | `1.0`         | Final alpha multiplier.                                  |
| `grain`             | `boolean`                             | `true`        | Add film grain.                                          |
| `grainIntensity`    | `number`                              | `0.05`        | Grain strength.                                          |
| `mouseInteraction`  | `boolean`                             | `true`        | Whether the pointer deforms the field.                   |
| `mouseRadius`       | `number`                              | `0.3`         | Pointer bump radius.                                     |
| `mouseStrength`     | `number`                              | `0.4`         | Pointer bump strength.                                   |
| `className`         | `string`                              | `''`          | extra classes on the container.                          |
