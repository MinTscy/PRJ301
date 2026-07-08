import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';
import 'package:lucy_mobile/src/widgets/lucy_empty_state.dart';
import 'package:lucy_mobile/src/widgets/lucy_section_card.dart';
import 'package:lucy_mobile/src/widgets/lucy_status_badge.dart';

class UiKitScreen extends StatelessWidget {
  const UiKitScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('LUCY UI Kit')),
      body: ListView(
        padding: const EdgeInsets.all(LucySpacing.md),
        children: [
          const LucySectionCard(
            title: 'Màu sắc',
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _ColorToken('Primary', LucyColors.primary),
                _ColorToken('Secondary', LucyColors.secondary),
                _ColorToken('Success', LucyColors.success),
                _ColorToken('Warning', LucyColors.warning),
                _ColorToken('Danger', LucyColors.danger),
                _ColorToken('Info', LucyColors.info),
              ],
            ),
          ),
          const SizedBox(height: LucySpacing.md),
          const LucySectionCard(
            title: 'Status badges',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                LucyStatusBadge(label: 'Online', status: LucyStatus.success),
                LucyStatusBadge(label: 'Waiting', status: LucyStatus.warning),
                LucyStatusBadge(label: 'Muted', status: LucyStatus.danger),
                LucyStatusBadge(label: 'Pro', status: LucyStatus.info),
              ],
            ),
          ),
          const SizedBox(height: LucySpacing.md),
          LucySectionCard(
            title: 'Controls',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TextField(
                  decoration: InputDecoration(
                    labelText: 'Tên phòng',
                    prefixIcon: Icon(Icons.meeting_room_outlined),
                  ),
                ),
                const SizedBox(height: LucySpacing.sm),
                FilledButton(onPressed: () {}, child: const Text('Primary')),
                const SizedBox(height: LucySpacing.xs),
                OutlinedButton(onPressed: () {}, child: const Text('Secondary')),
              ],
            ),
          ),
          const SizedBox(height: LucySpacing.md),
          const LucyEmptyState(
            icon: Icons.inbox_outlined,
            title: 'Empty state',
            message: 'Dùng khi màn hình chưa có dữ liệu hoặc chưa kết nối.',
          ),
        ],
      ),
    );
  }
}

class _ColorToken extends StatelessWidget {
  const _ColorToken(this.label, this.color);

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 94,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 54,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}
