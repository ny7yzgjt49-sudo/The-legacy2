import React from "react";
import {
  Text,
  TextProps,
  Pressable,
  PressableProps,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius, spacing } from "@/src/theme/theme";

// ---- Text ----------------------------------------------------------------
export function Display(props: TextProps & { size?: number; color?: string }) {
  const { style, size = 34, color = colors.onSurface, ...rest } = props;
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.display, fontSize: size, color, lineHeight: size * 1.08 }, style]}
    />
  );
}

export function AppText(
  props: TextProps & { weight?: "regular" | "medium" | "bold" | "black"; size?: number; color?: string }
) {
  const { style, weight = "regular", size = 14, color = colors.onSurfaceSecondary, ...rest } = props;
  const family =
    weight === "bold" ? fonts.textBold : weight === "medium" ? fonts.textMedium : weight === "black" ? fonts.textBlack : fonts.text;
  return <Text {...rest} style={[{ fontFamily: family, fontSize: size, color }, style]} />;
}

// ---- Buttons -------------------------------------------------------------
type BtnProps = PressableProps & {
  title: string;
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function Button({ title, variant = "primary", loading, fullWidth = true, style, onPress, disabled, ...rest }: BtnProps) {
  const bg = variant === "primary" ? colors.brandPrimary : "transparent";
  const border = variant === "outline" ? colors.borderStrong : "transparent";
  const txtColor = variant === "primary" ? colors.onBrandPrimary : colors.onSurface;

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === "outline" ? 1 : 0 },
        fullWidth && { alignSelf: "stretch" },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txtColor} />
      ) : (
        <Text style={{ fontFamily: fonts.textBold, fontSize: 15, color: txtColor, letterSpacing: 0.3 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

// ---- Chip ----------------------------------------------------------------
export function Chip({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
    >
      <Text
        style={{
          fontFamily: fonts.textMedium,
          fontSize: 13,
          color: active ? colors.onBrandPrimary : colors.onSurfaceSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipIdle: { backgroundColor: "transparent", borderColor: colors.borderStrong },
});
