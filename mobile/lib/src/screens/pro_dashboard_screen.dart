import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/config/app_config.dart';
import 'package:lucy_mobile/src/models/participant.dart';
import 'package:lucy_mobile/src/models/room_state.dart';
import 'package:lucy_mobile/src/services/microphone_permission_service.dart';
import 'package:lucy_mobile/src/services/realtime_room_service.dart';
import 'package:lucy_mobile/src/widgets/metric_card.dart';
import 'package:lucy_mobile/src/widgets/participant_card.dart';
import 'package:lucy_mobile/src/widgets/gift_celebration_overlay.dart';

class ProDashboardScreen extends StatefulWidget {
  const ProDashboardScreen({
    this.initialDisplayName = 'LUCY Pro',
    this.initialAccessToken = '',
    this.embedded = false,
    super.key,
  });

  final String initialDisplayName;
  final String initialAccessToken;
  final bool embedded;

  @override
  State<ProDashboardScreen> createState() => _ProDashboardScreenState();
}

class _ProDashboardScreenState extends State<ProDashboardScreen> {
  final _service = RealtimeRoomService();
  final _microphonePermissions = const MicrophonePermissionService();
  final _formKey = GlobalKey<FormState>();
  final _baseUrlController =
      TextEditingController(text: AppConfig.realtimeBaseUrl);
  final _roomCodeController = TextEditingController();
  late final TextEditingController _displayNameController;
  late final TextEditingController _accessTokenController;

  final _subscriptions = <StreamSubscription<dynamic>>[];
  final _busyPersonaIds = <String>{};
  RoomState? _roomState;
  ConnectionStatus _status = ConnectionStatus.disconnected;
  String? _error;

