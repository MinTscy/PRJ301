import 'dart:async';

import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:lucy_mobile/src/config/app_config.dart';
import 'package:lucy_mobile/src/design_system/lucy_colors.dart';
import 'package:lucy_mobile/src/design_system/lucy_spacing.dart';
import 'package:lucy_mobile/src/models/podcast.dart';
import 'package:lucy_mobile/src/services/podcast_service.dart';
import 'package:lucy_mobile/src/widgets/lucy_empty_state.dart';
import 'package:lucy_mobile/src/widgets/lucy_page_header.dart';

class PodcastScreen extends StatefulWidget {
  const PodcastScreen({super.key});

  @override
  State<PodcastScreen> createState() => _PodcastScreenState();
}

class _PodcastScreenState extends State<PodcastScreen> {
  final _service = const PodcastService();
  final _player = AudioPlayer();
  late Future<List<Podcast>> _podcasts;
  String? _playingId;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _podcasts = _service.loadPodcasts(AppConfig.realtimeBaseUrl);
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle(Podcast podcast) async {
    if (_playingId == podcast.id && _player.playing) {
      await _player.pause();
      if (mounted) setState(() {});
      return;
    }
    if (_playingId != podcast.id) {
      await _player.setUrl(podcast.audioUrl);
      _playingId = podcast.id;
    }
    if (mounted) setState(() {});
    unawaited(_player.play());
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: LucySpacing.xl),
      children: [
        LucyPageHeader(
          eyebrow: 'LUCY Podcast',
          title: 'Nghe lại buổi học',
          description: 'Các bản ghi được LUCY Super xuất bản từ phòng Live.',
          trailing: IconButton.filledTonal(
            onPressed: () => setState(_reload),
            icon: const Icon(Icons.refresh),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: LucySpacing.md),
          child: FutureBuilder<List<Podcast>>(
            future: _podcasts,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return LucyEmptyState(
                  icon: Icons.cloud_off_outlined,
                  title: 'Không tải được Podcast',
                  message: snapshot.error.toString(),
                );
              }
              final podcasts = snapshot.data ?? const [];
              if (podcasts.isEmpty) {
                return const LucyEmptyState(
                  icon: Icons.podcasts_outlined,
                  title: 'Chưa có Podcast',
                  message: 'Bản ghi hoàn tất của LUCY Super sẽ xuất hiện tại đây.',
                );
              }
              return Column(
                children: podcasts
                    .map((podcast) => _PodcastCard(
                          podcast: podcast,
                          playing: _playingId == podcast.id && _player.playing,
                          onPlay: () => _toggle(podcast),
                        ))
                    .toList(growable: false),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _PodcastCard extends StatelessWidget {
  const _PodcastCard({required this.podcast, required this.playing, required this.onPlay});

  final Podcast podcast;
  final bool playing;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    final duration = podcast.durationSeconds == null
        ? 'Chưa rõ thời lượng'
        : '${podcast.durationSeconds! ~/ 60}:${(podcast.durationSeconds! % 60).toString().padLeft(2, '0')}';
    return Card(
      margin: const EdgeInsets.only(bottom: LucySpacing.sm),
      child: ListTile(
        contentPadding: const EdgeInsets.all(LucySpacing.sm),
        leading: IconButton.filled(
          onPressed: onPlay,
          icon: Icon(playing ? Icons.pause : Icons.play_arrow),
        ),
        title: Text(podcast.title, style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text('${podcast.creatorDisplayName} • ${podcast.roomCode} • $duration'),
        trailing: const Icon(Icons.graphic_eq, color: LucyColors.primarySoft),
      ),
    );
  }
}
