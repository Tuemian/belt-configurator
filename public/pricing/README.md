# Pricing file format

Place your price list at:

- `public/pricing/price-list.xlsx`

Sheet name must be:

- `Components`

Required columns:

- `key`
- `label_de`
- `label_en`
- `label_it`
- `price_eur`
- `unit`

Supported units:

- `per_meter`
- `per_unit`
- `per_m2`
- `per_mm_width`

Expected keys:

- `frame_motis40`, `frame_motis80`
- `belt_standard`, `belt_grip`, `belt_heavy_grip`, `belt_food_safe`
- `drive_direct`, `drive_indirect`, `drive_center`, `drive_drum`
- `stand_basic`, `feet_set`, `castor_set`, `floor_bolt_set`, `height_adjust`
- `side_guide`

Behavior:

- If all required keys for a configuration have valid prices (> 0), the app shows a total estimate.
- If one or more prices are missing, the app shows `Price on request` and marks missing items.
- If the Excel file is missing or invalid, the app shows `Price on request`.

To update prices, replace the `price-list.xlsx` file. No code change is needed.