  @override
  void initState() {
    super.initState();
    _displayNameController =
        TextEditingController(text: widget.initialDisplayName);
    _accessTokenController =
        TextEditingController(text: widget.initialAccessToken);
    _subscriptions.addAll([
      _service.roomStates.listen(_mergeRoomState),
      _service.statuses.listen((status) {
        if (!mounted) return;
        setState(() => _status = status);
      }),
      _service.errors.listen((message) {
        if (!mounted) return;
        setState(() => _error = message);
      }),
      _service.gifts.listen((gift) {
        if (!mounted) return;
        GiftCelebrationOverlay.show(context, gift);
      }),
    ]);
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      unawaited(subscription.cancel());
    }
    unawaited(_service.dispose());
    _baseUrlController.dispose();
    _roomCodeController.dispose();
    _displayNameController.dispose();
    _accessTokenController.dispose();
    super.dispose();
  }

  void _mergeRoomState(RoomState incoming) {
    if (!mounted) return;
    setState(() {
      final previous = _roomState;
      _roomState = RoomState(
        roomCode: incoming.roomCode.isEmpty
            ? previous?.roomCode ?? _roomCodeController.text
            : incoming.roomCode,
        participants: incoming.participants.isEmpty &&
                previous != null &&
                previous.participants.isNotEmpty
            ? previous.participants
            : incoming.participants,
        currentStep: incoming.currentStep ?? previous?.currentStep,
        nextStep: incoming.nextStep ?? previous?.nextStep,
        completed: incoming.completed,
      );
      _error = null;
    });
  }

  Future<void> _connect() async {
    if (!_formKey.currentState!.validate()) return;
    final microphonePermission = await _microphonePermissions.request();
    if (microphonePermission != MicrophonePermissionResult.granted) {
      if (!mounted) return;
      final permanentlyDenied =
          microphonePermission == MicrophonePermissionResult.permanentlyDenied;
      final message = permanentlyDenied
          ? 'Quyền microphone đã bị tắt. Hãy bật lại trong Cài đặt ứng dụng.'
          : 'LUCY cần quyền microphone để hỗ trợ phát biểu trong phòng.';
      setState(() => _error = message);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          action: permanentlyDenied
              ? SnackBarAction(
                  label: 'Mở cài đặt',
                  onPressed: () {
                    _microphonePermissions.openSettings();
                  },
                )
              : null,
        ),
      );
      return;
    }
    setState(() {
      _error = null;
      _roomState = RoomState.empty(_roomCodeController.text.trim());
    });

    await _service.connect(
      baseUrl: _baseUrlController.text,
      roomCode: _roomCodeController.text,
      personaId: 'mobile_pro_${DateTime.now().millisecondsSinceEpoch}',
      displayName: _displayNameController.text.trim(),
      accessToken: _accessTokenController.text.trim(),
    );
  }

  Future<void> _moderate(
    Participant participant,
    Future<void> Function(ParticipantTarget target) action,
  ) async {
    setState(() {
      _busyPersonaIds.add(participant.personaId);
      _error = null;
    });
    try {
      await action(ParticipantTarget(participant.personaId));
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _busyPersonaIds.remove(participant.personaId));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = _roomState;
    final connected = _status == ConnectionStatus.connected;

    return Scaffold(
      appBar: widget.embedded
          ? null
          : AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pro Dashboard', style: TextStyle(fontWeight: FontWeight.w900)),
            Text(
              'Quản lý học viên trong phòng',
              style: TextStyle(fontSize: 12, color: Colors.white54),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Chip(
              avatar: Icon(
                Icons.circle,
                size: 10,
                color: connected ? const Color(0xFF54D6A1) : Colors.orange,
              ),
              label: Text(connected ? 'Realtime' : 'Offline'),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          children: [
            if (widget.embedded)
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text(
                  'Phòng live',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900),
                ),
              ),
            _ConnectionPanel(
              formKey: _formKey,
              baseUrlController: _baseUrlController,
              roomCodeController: _roomCodeController,
              displayNameController: _displayNameController,
              accessTokenController: _accessTokenController,
              status: _status,
              onConnect: _connect,
              onDisconnect: _service.disconnect,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              MaterialBanner(
                padding: const EdgeInsets.all(14),
                backgroundColor: Colors.red.withValues(alpha: 0.12),
                content: Text(_error!),
                actions: [
                  TextButton(
                    onPressed: () => setState(() => _error = null),
                    child: const Text('Đóng'),
                  ),
                ],
              ),
            ],
            if (state != null) ...[
              const SizedBox(height: 18),
              _StageCard(state: state),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 3,
                childAspectRatio: 0.88,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  MetricCard(
                    label: 'Học viên',
                    value: '${state.learners.length}',
                    icon: Icons.groups_2_outlined,
                    color: const Color(0xFF8C7CF6),
                  ),
                  MetricCard(
                    label: 'Giơ tay',
                    value: '${state.raisedHands.length}',
                    icon: Icons.back_hand_outlined,
                    color: const Color(0xFFFFB74D),
                  ),
                  MetricCard(
                    label: 'Speaker',
                    value: '${state.speakers.length}',
                    icon: Icons.mic_none,
                    color: const Color(0xFF54D6A1),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _SectionHeader(
                title: 'Đang chờ phát biểu',
                count: state.raisedHands.length,
                icon: Icons.notifications_active_outlined,
              ),
              const SizedBox(height: 10),
              if (state.raisedHands.isEmpty)
                const _EmptyCard(
                  message: 'Chưa có học viên nào đang giơ tay.',
                )
              else
                ...state.raisedHands.map(_participantCard),
              const SizedBox(height: 24),
              _SectionHeader(
                title: 'Speaker hiện tại',
                count: state.speakers.length,
                icon: Icons.graphic_eq,
              ),
              const SizedBox(height: 10),
              if (state.speakers.isEmpty)
                const _EmptyCard(message: 'Chưa có speaker đang hoạt động.')
              else
                ...state.speakers.map(_participantCard),
              const SizedBox(height: 24),
              _SectionHeader(
                title: 'Tất cả học viên',
                count: state.learners.length,
                icon: Icons.people_alt_outlined,
              ),
              const SizedBox(height: 10),
              if (state.learners.isEmpty)
                const _EmptyCard(message: 'Phòng chưa có học viên.')
              else
                ...state.learners.map(_participantCard),
            ],
          ],
        ),
      ),
    );
  }

  Widget _participantCard(Participant participant) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: ParticipantCard(
        participant: participant,
        busy: _busyPersonaIds.contains(participant.personaId),
        onApprove: () => _moderate(participant, _service.approveSpeaker),
        onMoveToAudience: () =>
            _moderate(participant, _service.moveToAudience),
      ),
    );
  }
}

