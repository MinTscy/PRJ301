import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';

class LucyPageHeader extends StatelessWidget {
  const LucyPageHeader({
    required this.eyebrow,
    required this.title,
    required this.description,
    this.trailing,
    super.key,
  });

  final String eyebrow;
  final String title;
  final String description;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow.toUpperCase(),
                  style: const TextStyle(
                    color: LucyColors.primarySoft,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: LucySpacing.xs),
                Text(title, style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: LucySpacing.xs),
                Text(
                  description,
                  style: const TextStyle(
                    color: LucyColors.textMuted,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: LucySpacing.sm),
            trailing!,
          ],
        ],
      ),
    );
  }
}
