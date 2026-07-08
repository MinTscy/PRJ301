import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';

class LucyEmptyState extends StatelessWidget {
  const LucyEmptyState({
    required this.icon,
    required this.title,
    required this.message,
    this.action,
    super.key,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(LucySpacing.lg),
        child: Center(
          child: Column(
            children: [
              Icon(icon, size: 42, color: LucyColors.primarySoft),
              const SizedBox(height: LucySpacing.md),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: LucySpacing.xs),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: LucyColors.textMuted, height: 1.4),
              ),
              if (action != null) ...[
                const SizedBox(height: LucySpacing.md),
                action!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}
