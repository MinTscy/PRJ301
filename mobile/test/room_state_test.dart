import 'package:flutter_test/flutter_test.dart';
import 'package:lucy_mobile/src/models/participant.dart';
import 'package:lucy_mobile/src/models/room_state.dart';

void main() {
  test('parses participants and derives Pro dashboard groups', () {
    final state = RoomState.fromJson({
      'roomCode': 'LUCY-ROOM',
      'completed': false,
      'participants': [
        {
          'socketId': 'moderator',
          'personaId': 'pro',
          'displayName': 'Mentor',
          'accountRole': 'LUCY_PRO',
          'participantRole': 'moderator',
          'micMuted': false,
          'handRaised': false,
          'joinedAt': '2026-06-18T00:00:00Z',
        },
        {
          'socketId': 'learner-1',
          'personaId': 'learner-1',
          'displayName': 'Alex Kim',
          'accountRole': 'LUCY',
          'participantRole': 'audience',
          'micMuted': true,
          'handRaised': true,
          'joinedAt': '2026-06-18T00:01:00Z',
        },
        {
          'socketId': 'learner-2',
          'personaId': 'learner-2',
          'displayName': 'Li Ming',
          'accountRole': 'LUCY',
          'participantRole': 'speaker',
          'micMuted': false,
          'handRaised': false,
          'joinedAt': '2026-06-18T00:02:00Z',
        },
      ],
    });

    expect(state.learners, hasLength(2));
    expect(state.raisedHands.single.displayName, 'Alex Kim');
    expect(state.speakers.single.displayName, 'Li Ming');
    expect(state.participants.first.accountRole, AccountRole.lucyPro);
  });
}

