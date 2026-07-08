enum AccountRole {
  lucy,
  lucyPro,
  lucySuper;

  static AccountRole fromJson(Object? value) {
    return switch (value) {
      'LUCY_PRO' => AccountRole.lucyPro,
      'LUCY_SUPER' => AccountRole.lucySuper,
      _ => AccountRole.lucy,
    };
  }

  String get label => switch (this) {
        AccountRole.lucy => 'Learner',
        AccountRole.lucyPro => 'Pro',
        AccountRole.lucySuper => 'Super',
      };
}

enum ParticipantRole {
  audience,
  speaker,
  moderator;

  static ParticipantRole fromJson(Object? value) {
    return switch (value) {
      'speaker' => ParticipantRole.speaker,
      'moderator' => ParticipantRole.moderator,
      _ => ParticipantRole.audience,
    };
  }
}

class Participant {
  const Participant({
    required this.socketId,
    required this.personaId,
    required this.displayName,
    required this.accountRole,
    required this.participantRole,
    required this.micMuted,
    required this.handRaised,
    required this.joinedAt,
  });

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      socketId: json['socketId'] as String? ?? '',
      personaId: json['personaId'] as String? ?? '',
      displayName: json['displayName'] as String? ?? 'Unknown learner',
      accountRole: AccountRole.fromJson(json['accountRole']),
      participantRole: ParticipantRole.fromJson(json['participantRole']),
      micMuted: json['micMuted'] as bool? ?? true,
      handRaised: json['handRaised'] as bool? ?? false,
      joinedAt: DateTime.tryParse(json['joinedAt'] as String? ?? ''),
    );
  }

  final String socketId;
  final String personaId;
  final String displayName;
  final AccountRole accountRole;
  final ParticipantRole participantRole;
  final bool micMuted;
  final bool handRaised;
  final DateTime? joinedAt;

  bool get isModerator => participantRole == ParticipantRole.moderator;
  bool get isSpeaker => participantRole == ParticipantRole.speaker;

  String get initials {
    final parts = displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .toList();
    if (parts.isEmpty) return '?';
    return parts.map((part) => part[0].toUpperCase()).join();
  }
}

