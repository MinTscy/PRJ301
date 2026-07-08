import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucy_mobile/src/models/gift_event.dart';

class GiftCelebrationOverlay {
  const GiftCelebrationOverlay._();

  static void show(BuildContext context, GiftEvent gift) {
    late final OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => _GiftBurst(gift: gift, onFinished: entry.remove),
    );
    Overlay.of(context).insert(entry);
  }
}

class _GiftBurst extends StatefulWidget {
  const _GiftBurst({required this.gift, required this.onFinished});

  final GiftEvent gift;
  final VoidCallback onFinished;

  @override
  State<_GiftBurst> createState() => _GiftBurstState();
}

class _GiftBurstState extends State<_GiftBurst> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 700))..forward();
    _timer = Timer(const Duration(seconds: 3), widget.onFinished);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Material(
        color: Colors.transparent,
        child: Center(
          child: ScaleTransition(
            scale: CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
              decoration: BoxDecoration(
                color: const Color(0xEE211A3B),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFFAD9FFF)),
                boxShadow: const [BoxShadow(color: Color(0x887C5CFC), blurRadius: 36)],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(widget.gift.emoji, style: const TextStyle(fontSize: 72)),
                  const SizedBox(height: 8),
                  Text(
                    '${widget.gift.senderDisplayName} đã tặng ${widget.gift.giftName}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  Text('${widget.gift.value} Lucy Points', style: const TextStyle(color: Color(0xFFAD9FFF))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
