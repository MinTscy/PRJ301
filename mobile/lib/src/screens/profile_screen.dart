import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';
import 'package:lucy_mobile/src/models/pro_session.dart';
import 'package:lucy_mobile/src/screens/ui_kit_screen.dart';
import 'package:lucy_mobile/src/widgets/lucy_page_header.dart';
import 'package:lucy_mobile/src/widgets/lucy_section_card.dart';
import 'package:lucy_mobile/src/widgets/lucy_status_badge.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    required this.session,
    required this.onLogout,
    super.key,
  });

  final ProSession session;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: LucySpacing.xl),
      children: [
        const LucyPageHeader(
          eyebrow: 'Tài khoản',
          title: 'Hồ sơ mentor',
          description: 'Thiết lập tài khoản, giao diện và kết nối ứng dụng.',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: LucySpacing.md),
          child: Column(
            children: [
              LucySectionCard(
                title: session.displayName,
                subtitle: session.email,
                icon: Icons.person_outline,
                action: const LucyStatusBadge(
                  label: 'LUCY PRO',
                  status: LucyStatus.info,
                ),
                child: const Text(
                  'Đã sẵn sàng quản lý học viên và speaker.',
                  style: TextStyle(color: LucyColors.textMuted),
                ),
              ),
              const SizedBox(height: LucySpacing.md),
              LucySectionCard(
                title: 'Cài đặt',
                icon: Icons.settings_outlined,
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(
                        Icons.palette_outlined,
                        color: LucyColors.primarySoft,
                      ),
                      title: const Text('UI Kit'),
                      subtitle: const Text('Tokens và component chuẩn'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const UiKitScreen(),
                        ),
                      ),
                    ),
                    const Divider(),
                    const ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        Icons.notifications_none,
                        color: LucyColors.primarySoft,
                      ),
                      title: Text('Thông báo'),
                      subtitle: Text('Giơ tay và thay đổi speaker'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: LucySpacing.md),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onLogout,
                  icon: const Icon(Icons.logout, color: LucyColors.danger),
                  label: const Text(
                    'Đăng xuất',
                    style: TextStyle(color: LucyColors.danger),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
