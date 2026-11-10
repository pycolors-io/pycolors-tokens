import {
  nativeColors,
  nativePalettes,
  nativePaletteOptions,
  nativeRadiusPreferences,
  nativeTypography,
  nativeTouchTarget,
  type NativeColors,
  type NativeColorScheme,
  type NativePaletteName,
  type NativeRadiusPreference,
} from "@pycolors/tokens/native";

const scheme: NativeColorScheme = "dark";
const palette: NativePaletteName = "arctic-cyan";
const radius: NativeRadiusPreference = "large";
// Color values remain strings: a consumer may apply its own compatible palette.
const customColors: NativeColors = {
  ...nativeColors[scheme],
  ...nativePalettes[palette][scheme],
  primary: "#123456",
};
const selectedPalette: NativePaletteName = nativePaletteOptions[0]!.value;
const minimum: 48 = nativeTouchTarget;
const numericRadius: number = nativeRadiusPreferences[radius];
const fontWeight: "400" | "500" | "600" | "700" =
  nativeTypography.body.fontWeight;
void [customColors, selectedPalette, minimum, numericRadius, fontWeight];

// @ts-expect-error Colors are immutable data, not a global mutable theme.
nativeColors.dark.primary = "#ffffff";
// @ts-expect-error Unknown web presets are not silently accepted.
const invalidPalette: NativePaletteName = "invented";
// @ts-expect-error Mobile supports the two resolved color schemes.
const invalidScheme: NativeColorScheme = "system";
// @ts-expect-error The appearance radius preference is a closed source contract.
const invalidRadius: NativeRadiusPreference = "enormous";
void [invalidPalette, invalidScheme, invalidRadius];
