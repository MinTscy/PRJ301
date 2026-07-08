import 'dart:async';

import 'package:lucy_mobile/src/models/room_state.dart';
import 'package:lucy_mobile/src/models/gift_event.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

enum ConnectionStatus {
  disconnected,
  connecting,
  connected,
  failed,
}

class RealtimeRoomService {
  final _roomStateController = StreamController<RoomState>.broadcast();
  final _statusController =
      StreamController<ConnectionStatus>.broadcast();
  final _errorController = StreamController<String>.broadcast();
  final _giftController = StreamController<GiftEvent>.broadcast();

  io.Socket? _socket;
  String? _roomCode;

  Stream<RoomState> get roomStates => _roomStateController.stream;
  Stream<ConnectionStatus> get statuses => _statusController.stream;
  Stream<String> get errors => _errorController.stream;
  Stream<GiftEvent> get gifts => _giftController.stream;

  Future<void> connect({
    required String baseUrl,
    required String roomCode,
    required String personaId,
    required String displayName,
    required String accessToken,
  }) async {
    disconnect();
    _roomCode = roomCode.trim().toUpperCase();
    _statusController.add(ConnectionStatus.connecting);

    final socket = io.io(
      baseUrl.trim().replaceFirst(RegExp(r'/$'), ''),
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .enableReconnection()
          .build(),
    );
    _socket = socket;

    socket.onConnect((_) {
      _statusController.add(ConnectionStatus.connected);
      socket.emitWithAck(
        'room:join',
        {
          'roomCode': _roomCode,
          'personaId': personaId,
          'displayName': displayName,
          'accessToken': accessToken,
        },
        ack: _handleJoinAck,
      );
    });
    socket.onDisconnect((_) {
      _statusController.add(ConnectionStatus.disconnected);
    });
    socket.onConnectError((error) {
      _statusController.add(ConnectionStatus.failed);
      _errorController.add('Không thể kết nối realtime: $error');
    });
    socket.onError((error) {
      _errorController.add('Lỗi Socket.IO: $error');
    });
    socket.on('room:state', _handleRoomState);
    socket.on('timeline:updated', _handleTimeline);
    socket.on('stage:changed', _handleStageChanged);
    socket.on('gift:received', _handleGift);
    socket.on('realtime:error', (payload) {
      if (payload is Map) {
        _errorController.add(
          payload['message']?.toString() ?? 'Realtime service error',
        );
      }
    });

    socket.connect();
  }

  Future<void> approveSpeaker(ParticipantTarget target) {
    return _moderate('moderation:approve-speaker', target);
  }

  Future<void> moveToAudience(ParticipantTarget target) {
    return _moderate('moderation:move-to-audience', target);
  }

  Future<void> _moderate(String event, ParticipantTarget target) async {
    final socket = _socket;
    final roomCode = _roomCode;
    if (socket == null || !socket.connected || roomCode == null) {
      throw StateError('Dashboard chưa kết nối với phòng.');
    }

    final completer = Completer<void>();
    socket.emitWithAck(
      event,
      {
        'roomCode': roomCode,
        'personaId': target.personaId,
      },
      ack: (payload) {
        if (payload is Map && payload['ok'] == true) {
          final state = payload['state'];
          if (state is Map) {
            _roomStateController.add(
              RoomState.fromJson(Map<String, dynamic>.from(state)),
            );
          }
          completer.complete();
          return;
        }
        final message = payload is Map
            ? payload['error']?.toString()
            : 'Không nhận được phản hồi hợp lệ.';
        completer.completeError(StateError(message ?? 'Moderation failed'));
      },
    );

    return completer.future.timeout(
      const Duration(seconds: 8),
      onTimeout: () => throw TimeoutException('Realtime request timed out.'),
    );
  }

  void _handleJoinAck(dynamic payload) {
    if (payload is Map && payload['ok'] == true) {
      final state = payload['state'];
      if (state is Map) {
        _roomStateController.add(
          RoomState.fromJson(Map<String, dynamic>.from(state)),
        );
      }
      return;
    }

    final message = payload is Map
        ? payload['error']?.toString()
        : 'Không thể tham gia phòng.';
    _statusController.add(ConnectionStatus.failed);
    _errorController.add(message ?? 'Không thể tham gia phòng.');
  }

  void _handleRoomState(dynamic payload) {
    if (payload is! Map) return;
    _roomStateController.add(
      RoomState.fromJson(Map<String, dynamic>.from(payload)),
    );
  }

  void _handleTimeline(dynamic payload) {
    if (payload is! Map) return;
    final current = payload['currentStep'];
    final next = payload['nextStep'];
    final currentState = RoomState.fromJson({
      'roomCode': _roomCode,
      'participants': const [],
      'currentStep': current,
      'nextStep': next,
      'completed': payload['completed'] ?? false,
    });
    _roomStateController.add(currentState);
  }

  void _handleStageChanged(dynamic payload) {
    if (payload is Map && payload['completed'] == true) {
      _errorController.add('Phòng đã hoàn thành toàn bộ chủ đề.');
    }
  }

  void _handleGift(dynamic payload) {
    if (payload is! Map) return;
    _giftController.add(GiftEvent.fromJson(Map<String, dynamic>.from(payload)));
  }

  void disconnect() {
    final socket = _socket;
    if (socket != null) {
      socket
        ..off('room:state')
        ..off('timeline:updated')
        ..off('stage:changed')
        ..off('gift:received')
        ..off('realtime:error')
        ..disconnect()
        ..dispose();
    }
    _socket = null;
    _statusController.add(ConnectionStatus.disconnected);
  }

  Future<void> dispose() async {
    disconnect();
    await Future.wait([
      _roomStateController.close(),
      _statusController.close(),
      _errorController.close(),
      _giftController.close(),
    ]);
  }
}

class ParticipantTarget {
  const ParticipantTarget(this.personaId);

  final String personaId;
}