class _ConnectionPanel extends StatelessWidget {
  const _ConnectionPanel({
    required this.formKey,
    required this.baseUrlController,
    required this.roomCodeController,
    required this.displayNameController,
    required this.accessTokenController,
    required this.status,
    required this.onConnect,
    required this.onDisconnect,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController baseUrlController;
  final TextEditingController roomCodeController;
  final TextEditingController displayNameController;
  final TextEditingController accessTokenController;
  final ConnectionStatus status;
  final VoidCallback onConnect;
  final VoidCallback onDisconnect;

  @override
  Widget build(BuildContext context) {
    final connecting = status == ConnectionStatus.connecting;
    final connected = status == ConnectionStatus.connected;

    return Card(
      child: ExpansionTile(
        initiallyExpanded: true,
        leading: const Icon(Icons.hub_outlined),
        title: Text(
          connected ? roomCodeController.text.toUpperCase() : 'Kết nối phòng',
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          connected
              ? 'Đang nhận trạng thái học viên theo thời gian thực'
              : 'Dùng tài khoản LUCY_PRO hoặc LUCY_SUPER',
        ),
        children: [
          Form(
            key: formKey,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                children: [
                  TextFormField(
                    controller: baseUrlController,
                    enabled: !connected,
                    decoration: const InputDecoration(
                      labelText: 'Realtime URL',
                      prefixIcon: Icon(Icons.dns_outlined),
                    ),
                    validator: _required,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: roomCodeController,
                    enabled: !connected,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Mã phòng',
                      hintText: 'LUCY-12345678',
                      prefixIcon: Icon(Icons.meeting_room_outlined),
                    ),
                    validator: _required,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: displayNameController,
                    enabled: !connected,
                    decoration: const InputDecoration(
                      labelText: 'Tên hiển thị',
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                    validator: _required,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: accessTokenController,
                    enabled: !connected,
                    obscureText: true,
                    autocorrect: false,
                    enableSuggestions: false,
                    decoration: const InputDecoration(
                      labelText: 'Access token Pro',
                      prefixIcon: Icon(Icons.key_outlined),
                    ),
                    validator: _required,
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: connected
                        ? OutlinedButton.icon(
                            onPressed: onDisconnect,
                            icon: const Icon(Icons.link_off),
                            label: const Text('Ngắt kết nối'),
                          )
                        : FilledButton.icon(
                            onPressed: connecting ? null : onConnect,
                            icon: connecting
                                ? const SizedBox.square(
                                    dimension: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.login),
                            label: Text(
                              connecting ? 'Đang kết nối...' : 'Vào phòng',
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String? _required(String? value) {
    return value == null || value.trim().isEmpty
        ? 'Trường này là bắt buộc'
        : null;
  }
}

class _StageCard extends StatelessWidget {
  const _StageCard({required this.state});

  final RoomState state;

  @override
  Widget build(BuildContext context) {
    final current = state.currentStep;
    final next = state.nextStep;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFF7C5CFC).withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.timer_outlined, color: Color(0xFFAD9FFF)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    state.completed
                        ? 'Đã hoàn thành'
                        : 'Chủ đề ${current?.subOrder ?? '-'}',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    current?.title ?? 'Đang chờ timeline',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white60),
                  ),
                  if (next != null)
                    Text(
                      'Tiếp theo: ${next.title}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFFAD9FFF),
                        fontSize: 12,
                      ),
                    ),
                ],
              ),
            ),
            if (current != null)
              Text(
                '${current.durationMinutes} phút',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.count,
    required this.icon,
  });

  final String title;
  final int count;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: const Color(0xFFAD9FFF)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ),
        Badge(label: Text('$count')),
      ],
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            const Icon(Icons.inbox_outlined, color: Colors.white38),
            const SizedBox(width: 12),
            Expanded(
              child: Text(message, style: const TextStyle(color: Colors.white54)),
            ),
          ],
        ),
      ),
    );
  }
}
