import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:lucy_mobile/src/models/podcast.dart';

class PodcastService {
  const PodcastService();

  Future<List<Podcast>> loadPodcasts(String baseUrl) async {
    final normalizedBase = baseUrl.trim().replaceFirst(RegExp(r'/$'), '');
    final response = await http
        .get(Uri.parse('$normalizedBase/api/realtime/podcasts'))
        .timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) {
      throw StateError('Không thể tải Podcast (${response.statusCode}).');
    }
    final payload = jsonDecode(response.body) as List<dynamic>;
    return payload
        .whereType<Map>()
        .map((item) => Podcast.fromJson(Map<String, dynamic>.from(item), normalizedBase))
        .toList(growable: false);
  }
}
