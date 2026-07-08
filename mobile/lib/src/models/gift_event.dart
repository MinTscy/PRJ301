class GiftEvent {
  const GiftEvent({
    required this.id,
    required this.roomCode,
    required this.senderDisplayName,
    required this.recipientPersonaId,
    required this.giftName,
    required this.emoji,
    required this.value,
  });

  factory GiftEvent.fromJson(Map<String, dynamic> json) => GiftEvent(
        id: json['id']?.toString() ?? '',
        roomCode: json['roomCode']?.toString() ?? '',
        senderDisplayName: json['senderDisplayName']?.toString() ?? 'LUCY user',
        recipientPersonaId: json['recipientPersonaId']?.toString() ?? '',
        giftName: json['giftName']?.toString() ?? 'Gift',
        emoji: json['emoji']?.toString() ?? '🎁',
        value: (json['value'] as num?)?.toInt() ?? 0,
      );

  final String id;
  final String roomCode;
  final String senderDisplayName;
  final String recipientPersonaId;
  final String giftName;
  final String emoji;
  final int value;
}
