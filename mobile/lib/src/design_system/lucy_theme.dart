import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';

abstract final class LucyTheme {
  static ThemeData get dark {
    final outline = OutlineInputBorder(
      borderRadius: BorderRadius.circular(LucySpacing.controlRadius),
      borderSide: const BorderSide(color: LucyColors.border),
    );

    return ThemeData(
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: LucyColors.primary,
        brightness: Brightness.dark,
        surface: LucyColors.surface,
        error: LucyColors.danger,
      ),
      scaffoldBackgroundColor: LucyColors.background,
      useMaterial3: true,
      appBarTheme: const AppBarTheme(
        backgroundColor: LucyColors.background,
        foregroundColor: LucyColors.text,
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardThemeData(
        color: LucyColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(LucySpacing.cardRadius),
          side: const BorderSide(color: LucyColors.border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: LucyColors.surface,
        border: outline,
        enabledBorder: outline,
        focusedBorder: outline.copyWith(
          borderSide: const BorderSide(color: LucyColors.primary, width: 1.6),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: LucySpacing.md,
          vertical: LucySpacing.md,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: LucyColors.surface,
        indicatorColor: LucyColors.primary.withValues(alpha: 0.2),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 50),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(LucySpacing.controlRadius),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 50),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(LucySpacing.controlRadius),
          ),
          side: const BorderSide(color: LucyColors.border),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      dividerColor: LucyColors.border,
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          color: LucyColors.text,
          fontWeight: FontWeight.w900,
          letterSpacing: -0.8,
        ),
        headlineMedium: TextStyle(
          color: LucyColors.text,
          fontWeight: FontWeight.w900,
        ),
        titleLarge: TextStyle(
          color: LucyColors.text,
          fontWeight: FontWeight.w900,
        ),
        titleMedium: TextStyle(
          color: LucyColors.text,
          fontWeight: FontWeight.w800,
        ),
        bodyLarge: TextStyle(color: LucyColors.text),
        bodyMedium: TextStyle(color: LucyColors.text),
        bodySmall: TextStyle(color: LucyColors.textMuted),
      ),
    );
  }
}
