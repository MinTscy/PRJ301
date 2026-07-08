import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';
import 'package:lucy_mobile/src/models/pro_session.dart';
import 'package:lucy_mobile/src/widgets/lucy_page_header.dart';
import 'package:lucy_mobile/src/widgets/lucy_section_card.dart';
import 'package:lucy_mobile/src/widgets/lucy_status_badge.dart';
import 'package:lucy_mobile/src/widgets/metric_card.dart';

class OverviewScreen extends StatelessWidget {
  const OverviewScreen({
    required this.session,
    required this.onOpenRoom,
    super.key,
  });

  final ProSession session;
  final VoidCallback onOpenRoom;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: LucySpacing.xl),
      children: [
        LucyPageHeader(
          eyebrow: 'LUCY Pro',
          title: 'Xin chào, ${session.displayName}',
          description: 'Theo dõi phòng học và hỗ trợ học viên theo thời gian thực.',
          trailing: CircleAvatar(
            backgroundColor: LucyColors.primary,
            child: Text(
              session.initials,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: LucySpacing.md),
          child: Column(
            children: [
              GridView.count(
                crossAxisCount: 3,
                childAspectRatio: 0.9,
                crossAxisSpacing: LucySpacing.xs,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: const [
                  MetricCard(
                    label: 'Phòng live',
                    value: '1',
                    icon: Icons.podcasts,
                    color: LucyColors.success,
                  ),
                  MetricCard(
                    label: 'Học viên',
                    value: '—',
                    icon: Icons.groups_2_outlined,
                    color: LucyColors.primarySoft,
                  ),
                  MetricCard(
                    label: 'Chờ duyệt',
                    value: '—',
                    icon: Icons.back_hand_outlined,
                    color: LucyColors.warning,
                  ),
                ],
              ),
              const SizedBox(height: LucySpacing.md),
              LucySectionCard(
                title: 'Phòng học gần đây',
                subtitle: 'Tiếp tục quản lý phòng đang hoạt động',
                icon: Icons.meeting_room_outlined,
                action: const LucyStatusBadge(
                  label: 'Sẵn sàng',
                  status: LucyStatus.success,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Kết nối bằng mã phòng để quản lý hàng đợi và speaker.',
                      style: TextStyle(color: LucyColors.textMuted),
                    ),
                    const SizedBox(height: LucySpacing.md),
                    FilledButton.icon(
                      onPressed: onOpenRoom,
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Mở Pro Dashboard'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: LucySpacing.md),
              const LucySectionCard(
                title: 'Lịch hôm nay',
                icon: Icons.calendar_today_outlined,
                child: Column(
                  children: [
                    _ScheduleItem(
                      time: '09:00',
                      title: 'Survival Speaking',
                      level: 'Level 3',
                    ),
                    Divider(height: 24),
                    _ScheduleItem(
                      time: '14:30',
                      title: 'Daily Conversation',
                      level: 'Level 12',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ScheduleItem extends StatelessWidget {
  const _ScheduleItem({
    required this.time,
    required this.title,
    required this.level,
  });

  final String time;
  final String title;
  final String level;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          time,
          style: const TextStyle(
            color: LucyColors.primarySoft,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(width: LucySpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
              Text(level, style: const TextStyle(color: LucyColors.textMuted)),
            ],
          ),
        ),
      ],
    );
  }
}
