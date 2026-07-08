import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';
import 'package:lucy_mobile/src/widgets/lucy_empty_state.dart';
import 'package:lucy_mobile/src/widgets/lucy_page_header.dart';
import 'package:lucy_mobile/src/widgets/lucy_section_card.dart';
import 'package:lucy_mobile/src/widgets/lucy_status_badge.dart';

class MaterialsScreen extends StatelessWidget {
  const MaterialsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: LucySpacing.xl),
      children: [
        const LucyPageHeader(
          eyebrow: 'Thư viện',
          title: 'Tài liệu phòng học',
          description: 'Quản lý slide, tài liệu và liên kết dùng trong phiên học.',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: LucySpacing.md),
          child: Column(
            children: [
              LucySectionCard(
                title: 'Đang ghim',
                icon: Icons.push_pin_outlined,
                action: IconButton.filledTonal(
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                ),
                child: const Column(
                  children: [
                    _MaterialTile(
                      icon: Icons.slideshow_outlined,
                      title: 'Warm-up prompts',
                      type: 'SLIDE',
                    ),
                    Divider(height: 24),
                    _MaterialTile(
                      icon: Icons.description_outlined,
                      title: 'Speaking vocabulary',
                      type: 'DOCUMENT',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: LucySpacing.md),
              const LucyEmptyState(
                icon: Icons.archive_outlined,
                title: 'Chưa có tài liệu lưu trữ',
                message: 'Tài liệu đã bỏ ghim sẽ xuất hiện tại đây.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MaterialTile extends StatelessWidget {
  const _MaterialTile({
    required this.icon,
    required this.title,
    required this.type,
  });

  final IconData icon;
  final String title;
  final String type;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: LucyColors.primarySoft),
        const SizedBox(width: LucySpacing.sm),
        Expanded(
          child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        ),
        LucyStatusBadge(label: type, status: LucyStatus.info),
      ],
    );
  }
}
