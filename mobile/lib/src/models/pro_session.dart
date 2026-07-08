class ProSession {
  const ProSession({
    required this.displayName,
    required this.email,
    required this.accessToken,
  });

  final String displayName;
  final String email;
  final String accessToken;

  String get initials {
    final parts = displayName.trim().split(RegExp(r'\s+')).take(2);
    return parts.map((part) => part.isEmpty ? '' : part[0].toUpperCase()).join();
  }
}
