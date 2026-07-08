class Podcast {
  const Podcast({
    required this.id,
    required this.roomCode,
    required this.title,
    required this.creatorDisplayName,
    required this.audioUrl,
    required this.durationSeconds,
    required this.createdAt,
  });

  factory Podcast.fromJson(Map<String, dynamic> json, String baseUrl) {
    final rawAudioUrl = json['audioUrl']?.toString() ?? '';
    final normalizedBase = baseUrl.replaceFirst(RegExp(r'/$'), '');
    return Podcast(
      id: json['id']?.toString() ?? '',
      roomCode: json['roomCode']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Untitled podcast',
      creatorDisplayName: json['creatorDisplayName']?.toString() ?? 'LUCY Creator',
      audioUrl: rawAudioUrl.startsWith('http')
          ? rawAudioUrl
          : '$normalizedBase${rawAudioUrl.startsWith('/') ? '' : '/'}$rawAudioUrl',
      durationSeconds: (json['durationSeconds'] as num?)?.toInt(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  final String id;
  final String roomCode;
  final String title;
  final String creatorDisplayName;
  final String audioUrl;
  final int? durationSeconds;
  final DateTime createdAt;
}
