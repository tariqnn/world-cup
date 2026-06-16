import 'package:flutter_test/flutter_test.dart';
import 'package:nashama_admin_app/main.dart';

void main() {
  test('registration parser keeps older single-ticket records usable', () {
    const ticket = TicketLine(
      categoryId: 'vip-class',
      categoryName: 'VIP Class',
      quantity: 2,
      price: 35,
      total: 70,
    );

    expect(ticketLabel(ticket, 'en'), 'VIP Class');
    expect(ticketLabel(ticket, 'ar'), 'فئة VIP');
  });

  test('numeric helpers handle Firestore-style values', () {
    expect(readInt('3'), 3);
    expect(readDouble('65.00'), 65);
    expect(readString(null), '');
  });

  test('jordan ticket lines use 10 JOD even if stored price is stale', () {
    const ticket = TicketLine(
      categoryId: 'event-ticket-jordan-match',
      categoryName: 'Jordan vs Spain Ticket',
      quantity: 2,
      price: 5,
      total: 10,
      game: 'Jordan vs Spain',
      flagA: 'JO',
    );

    expect(ticket.effectiveUnitPrice, 10);
    expect(ticket.effectiveTotal, 20);
  });

  test('phone numbers are cleaned for the dialer', () {
    expect(normalizedDialPhone('+962 7 9000-1111'), '+962790001111');
    expect(normalizedDialPhone('00971 50 123 4567'), '00971501234567');
    expect(normalizedDialPhone(''), '');
  });

  test('qr payload parsing accepts raw payload and ticket link', () {
    const payload = 'NASHAMA|abc_123';
    final link = buildPublicPassUrl(payload);

    expect(extractPassIdFromQr(payload), 'abc_123');
    expect(extractPassIdFromQr(link), 'abc_123');
    expect(extractPassIdFromQr('not-a-ticket'), isNull);
  });

  test('manual qr entry accepts pass ids, raw payloads, and links', () {
    const payload = 'NASHAMA|abc_123';
    final link = buildPublicPassUrl(payload);

    expect(normalizeManualQrInput('abc_123'), payload);
    expect(normalizeManualQrInput(payload), payload);
    expect(normalizeManualQrInput(link), payload);
    expect(normalizeManualQrInput(''), '');
  });

  test('whatsapp phone normalization handles local Jordan numbers', () {
    expect(normalizedWhatsAppPhone('0790001111'), '962790001111');
    expect(normalizedWhatsAppPhone('+962 0790001111'), '962790001111');
    expect(normalizedWhatsAppPhone('+962 +962790001111'), '962790001111');
    expect(normalizedWhatsAppPhone('+971 50 123 4567'), '971501234567');
    expect(normalizedWhatsAppPhone('00962 79 000 1111'), '962790001111');
  });
}
