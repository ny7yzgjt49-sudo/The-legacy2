import React from "react";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "@/src/theme/theme";

function TabBg() {
  if (Platform.OS === "ios") {
    return <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />;
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0B1522" }]} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: Platform.OS === "ios" ? "transparent" : "#0B1522",
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => <TabBg />,
        tabBarLabelStyle: { fontFamily: fonts.textMedium, fontSize: 10.5, marginTop: 2 },
      }}
      screenListeners={{
        tabPress: () => Haptics.selectionAsync(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tour"
        options={{
          title: "Tour",
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="candidati"
        options={{
          title: "Candidati",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 8} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="classifica"
        options={{
          title: "Classifica",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
