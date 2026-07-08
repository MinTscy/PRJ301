class TimelineStep {
  const TimelineStep({
    required this.subLevelId,
    required this.subOrder,
    required this.title,
    required this.durationMinutes,
    required this.startMinute,
    required this.endMinute,
    required this.current,
  });

  factory TimelineStep.fromJson(Map<String, dynamic> json) {
    return TimelineStep(
      subLevelId: (json['subLevelId'] as num?)?.toInt() ?? 0,
      subOrder: (json['subOrder'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? 'Untitled topic',
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 10,
      startMinute: (json['startMinute'] as num?)?.toInt() ?? 0,
      endMinute: (json['endMinute'] as num?)?.toInt() ?? 10,
      current: json['current'] as bool? ?? false,
    );
  }

  final int subLevelId;
  final int subOrder;
  final String title;
  final int durationMinutes;
  final int startMinute;
  final int endMinute;
  final bool current;
}

