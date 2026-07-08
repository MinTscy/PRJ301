import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/models/participant.dart';

class ParticipantCard extends StatelessWidget {
  const ParticipantCard({
    required this.participant,
    required this.busy,
    required this.onApprove,
    required this.onMoveToAudience,
    super.key,
  });

  final Participant participant;
  final bool busy;
  final VoidCallback onApprove;
  final VoidCallback onMoveToAudience;

  @override
  Widget build(BuildContext context) {
    final color = participant.handRaised
        ? const Color(0xFFFFB74D)
        : participant.isSpeaker
            ? const Color(0xFF54D6A1)
            : const Color(0xFF8C7CF6);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            CircleAvatar(
              radius: 23,
              backgroundColor: color.withValues(alpha: 0.18),
              child: Text(
                participant.initials,
                style: TextStyle(color: color, fontWeight: FontWeight.w900),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          participant.displayName,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _StatusDot(
                        icon: participant.micMuted ? Icons.mic_off : Icons.mic,
                        color: participant.micMuted
                            ? Colors.white38
                            : const Color(0xFF54D6A1),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    participant.handRaised
                        ? 'Đang chờ được phát biểu'
                        : participant.isSpeaker
                            ? 'Speaker đang hoạt động'
                            : 'Audience',
                    style: TextStyle(color: color, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (busy)
              const SizedBox.square(
                dimension: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else if (participant.isSpeaker)
              IconButton.filledTonal(
                tooltip: 'Chuyển về audience',
                onPressed: onMoveToAudience,
                icon: const Icon(Icons.volume_off_outlined),
              )
            else if (participant.handRaised)
              FilledButton.tonalIcon(
                onPressed: onApprove,
                icon: const Icon(Icons.mic, size: 18),
                label: const Text('Duyệt'),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Icon(icon, size: 17, color: color);
  }
}

