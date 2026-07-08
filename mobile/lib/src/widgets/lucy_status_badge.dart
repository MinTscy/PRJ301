import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';

enum LucyStatus { neutral, success, warning, danger, info }

class LucyStatusBadge extends StatelessWidget {
  const LucyStatusBadge({
    required this.label,
    this.status = LucyStatus.neutral,
    this.icon,
    super.key,
  });

  final String label;
  final LucyStatus status;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      LucyStatus.success => LucyColors.success,
      LucyStatus.warning => LucyColors.warning,
      LucyStatus.danger => LucyColors.danger,
      LucyStatus.info => LucyColors.info,
      LucyStatus.neutral => LucyColors.textMuted,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
