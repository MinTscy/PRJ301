import 'package:flutter_test/flutter_test.dart';
import 'package:lucy_mobile/src/models/gift_event.dart';
import 'package:lucy_mobile/src/models/podcast.dart';

void main() {
  test('parses realtime gift event', () {
    final gift = GiftEvent.fromJson({
      'id': 'gift-1',
      'roomCode': 'LUCY-ROOM',
      'senderDisplayName': 'Alex',
      'recipientPersonaId': 'mentor-1',
      'giftName': 'Rocket',
      'emoji': '🚀',
      'value': 100,
    });

    expect(gift.emoji, '🚀');
    expect(gift.value, 100);
  });

  test('resolves local podcast audio URL against realtime service', () {
    final podcast = Podcast.fromJson({
      'id': 'episode-1',
      'roomCode': 'LUCY-ROOM',
      'title': 'Lesson recap',
      'creatorDisplayName': 'Creator',
      'audioUrl': '/recordings/episode-1.webm',
      'durationSeconds': 42,
      'createdAt': '2026-07-06T00:00:00Z',
    }, 'http://10.0.2.2:3001');

    expect(podcast.audioUrl, 'http://10.0.2.2:3001/recordings/episode-1.webm');
  });
}
