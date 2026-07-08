import 'package:lucy_mobile/src/models/participant.dart';
import 'package:lucy_mobile/src/models/timeline_step.dart';

class RoomState {
  const RoomState({
    required this.roomCode,
    required this.participants,
    required this.currentStep,
    required this.nextStep,
    required this.completed,
  });

  factory RoomState.empty(String roomCode) {
    return RoomState(
      roomCode: roomCode,
      participants: const [],
      currentStep: null,
      nextStep: null,
      completed: false,
    );
  }

  factory RoomState.fromJson(Map<String, dynamic> json) {
    final rawParticipants = json['participants'] as List<dynamic>? ?? const [];

    return RoomState(
      roomCode: json['roomCode'] as String? ?? '',
      participants: rawParticipants
          .whereType<Map>()
          .map((item) => Participant.fromJson(Map<String, dynamic>.from(item)))
          .toList(growable: false),
      currentStep: _stepFromJson(json['currentStep']),
      nextStep: _stepFromJson(json['nextStep']),
      completed: json['completed'] as bool? ?? false,
    );
  }

  final String roomCode;
  final List<Participant> participants;
  final TimelineStep? currentStep;
  final TimelineStep? nextStep;
  final bool completed;

  List<Participant> get learners =>
      participants.where((participant) => !participant.isModerator).toList();

  List<Participant> get raisedHands =>
      learners.where((participant) => participant.handRaised).toList();

  List<Participant> get speakers =>
      learners.where((participant) => participant.isSpeaker).toList();

  List<Participant> get audience =>
      learners.where((participant) => !participant.isSpeaker).toList();

  static TimelineStep? _stepFromJson(Object? value) {
    if (value is! Map) return null;
    return TimelineStep.fromJson(Map<String, dynamic>.from(value));
  }
}

