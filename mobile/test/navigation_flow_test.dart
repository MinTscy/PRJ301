import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucy_mobile/src/app.dart';

void main() {
  testWidgets('moves from login to the mobile shell', (tester) async {
    await tester.pumpWidget(const LucyMobileApp());

    expect(find.text('Chào mừng trở lại'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(2), 'test-pro-token');
    await tester.tap(find.text('Vào LUCY Pro'));
    await tester.pumpAndSettle();

    expect(find.text('Podcast'), findsOneWidget);
    expect(find.textContaining('Xin chào'), findsOneWidget);
    expect(find.text('Tổng quan'), findsOneWidget);
    expect(find.text('Phòng live'), findsOneWidget);
    expect(find.text('Tài liệu'), findsOneWidget);
    expect(find.text('Hồ sơ'), findsOneWidget);
  });
}
