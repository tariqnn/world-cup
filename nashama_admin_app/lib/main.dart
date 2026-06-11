import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:csv/csv.dart' as csv_package;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart' as intl;
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

const _maroon = Color(0xFF3A0617);
const _deepMaroon = Color(0xFF21040D);
const _gold = Color(0xFFD8A83E);
const _cream = Color(0xFFFFF7E8);
const _ink = Color(0xFF211814);
const _qrCollection = 'qrPasses';
const _scanRecordsCollection = 'scanRecords';
const _registrationCollection = 'registrations';
const _siteContentCollection = 'siteContent';
const _siteContentDoc = 'main';
const _eventsCollection = 'events';
const _publicPassBaseUrl = 'https://world-cup-ccf88.web.app/pass.html';

const _statusOptions = ['New', 'Confirmed', 'Checked in', 'Cancelled'];

const _categories = <TicketCategory>[
  TicketCategory('vip-class', 'VIP Class', 'فئة VIP'),
  TicketCategory('class-a', 'Class A', 'الفئة A'),
  TicketCategory('class-b', 'Class B', 'الفئة B'),
  TicketCategory('vip-support', 'VIP Support Class', 'فئة دعم VIP'),
  TicketCategory('support-a', 'Support Class A', 'فئة الدعم A'),
  TicketCategory('support-b', 'Support Class B', 'فئة الدعم B'),
  TicketCategory('multiple', 'Multiple categories', 'فئات متعددة'),
];

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ar');
  await Firebase.initializeApp(options: NashamaFirebaseOptions.currentPlatform);
  runApp(const NashamaAdminApp());
}

class NashamaFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBW7JYstDLj1wUtt7L1hY-YiCf5ETuBX-s',
    appId: '1:284948806077:web:d089fe597cb01094143ad4',
    messagingSenderId: '284948806077',
    projectId: 'world-cup-ccf88',
    authDomain: 'world-cup-ccf88.firebaseapp.com',
    storageBucket: 'world-cup-ccf88.firebasestorage.app',
    measurementId: 'G-28ZQ4X4ET2',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyCyKNzRG0PCBBXL4hw0tvzxqCOxKZnlEoM',
    appId: '1:284948806077:android:a6943b8922526242143ad4',
    messagingSenderId: '284948806077',
    projectId: 'world-cup-ccf88',
    storageBucket: 'world-cup-ccf88.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyBIQlEWEcPzqpPIJ_I835LVk6mdqMD4XP4',
    appId: '1:284948806077:ios:dabc5464bf42b8c0143ad4',
    messagingSenderId: '284948806077',
    projectId: 'world-cup-ccf88',
    storageBucket: 'world-cup-ccf88.firebasestorage.app',
    iosBundleId: 'com.nashama.arena.nashamaAdminApp',
  );
}

class NashamaAdminApp extends StatelessWidget {
  const NashamaAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nashama Admin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _gold,
          primary: _maroon,
          secondary: _gold,
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: _cream,
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: _deepMaroon,
          foregroundColor: Colors.white,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: _maroon.withValues(alpha: 0.08)),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: _gold,
            foregroundColor: _deepMaroon,
            minimumSize: const Size(48, 48),
            textStyle: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: _maroon.withValues(alpha: 0.12)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: _maroon.withValues(alpha: 0.12)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: _gold, width: 1.8),
          ),
        ),
      ),
      home: const AdminHomePage(),
    );
  }
}

class AdminHomePage extends StatefulWidget {
  const AdminHomePage({super.key});

  @override
  State<AdminHomePage> createState() => _AdminHomePageState();
}

class _AdminHomePageState extends State<AdminHomePage> {
  final _searchController = TextEditingController();
  String _language = 'en';
  String _category = 'all';
  String _status = 'all';
  int _tabIndex = 0;

  bool get _isArabic => _language == 'ar';

  CollectionReference<Map<String, dynamic>> get _registrations =>
      FirebaseFirestore.instance.collection(_registrationCollection);

  CollectionReference<Map<String, dynamic>> get _passes =>
      FirebaseFirestore.instance.collection(_qrCollection);

  Stream<List<RegistrationRecord>> get _registrationStream => _registrations
      .orderBy('createdAt', descending: true)
      .snapshots()
      .map(
        (snapshot) =>
            snapshot.docs.map(RegistrationRecord.fromFirestore).toList(),
      );

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final direction = _isArabic ? TextDirection.rtl : TextDirection.ltr;

    return Directionality(
      textDirection: direction,
      child: Scaffold(
        appBar: AppBar(
          titleSpacing: 12,
          title: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: Image.asset(
                  'assets/nashama-logo.jpg',
                  width: 36,
                  height: 36,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      tr('title'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      tr('subtitle'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.74),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            Tooltip(
              message: tr('scanQr'),
              child: IconButton(
                onPressed: () => _openScanner(context),
                icon: const Icon(Icons.qr_code_scanner),
              ),
            ),
            Tooltip(
              message: tr('language'),
              child: TextButton(
                onPressed: () => setState(() {
                  _language = _isArabic ? 'en' : 'ar';
                }),
                child: Text(
                  _isArabic ? 'EN' : 'AR',
                  style: const TextStyle(
                    color: _gold,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tabIndex,
          onDestinationSelected: (index) => setState(() => _tabIndex = index),
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.qr_code_scanner),
              label: tr('gateOps'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.tune),
              label: tr('webAdmin'),
            ),
          ],
        ),
        body: _tabIndex == 0 ? _buildGatePage(context) : _buildWebAdminPage(),
      ),
    );
  }

  Widget _buildGatePage(BuildContext context) {
    return StreamBuilder<List<RegistrationRecord>>(
      stream: _registrationStream,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return _MessageState(
            icon: Icons.error_outline,
            title: tr('loadError'),
            body: snapshot.error.toString(),
          );
        }

        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        final all = snapshot.data!;
        final visible = _applyFilters(all);
        final stats = AdminStats.from(all);

        return RefreshIndicator(
          onRefresh: () async {
            setState(() {});
            await Future<void>.delayed(const Duration(milliseconds: 250));
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _ScanActionCard(
                        tr: tr,
                        onOpenScanner: () => _openScanner(context),
                      ),
                      const SizedBox(height: 14),
                      _RecentScansPanel(tr: tr, language: _language),
                      const SizedBox(height: 14),
                      _StatsGrid(stats: stats, tr: tr),
                      const SizedBox(height: 14),
                      _FiltersPanel(
                        tr: tr,
                        language: _language,
                        searchController: _searchController,
                        category: _category,
                        status: _status,
                        onSearchChanged: (_) => setState(() {}),
                        onCategoryChanged: (value) =>
                            setState(() => _category = value ?? 'all'),
                        onStatusChanged: (value) =>
                            setState(() => _status = value ?? 'all'),
                      ),
                      const SizedBox(height: 14),
                      _ActionBar(
                        tr: tr,
                        count: visible.length,
                        onExport: visible.isEmpty
                            ? null
                            : () => _copyCsv(context, visible),
                        onClear: all.isEmpty
                            ? null
                            : () => _confirmClearAll(context, all.length),
                      ),
                    ],
                  ),
                ),
              ),
              if (visible.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _MessageState(
                    icon: Icons.search_off,
                    title: tr('emptyTitle'),
                    body: tr('emptyBody'),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  sliver: SliverList.builder(
                    itemCount: visible.length,
                    itemBuilder: (context, index) {
                      return _AnimatedRegistrationCard(
                        index: index,
                        child: RegistrationCard(
                          registration: visible[index],
                          tr: tr,
                          language: _language,
                          onCall: () => _callCustomer(context, visible[index]),
                          onGenerateQr: () =>
                              _generateAndSendPasses(context, visible[index]),
                          onScanRegistration: () =>
                              _openRegistrationScanner(context, visible[index]),
                          onStatusChanged: (status) =>
                              _updateStatus(context, visible[index], status),
                          onPaidChanged: (paidStatus) => _updatePaidStatus(
                            context,
                            visible[index],
                            paidStatus,
                          ),
                          onDelete: () =>
                              _confirmDelete(context, visible[index]),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildWebAdminPage() {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [_WebsiteDataPanel(tr: tr)],
      ),
    );
  }

  String tr(String key) =>
      _translations[_language]?[key] ?? _translations['en']?[key] ?? key;

  List<RegistrationRecord> _applyFilters(List<RegistrationRecord> items) {
    final query = _searchController.text.trim().toLowerCase();
    return items.where((item) {
      final haystack = [
        item.fullName,
        item.email,
        item.phone,
        item.confirmation,
        item.passCode,
        item.categoryName,
        item.gender,
        ...item.tickets.map((ticket) => ticket.categoryName),
      ].join(' ').toLowerCase();

      final matchesSearch = query.isEmpty || haystack.contains(query);
      final matchesCategory =
          _category == 'all' ||
          item.categoryId == _category ||
          item.tickets.any((ticket) => ticket.categoryId == _category);
      final matchesStatus = _status == 'all' || item.status == _status;
      return matchesSearch && matchesCategory && matchesStatus;
    }).toList();
  }

  Future<void> _openScanner(BuildContext context) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => QrScannerPage(language: _language, tr: tr),
      ),
    );
  }

  Future<void> _openRegistrationScanner(
    BuildContext context,
    RegistrationRecord registration,
  ) async {
    if (registration.tickets.isEmpty || registration.quantity <= 0) {
      _showSnack(context, tr('noTicketsForQr'));
      return;
    }

    try {
      await _ensureQrPasses(registration);
      if (!context.mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => QrScannerPage(
            language: _language,
            tr: tr,
            registration: registration,
          ),
        ),
      );
    } catch (error) {
      if (!context.mounted) return;
      _showSnack(context, '${tr('qrGenerateFailed')}: $error');
    }
  }

  Future<void> _generateAndSendPasses(
    BuildContext context,
    RegistrationRecord registration,
  ) async {
    if (registration.tickets.isEmpty || registration.quantity <= 0) {
      _showSnack(context, tr('noTicketsForQr'));
      return;
    }

    final whatsappPhone = normalizedWhatsAppPhone(registration.phone);
    if (whatsappPhone.isEmpty) {
      _showSnack(context, tr('missingPhone'));
      return;
    }

    try {
      final passes = await _ensureQrPasses(registration);
      if (!context.mounted) return;
      await _showPassesSheet(context, registration, passes);
      if (!context.mounted) return;
      await _shareTicketPdf(context, registration, passes);
    } catch (error) {
      if (!context.mounted) return;
      _showSnack(context, '${tr('qrGenerateFailed')}: $error');
    }
  }

  Future<List<QrPass>> _ensureQrPasses(RegistrationRecord registration) async {
    final plans = buildPassPlans(registration);
    final batch = FirebaseFirestore.instance.batch();
    final now = FieldValue.serverTimestamp();

    for (final plan in plans) {
      final pass = QrPass.fromPlan(registration, plan);
      batch.set(_passes.doc(pass.id), {
        'registrationId': registration.id,
        'confirmation': registration.confirmation,
        'passCode': registration.passCode,
        'fullName': registration.fullName,
        'phone': registration.phone,
        'categoryId': pass.categoryId,
        'categoryName': pass.categoryName,
        'ticketNumber': pass.ticketNumber,
        'ticketTotal': plans.length,
        'status': 'active',
        'qrPayload': pass.qrPayload,
        'publicUrl': pass.publicUrl,
        'generatedAt': now,
        'updatedAt': now,
      }, SetOptions(merge: true));
    }

    batch.set(_registrations.doc(registration.id), {
      'generatedPassCount': plans.length,
      'qrGeneratedAt': now,
      'qrLastGeneratedAt': now,
    }, SetOptions(merge: true));
    await batch.commit();

    final snapshot = await _passes
        .where('registrationId', isEqualTo: registration.id)
        .get();
    final generated =
        snapshot.docs
            .map(QrPass.fromFirestore)
            .where((pass) => plans.any((plan) => plan.passId == pass.id))
            .toList()
          ..sort((a, b) => a.ticketNumber.compareTo(b.ticketNumber));
    return generated;
  }

  Future<void> _showPassesSheet(
    BuildContext context,
    RegistrationRecord registration,
    List<QrPass> passes,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) {
        return SafeArea(
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.72,
            minChildSize: 0.35,
            maxChildSize: 0.92,
            builder: (context, controller) {
              return ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
                children: [
                  Text(
                    tr('qrReady'),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${registration.fullName} - ${passes.length} ${tr('passes')}',
                    style: TextStyle(color: _ink.withValues(alpha: 0.65)),
                  ),
                  const SizedBox(height: 14),
                  ...passes.map(
                    (pass) => Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            QrImageView(
                              data: pass.qrPayload,
                              version: QrVersions.auto,
                              size: 104,
                              backgroundColor: Colors.white,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    pass.categoryName,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${tr('ticket')} ${pass.ticketNumber}/${pass.ticketTotal}',
                                  ),
                                  Text(
                                    pass.id,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: _ink.withValues(alpha: 0.58),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: () => Navigator.pop(sheetContext),
                    icon: const Icon(Icons.check),
                    label: Text(tr('continueToWhatsapp')),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }

  Future<void> _shareTicketPdf(
    BuildContext context,
    RegistrationRecord registration,
    List<QrPass> passes,
  ) async {
    final bytes = await buildTicketPdf(registration, passes);
    final filename = 'nashama-${registration.confirmation}.pdf';
    final params = ShareParams(
      title: 'Nashama Arena Tickets',
      text: buildWhatsAppPdfMessage(registration, passes.length),
      files: [
        XFile.fromData(bytes, mimeType: 'application/pdf', name: filename),
      ],
    );
    final result = await SharePlus.instance.share(params);
    if (!context.mounted) return;
    if (result.status == ShareResultStatus.unavailable) {
      await Printing.sharePdf(bytes: bytes, filename: filename);
    }
  }

  Future<void> _updateStatus(
    BuildContext context,
    RegistrationRecord registration,
    String status,
  ) async {
    try {
      await _registrations.doc(registration.id).update({'status': status});
      if (!context.mounted) return;
      _showSnack(context, tr('statusSaved'));
    } catch (error) {
      if (!context.mounted) return;
      _showSnack(context, '${tr('statusFailed')}: $error');
    }
  }

  Future<void> _updatePaidStatus(
    BuildContext context,
    RegistrationRecord registration,
    String paidStatus,
  ) async {
    try {
      await _registrations.doc(registration.id).update({
        'paidStatus': paidStatus,
        'paid': paidStatus == 'Paid',
        'paymentUpdatedAt': FieldValue.serverTimestamp(),
      });
      if (!context.mounted) return;
      _showSnack(context, tr('paymentSaved'));
    } catch (error) {
      if (!context.mounted) return;
      _showSnack(context, '${tr('paymentFailed')}: $error');
    }
  }

  Future<void> _callCustomer(
    BuildContext context,
    RegistrationRecord registration,
  ) async {
    final phone = normalizedDialPhone(registration.phone);
    if (phone.isEmpty) {
      _showSnack(context, tr('missingPhone'));
      return;
    }

    final uri = Uri(scheme: 'tel', path: phone);
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched && context.mounted) {
        _showSnack(context, tr('callFailed'));
      }
    } catch (error) {
      if (!context.mounted) return;
      _showSnack(context, '${tr('callFailed')}: $error');
    }
  }

  Future<void> _confirmDelete(
    BuildContext context,
    RegistrationRecord registration,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(tr('deleteTitle')),
        content: Text('${tr('deleteBody')} ${registration.confirmation}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(tr('cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(tr('delete')),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _registrations.doc(registration.id).delete();
      if (!context.mounted) return;
      _showSnack(context, tr('deleted'));
    } catch (error) {
      if (!context.mounted) return;
      _showSnack(context, '${tr('deleteFailed')}: $error');
    }
  }

  Future<void> _confirmClearAll(BuildContext context, int count) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(tr('clearTitle')),
        content: Text('${tr('clearBody')} $count'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(tr('cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(tr('clear')),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final snapshot = await _registrations.get();
      final docs = snapshot.docs;
      for (var start = 0; start < docs.length; start += 450) {
        final batch = FirebaseFirestore.instance.batch();
        for (final doc in docs.skip(start).take(450)) {
          batch.delete(doc.reference);
        }
        await batch.commit();
      }
      if (!context.mounted) return;
      _showSnack(context, tr('cleared'));
    } catch (error) {
      if (!context.mounted) return;
      _showSnack(context, '${tr('clearFailed')}: $error');
    }
  }

  Future<void> _copyCsv(
    BuildContext context,
    List<RegistrationRecord> registrations,
  ) async {
    final rows = <List<dynamic>>[
      [
        'confirmation',
        'passCode',
        'fullName',
        'email',
        'phone',
        'gender',
        'categoryName',
        'tickets',
        'quantity',
        'total',
        'status',
        'createdAt',
      ],
      ...registrations.map(
        (item) => [
          item.confirmation,
          item.passCode,
          item.fullName,
          item.email,
          item.phone,
          item.gender,
          item.categoryName,
          item.ticketSummary,
          item.quantity,
          item.total.toStringAsFixed(2),
          item.status,
          item.createdAtIso,
        ],
      ),
    ];

    final csv = csv_package.csv.encode(rows);
    await Clipboard.setData(ClipboardData(text: csv));
    if (!context.mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  tr('exportReady'),
                  style: Theme.of(
                    sheetContext,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Text(tr('exportBody')),
                const SizedBox(height: 14),
                SizedBox(
                  height: 140,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: _cream,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _maroon.withValues(alpha: 0.12),
                      ),
                    ),
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(12),
                      child: SelectableText(
                        csv,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: csv));
                    if (sheetContext.mounted) Navigator.pop(sheetContext);
                    if (context.mounted) _showSnack(context, tr('copied'));
                  },
                  icon: const Icon(Icons.copy),
                  label: Text(tr('copyCsv')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.stats, required this.tr});

  final AdminStats stats;
  final String Function(String key) tr;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 520;
        return GridView.count(
          crossAxisCount: compact ? 2 : 4,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: compact ? 1.45 : 1.75,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          children: [
            _StatCard(
              label: tr('statRegistrations'),
              value: '${stats.registrations}',
              icon: Icons.groups_2,
            ),
            _StatCard(
              label: tr('statTickets'),
              value: '${stats.tickets}',
              icon: Icons.confirmation_number,
            ),
            _StatCard(
              label: tr('statValue'),
              value: '${stats.value.toStringAsFixed(2)} JOD',
              icon: Icons.payments,
            ),
            _StatCard(
              label: tr('statVip'),
              value: '${stats.vipTickets}',
              icon: Icons.workspace_premium,
            ),
          ],
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: _gold, size: 24),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: _ink.withValues(alpha: 0.62),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FiltersPanel extends StatelessWidget {
  const _FiltersPanel({
    required this.tr,
    required this.language,
    required this.searchController,
    required this.category,
    required this.status,
    required this.onSearchChanged,
    required this.onCategoryChanged,
    required this.onStatusChanged,
  });

  final String Function(String key) tr;
  final String language;
  final TextEditingController searchController;
  final String category;
  final String status;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String?> onCategoryChanged;
  final ValueChanged<String?> onStatusChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final stackFilters = constraints.maxWidth < 430;
            final categoryField = DropdownButtonFormField<String>(
              initialValue: category,
              isExpanded: true,
              decoration: InputDecoration(labelText: tr('category')),
              items: [
                DropdownMenuItem(
                  value: 'all',
                  child: Text(
                    tr('allCategories'),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                ...visibleTicketCategories().map(
                  (category) => DropdownMenuItem(
                    value: category.id,
                    child: Text(
                      category.label(language),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
              onChanged: onCategoryChanged,
            );

            final statusField = DropdownButtonFormField<String>(
              initialValue: status,
              isExpanded: true,
              decoration: InputDecoration(labelText: tr('status')),
              items: [
                DropdownMenuItem(
                  value: 'all',
                  child: Text(
                    tr('allStatuses'),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                ..._statusOptions.map(
                  (status) => DropdownMenuItem(
                    value: status,
                    child: Text(
                      statusLabel(status, tr),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
              onChanged: onStatusChanged,
            );

            return Column(
              children: [
                TextField(
                  controller: searchController,
                  onChanged: onSearchChanged,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: tr('searchHint'),
                  ),
                ),
                const SizedBox(height: 10),
                if (stackFilters) ...[
                  categoryField,
                  const SizedBox(height: 10),
                  statusField,
                ] else
                  Row(
                    children: [
                      Expanded(child: categoryField),
                      const SizedBox(width: 10),
                      Expanded(child: statusField),
                    ],
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.tr,
    required this.count,
    required this.onExport,
    required this.onClear,
  });

  final String Function(String key) tr;
  final int count;
  final VoidCallback? onExport;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            '$count ${tr('shown')}',
            style: const TextStyle(fontWeight: FontWeight.w800, color: _ink),
          ),
        ),
        Tooltip(
          message: tr('exportCsv'),
          child: OutlinedButton.icon(
            onPressed: onExport,
            icon: const Icon(Icons.ios_share),
            label: Text(tr('export')),
          ),
        ),
        const SizedBox(width: 8),
        Tooltip(
          message: tr('clearAll'),
          child: IconButton.filledTonal(
            onPressed: onClear,
            icon: const Icon(Icons.delete_sweep),
          ),
        ),
      ],
    );
  }
}

class _AnimatedRegistrationCard extends StatelessWidget {
  const _AnimatedRegistrationCard({required this.index, required this.child});

  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final delay = Duration(milliseconds: 30 * index.clamp(0, 8));
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 260 + delay.inMilliseconds),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 18 * (1 - value)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

class RegistrationCard extends StatelessWidget {
  const RegistrationCard({
    super.key,
    required this.registration,
    required this.tr,
    required this.language,
    required this.onCall,
    required this.onGenerateQr,
    required this.onScanRegistration,
    required this.onStatusChanged,
    required this.onPaidChanged,
    required this.onDelete,
  });

  final RegistrationRecord registration;
  final String Function(String key) tr;
  final String language;
  final VoidCallback onCall;
  final VoidCallback onGenerateQr;
  final VoidCallback onScanRegistration;
  final ValueChanged<String> onStatusChanged;
  final ValueChanged<String> onPaidChanged;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    registration.fullName.isEmpty
                        ? tr('unnamed')
                        : registration.fullName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _StatusPill(status: registration.status, tr: tr),
              ],
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MiniBadge(
                  icon: Icons.qr_code_2,
                  text: registration.confirmation,
                ),
                _MiniBadge(icon: Icons.password, text: registration.passCode),
                _MiniBadge(
                  icon: registration.paidStatus == 'Paid'
                      ? Icons.payments
                      : Icons.money_off,
                  text: registration.paidStatus,
                ),
              ],
            ),
            const SizedBox(height: 12),
            _InfoLine(icon: Icons.email, text: registration.email),
            _InfoLine(icon: Icons.phone, text: registration.phone),
            if (registration.gender.isNotEmpty)
              _InfoLine(
                icon: Icons.person,
                text: genderLabel(registration.gender, tr),
              ),
            if (registration.createdAt != null)
              _InfoLine(
                icon: Icons.event_available,
                text: formatDate(registration.createdAt!, language),
              ),
            const Divider(height: 22),
            Text(
              tr('tickets'),
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            ...registration.tickets.map(
              (ticket) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        ticketLabel(ticket, language),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Text(
                      'x${ticket.quantity}',
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ],
                ),
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${tr('quantity')}: ${registration.quantity}',
                    style: TextStyle(color: _ink.withValues(alpha: 0.68)),
                  ),
                ),
                Text(
                  '${registration.total.toStringAsFixed(2)} JOD',
                  style: const TextStyle(
                    color: _maroon,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: registration.paidStatus,
                    decoration: InputDecoration(labelText: tr('payment')),
                    items: ['Unpaid', 'Paid']
                        .map(
                          (paidStatus) => DropdownMenuItem(
                            value: paidStatus,
                            child: Text(tr('payment.$paidStatus')),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) onPaidChanged(value);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              tr('quickActions'),
              style: TextStyle(
                color: _ink.withValues(alpha: 0.72),
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            LayoutBuilder(
              builder: (context, constraints) {
                final stackActions = constraints.maxWidth < 420;
                final scanButton = FilledButton.icon(
                  onPressed: registration.tickets.isEmpty
                      ? null
                      : onScanRegistration,
                  icon: const Icon(Icons.qr_code_scanner),
                  label: Text(tr('scanGuest'), overflow: TextOverflow.ellipsis),
                );
                final callButton = OutlinedButton.icon(
                  onPressed: registration.phone.isEmpty ? null : onCall,
                  icon: const Icon(Icons.call),
                  label: Text(
                    tr('callCustomer'),
                    overflow: TextOverflow.ellipsis,
                  ),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    foregroundColor: _maroon,
                    side: BorderSide(color: _maroon.withValues(alpha: 0.22)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                );
                final qrButton = OutlinedButton.icon(
                  onPressed: registration.phone.isEmpty ? null : onGenerateQr,
                  icon: const Icon(Icons.qr_code_2),
                  label: Text(
                    tr('generateQrWhatsapp'),
                    overflow: TextOverflow.ellipsis,
                  ),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    foregroundColor: _maroon,
                    side: BorderSide(color: _gold.withValues(alpha: 0.9)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                );

                if (stackActions) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      scanButton,
                      const SizedBox(height: 8),
                      qrButton,
                      const SizedBox(height: 8),
                      callButton,
                    ],
                  );
                }

                return Row(
                  children: [
                    Expanded(child: scanButton),
                    const SizedBox(width: 8),
                    Expanded(child: qrButton),
                    const SizedBox(width: 8),
                    Expanded(child: callButton),
                  ],
                );
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _statusOptions.contains(registration.status)
                        ? registration.status
                        : 'New',
                    decoration: InputDecoration(labelText: tr('status')),
                    items: _statusOptions
                        .map(
                          (status) => DropdownMenuItem(
                            value: status,
                            child: Text(statusLabel(status, tr)),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) onStatusChanged(value);
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Tooltip(
                  message: tr('delete'),
                  child: IconButton.outlined(
                    onPressed: onDelete,
                    icon: const Icon(Icons.delete_outline),
                    color: _maroon,
                  ),
                ),
              ],
            ),
            if (registration.status != 'Checked in') ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => onStatusChanged('Checked in'),
                  icon: const Icon(Icons.how_to_reg),
                  label: Text(tr('markCheckedIn')),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: _gold),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: _ink.withValues(alpha: 0.72)),
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: _gold.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: _maroon),
            const SizedBox(width: 5),
            Text(
              text.isEmpty ? '-' : text,
              style: const TextStyle(
                color: _maroon,
                fontWeight: FontWeight.w900,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status, required this.tr});

  final String status;
  final String Function(String key) tr;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'Confirmed' => const Color(0xFF166534),
      'Checked in' => const Color(0xFF0F766E),
      'Cancelled' => const Color(0xFF991B1B),
      _ => _maroon,
    };

    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(
          statusLabel(status, tr),
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}

class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: _maroon.withValues(alpha: 0.55)),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: _ink,
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              body,
              textAlign: TextAlign.center,
              style: TextStyle(color: _ink.withValues(alpha: 0.62)),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScanActionCard extends StatelessWidget {
  const _ScanActionCard({required this.tr, required this.onOpenScanner});

  final String Function(String key) tr;
  final VoidCallback onOpenScanner;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.qr_code_scanner, color: _maroon, size: 44),
            const SizedBox(height: 10),
            Text(
              tr('scanPageTitle'),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: _ink,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              tr('scanPageBody'),
              textAlign: TextAlign.center,
              style: TextStyle(color: _ink.withValues(alpha: 0.68)),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onOpenScanner,
              icon: const Icon(Icons.qr_code_scanner),
              label: Text(tr('scanQr')),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentScansPanel extends StatelessWidget {
  const _RecentScansPanel({required this.tr, required this.language});

  final String Function(String key) tr;
  final String language;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance
          .collection(_scanRecordsCollection)
          .orderBy('createdAt', descending: true)
          .limit(12)
          .snapshots(),
      builder: (context, snapshot) {
        final docs = snapshot.data?.docs ?? const [];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tr('recentScans'),
                  style: const TextStyle(
                    color: _ink,
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                  ),
                ),
                const SizedBox(height: 8),
                if (docs.isEmpty)
                  Text(
                    tr('noScansYet'),
                    style: TextStyle(color: _ink.withValues(alpha: 0.64)),
                  )
                else
                  ...docs.map((doc) {
                    final data = doc.data();
                    final createdAt = readDate(data['createdAt']);
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        readString(data['result']) == 'success'
                            ? Icons.check_circle
                            : Icons.error_outline,
                        color: readString(data['result']) == 'success'
                            ? const Color(0xFF166534)
                            : _maroon,
                      ),
                      title: Text(
                        readString(data['fullName']).isEmpty
                            ? readString(data['passId'])
                            : readString(data['fullName']),
                      ),
                      subtitle: Text(
                        [
                          readString(data['result']),
                          readString(data['categoryName']),
                          if (createdAt != null)
                            formatDate(createdAt, language),
                        ].where((item) => item.isNotEmpty).join(' - '),
                      ),
                    );
                  }),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _WebsiteDataPanel extends StatefulWidget {
  const _WebsiteDataPanel({required this.tr});

  final String Function(String key) tr;

  @override
  State<_WebsiteDataPanel> createState() => _WebsiteDataPanelState();
}

class _WebsiteDataPanelState extends State<_WebsiteDataPanel> {
  final _heroTitle = TextEditingController();
  final _heroLead = TextEditingController();
  final _ticketPrice = TextEditingController();
  final _experienceTitle = TextEditingController();
  final _photo1 = TextEditingController();
  final _eventTitle = TextEditingController();
  final _eventDate = TextEditingController();
  final _eventGame = TextEditingController();
  final _eventImage = TextEditingController();
  bool _loaded = false;

  String Function(String key) get tr => widget.tr;

  @override
  void dispose() {
    _heroTitle.dispose();
    _heroLead.dispose();
    _ticketPrice.dispose();
    _experienceTitle.dispose();
    _photo1.dispose();
    _eventTitle.dispose();
    _eventDate.dispose();
    _eventGame.dispose();
    _eventImage.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance
          .collection(_siteContentCollection)
          .doc(_siteContentDoc)
          .snapshots(),
      builder: (context, snapshot) {
        if (!_loaded) {
          final data = snapshot.data?.data() ?? const <String, dynamic>{};
          _heroTitle.text = readString(data['heroTitle']).isEmpty
              ? 'Register for Nashama Arena access'
              : readString(data['heroTitle']);
          _heroLead.text = readString(data['heroLead']).isEmpty
              ? 'Big-screen football, food, family areas, and match-night energy at Bikers Village.'
              : readString(data['heroLead']);
          _ticketPrice.text = readDouble(
            data['ticketPrice'],
          ).toStringAsFixed(2);
          if (_ticketPrice.text == '0.00') _ticketPrice.text = '10.00';
          _experienceTitle.text = readString(data['experienceTitle']).isEmpty
              ? 'Big-screen football, seating zones, and family areas'
              : readString(data['experienceTitle']);
          _photo1.text = readString(data['photo1']).isEmpty
              ? 'assets/venue-layout.jpg'
              : readString(data['photo1']);
          _eventImage.text = 'assets/match-night.jpg';
          _loaded = true;
        }
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  tr('websiteData'),
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _heroTitle,
                  decoration: InputDecoration(labelText: tr('heroTitle')),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _heroLead,
                  minLines: 2,
                  maxLines: 4,
                  decoration: InputDecoration(labelText: tr('heroLead')),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _ticketPrice,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: tr('ticketPrice')),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _experienceTitle,
                  decoration: InputDecoration(labelText: tr('experienceTitle')),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _photo1,
                  decoration: InputDecoration(labelText: tr('photoUrl')),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _saveContent,
                  icon: const Icon(Icons.save),
                  label: Text(tr('saveWebsite')),
                ),
                const Divider(height: 28),
                TextField(
                  controller: _eventTitle,
                  decoration: InputDecoration(labelText: tr('eventTitle')),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _eventDate,
                  decoration: InputDecoration(labelText: tr('eventDateHint')),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _eventGame,
                  decoration: InputDecoration(labelText: tr('eventGame')),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _eventImage,
                  decoration: InputDecoration(labelText: tr('eventImage')),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: _saveEvent,
                  icon: const Icon(Icons.event),
                  label: Text(tr('saveEvent')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _saveContent() async {
    await FirebaseFirestore.instance
        .collection(_siteContentCollection)
        .doc(_siteContentDoc)
        .set({
          'heroTitle': _heroTitle.text.trim(),
          'heroLead': _heroLead.text.trim(),
          'ticketPrice': readDouble(_ticketPrice.text),
          'experienceTitle': _experienceTitle.text.trim(),
          'photo1': _photo1.text.trim(),
        }, SetOptions(merge: true));
    if (mounted) _showPanelSnack(tr('saved'));
  }

  Future<void> _saveEvent() async {
    final date = _eventDate.text.trim();
    final game = _eventGame.text.trim();
    if (date.isEmpty || game.isEmpty) {
      _showPanelSnack(tr('eventRequired'));
      return;
    }
    final id =
        '$date-${game.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')}';
    await FirebaseFirestore.instance.collection(_eventsCollection).doc(id).set({
      'id': id,
      'title': _eventTitle.text.trim(),
      'date': date,
      'game': game,
      'image': _eventImage.text.trim().isEmpty
          ? 'assets/match-night.jpg'
          : _eventImage.text.trim(),
      'price': readDouble(_ticketPrice.text),
      'active': true,
    }, SetOptions(merge: true));
    if (mounted) _showPanelSnack(tr('saved'));
  }

  void _showPanelSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }
}

class QrScannerPage extends StatefulWidget {
  const QrScannerPage({
    super.key,
    required this.language,
    required this.tr,
    this.registration,
  });

  final String language;
  final String Function(String key) tr;
  final RegistrationRecord? registration;

  @override
  State<QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends State<QrScannerPage> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  final _manualController = TextEditingController();
  bool _busy = false;
  ScanResult? _result;

  String Function(String key) get tr => widget.tr;

  @override
  void dispose() {
    _manualController.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final direction = widget.language == 'ar'
        ? TextDirection.rtl
        : TextDirection.ltr;
    final registration = widget.registration;
    return Directionality(
      textDirection: direction,
      child: Scaffold(
        appBar: AppBar(
          title: Text(registration == null ? tr('scanQr') : tr('scanGuest')),
          actions: [
            Tooltip(
              message: tr('manualEntry'),
              child: IconButton(
                onPressed: _busy ? null : _openManualEntry,
                icon: const Icon(Icons.keyboard_alt_outlined),
              ),
            ),
            Tooltip(
              message: tr('resetScanner'),
              child: IconButton(
                onPressed: _reset,
                icon: const Icon(Icons.refresh),
              ),
            ),
          ],
        ),
        body: Stack(
          children: [
            MobileScanner(controller: _controller, onDetect: _handleDetect),
            if (registration != null)
              Positioned(
                top: 14,
                left: 14,
                right: 14,
                child: _GuestScanProgress(registration: registration, tr: tr),
              ),
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: _gold.withValues(alpha: 0.85),
                      width: 18,
                    ),
                  ),
                ),
              ),
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _ScanResultPanel(
                    result: _result,
                    busy: _busy,
                    tr: tr,
                    language: widget.language,
                    onReset: _reset,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openManualEntry() async {
    _manualController.clear();
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (sheetContext) {
        final bottomInset = MediaQuery.viewInsetsOf(sheetContext).bottom;
        return SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 4, 16, bottomInset + 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  tr('manualEntryTitle'),
                  style: Theme.of(sheetContext).textTheme.titleLarge?.copyWith(
                    color: _ink,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _manualController,
                  autofocus: true,
                  minLines: 1,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: tr('manualEntry'),
                    hintText: tr('manualEntryHint'),
                    prefixIcon: const Icon(Icons.confirmation_number_outlined),
                  ),
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) {
                    Navigator.of(sheetContext).pop();
                    _submitManualEntry();
                  },
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.of(sheetContext).pop();
                    _submitManualEntry();
                  },
                  icon: const Icon(Icons.check),
                  label: Text(tr('submit')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _submitManualEntry() async {
    if (_busy) return;
    final raw = normalizeManualQrInput(_manualController.text);
    if (raw.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(tr('emptyManualCode')),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    setState(() {
      _busy = true;
      _result = ScanResult.processing(rawPayload: raw);
    });

    final result = await checkInQrPayload(
      raw,
      expectedRegistrationId: widget.registration?.id,
    );
    if (!mounted) return;
    setState(() {
      _result = result;
      _busy = false;
    });
  }

  Future<void> _handleDetect(BarcodeCapture capture) async {
    if (_busy) return;
    final raw = capture.barcodes
        .map((barcode) => barcode.rawValue)
        .whereType<String>()
        .firstWhere((value) => value.trim().isNotEmpty, orElse: () => '');
    if (raw.isEmpty) return;

    setState(() {
      _busy = true;
      _result = ScanResult.processing(rawPayload: raw);
    });

    final result = await checkInQrPayload(
      raw,
      expectedRegistrationId: widget.registration?.id,
    );
    if (!mounted) return;
    setState(() {
      _result = result;
      _busy = false;
    });
  }

  void _reset() {
    setState(() {
      _busy = false;
      _result = null;
    });
  }
}

class _ScanResultPanel extends StatelessWidget {
  const _ScanResultPanel({
    required this.result,
    required this.busy,
    required this.tr,
    required this.language,
    required this.onReset,
  });

  final ScanResult? result;
  final bool busy;
  final String Function(String key) tr;
  final String language;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final result = this.result;
    final color = switch (result?.type) {
      ScanResultType.success => const Color(0xFF166534),
      ScanResultType.alreadyScanned => const Color(0xFF92400E),
      ScanResultType.processing => _maroon,
      ScanResultType.invalid ||
      ScanResultType.error ||
      null => const Color(0xFF991B1B),
    };

    return Card(
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(
                  result == null
                      ? Icons.qr_code_scanner
                      : result.type == ScanResultType.success
                      ? Icons.check_circle
                      : result.type == ScanResultType.alreadyScanned
                      ? Icons.history
                      : Icons.error,
                  color: color,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _title(result),
                    style: TextStyle(
                      color: color,
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _body(result),
              style: TextStyle(color: _ink.withValues(alpha: 0.72)),
            ),
            if (result?.categoryName.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              Text(
                '${result!.categoryName} - ${result.fullName}',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ],
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: busy ? null : onReset,
              icon: const Icon(Icons.qr_code_scanner),
              label: Text(tr('scanAnother')),
            ),
          ],
        ),
      ),
    );
  }

  String _title(ScanResult? result) {
    if (result == null) return tr('scannerReady');
    return switch (result.type) {
      ScanResultType.success => tr('scanSuccess'),
      ScanResultType.alreadyScanned => tr('alreadyScanned'),
      ScanResultType.processing => tr('scanProcessing'),
      ScanResultType.invalid => tr('invalidQr'),
      ScanResultType.error => tr('scanError'),
    };
  }

  String _body(ScanResult? result) {
    if (result == null) return tr('scannerBody');
    if (result.type == ScanResultType.alreadyScanned &&
        result.scannedAt != null) {
      return '${tr('alreadyScannedBody')} ${formatDate(result.scannedAt!, language)}';
    }
    return result.message;
  }
}

class _GuestScanProgress extends StatelessWidget {
  const _GuestScanProgress({required this.registration, required this.tr});

  final RegistrationRecord registration;
  final String Function(String key) tr;

  @override
  Widget build(BuildContext context) {
    final expected = buildPassPlans(registration).length;
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance
          .collection(_qrCollection)
          .where('registrationId', isEqualTo: registration.id)
          .snapshots(),
      builder: (context, snapshot) {
        final docs = snapshot.data?.docs ?? const [];
        final scanned = docs
            .where((doc) => readDate(doc.data()['scannedAt']) != null)
            .length;
        final total = docs.isEmpty ? expected : docs.length;
        final done = total > 0 && scanned >= total;
        return DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Icon(
                      done ? Icons.verified : Icons.person_search,
                      color: done ? const Color(0xFF166534) : _maroon,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        registration.fullName.isEmpty
                            ? tr('unnamed')
                            : registration.fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ),
                    Text(
                      '$scanned/$total',
                      style: const TextStyle(
                        color: _maroon,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: total == 0 ? 0 : scanned / total,
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(99),
                  color: done ? const Color(0xFF166534) : _gold,
                  backgroundColor: _cream,
                ),
                const SizedBox(height: 6),
                Text(
                  done ? tr('allTicketsScanned') : tr('scanGuestBody'),
                  style: TextStyle(
                    color: _ink.withValues(alpha: 0.68),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class RegistrationRecord {
  const RegistrationRecord({
    required this.id,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.gender,
    required this.confirmation,
    required this.passCode,
    required this.categoryId,
    required this.categoryName,
    required this.quantity,
    required this.total,
    required this.paidStatus,
    required this.status,
    required this.createdAt,
    required this.tickets,
  });

  factory RegistrationRecord.fromFirestore(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data();
    final rawTickets = data['tickets'];
    final tickets = rawTickets is List
        ? rawTickets
              .whereType<Map>()
              .map(
                (ticket) => TicketLine.fromMap(ticket.cast<String, dynamic>()),
              )
              .where((ticket) => ticket.quantity > 0)
              .toList()
        : <TicketLine>[];

    final fallbackTicket = TicketLine(
      categoryId: readString(data['categoryId']),
      categoryName: readString(data['categoryName']),
      quantity: readInt(data['quantity']),
      price: readDouble(data['price']),
      total: readDouble(data['total']),
    );

    return RegistrationRecord(
      id: doc.id,
      fullName: readString(data['fullName']),
      email: readString(data['email']),
      phone: readString(data['phone']),
      gender: readString(data['gender']),
      confirmation: readString(data['confirmation']),
      passCode: readString(data['passCode']),
      categoryId: readString(data['categoryId']),
      categoryName: readString(data['categoryName']),
      quantity: readInt(data['totalQuantity']) > 0
          ? readInt(data['totalQuantity'])
          : readInt(data['quantity']),
      total: readDouble(data['total']),
      paidStatus: normalizePaidStatus(data),
      status: readString(data['status']).isEmpty
          ? 'New'
          : readString(data['status']),
      createdAt: readDate(data['createdAt']),
      tickets: tickets.isNotEmpty ? tickets : [fallbackTicket],
    );
  }

  final String id;
  final String fullName;
  final String email;
  final String phone;
  final String gender;
  final String confirmation;
  final String passCode;
  final String categoryId;
  final String categoryName;
  final int quantity;
  final double total;
  final String paidStatus;
  final String status;
  final DateTime? createdAt;
  final List<TicketLine> tickets;

  String get createdAtIso => createdAt?.toIso8601String() ?? '';

  String get ticketSummary => tickets
      .map((ticket) => '${ticket.categoryName} x${ticket.quantity}')
      .join('; ');
}

class TicketLine {
  const TicketLine({
    required this.categoryId,
    required this.categoryName,
    required this.quantity,
    required this.price,
    required this.total,
  });

  factory TicketLine.fromMap(Map<String, dynamic> data) {
    return TicketLine(
      categoryId: readString(data['categoryId']),
      categoryName: readString(data['categoryName']),
      quantity: readInt(data['quantity']),
      price: readDouble(data['price']),
      total: readDouble(data['total']),
    );
  }

  final String categoryId;
  final String categoryName;
  final int quantity;
  final double price;
  final double total;
}

class TicketCategory {
  const TicketCategory(this.id, this.en, this.ar);

  final String id;
  final String en;
  final String ar;

  String label(String language) => language == 'ar' ? ar : en;
}

class PassPlan {
  const PassPlan({
    required this.passId,
    required this.categoryId,
    required this.categoryName,
    required this.ticketNumber,
    required this.ticketTotal,
  });

  final String passId;
  final String categoryId;
  final String categoryName;
  final int ticketNumber;
  final int ticketTotal;
}

class QrPass {
  const QrPass({
    required this.id,
    required this.registrationId,
    required this.confirmation,
    required this.fullName,
    required this.phone,
    required this.categoryId,
    required this.categoryName,
    required this.ticketNumber,
    required this.ticketTotal,
    required this.status,
    required this.scannedAt,
  });

  factory QrPass.fromPlan(RegistrationRecord registration, PassPlan plan) {
    return QrPass(
      id: plan.passId,
      registrationId: registration.id,
      confirmation: registration.confirmation,
      fullName: registration.fullName,
      phone: registration.phone,
      categoryId: plan.categoryId,
      categoryName: plan.categoryName,
      ticketNumber: plan.ticketNumber,
      ticketTotal: plan.ticketTotal,
      status: 'active',
      scannedAt: null,
    );
  }

  factory QrPass.fromFirestore(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data();
    return QrPass(
      id: doc.id,
      registrationId: readString(data['registrationId']),
      confirmation: readString(data['confirmation']),
      fullName: readString(data['fullName']),
      phone: readString(data['phone']),
      categoryId: readString(data['categoryId']),
      categoryName: readString(data['categoryName']),
      ticketNumber: readInt(data['ticketNumber']),
      ticketTotal: readInt(data['ticketTotal']),
      status: readString(data['status']).isEmpty
          ? 'active'
          : readString(data['status']),
      scannedAt: readDate(data['scannedAt']),
    );
  }

  final String id;
  final String registrationId;
  final String confirmation;
  final String fullName;
  final String phone;
  final String categoryId;
  final String categoryName;
  final int ticketNumber;
  final int ticketTotal;
  final String status;
  final DateTime? scannedAt;

  String get qrPayload => buildQrPayload(id);

  String get publicUrl => buildPublicPassUrl(qrPayload);
}

enum ScanResultType { processing, success, alreadyScanned, invalid, error }

class ScanResult {
  const ScanResult({
    required this.type,
    required this.message,
    required this.rawPayload,
    this.passId = '',
    this.registrationId = '',
    this.fullName = '',
    this.categoryName = '',
    this.scannedAt,
  });

  factory ScanResult.processing({required String rawPayload}) {
    return ScanResult(
      type: ScanResultType.processing,
      message: 'Processing QR...',
      rawPayload: rawPayload,
    );
  }

  final ScanResultType type;
  final String message;
  final String rawPayload;
  final String passId;
  final String registrationId;
  final String fullName;
  final String categoryName;
  final DateTime? scannedAt;
}

class AdminStats {
  const AdminStats({
    required this.registrations,
    required this.tickets,
    required this.value,
    required this.vipTickets,
  });

  factory AdminStats.from(List<RegistrationRecord> items) {
    return AdminStats(
      registrations: items.length,
      tickets: items.fold(0, (total, item) => total + item.quantity),
      value: items.fold(0, (total, item) => total + item.total),
      vipTickets: items.fold(
        0,
        (total, item) =>
            total +
            item.tickets.fold(
              0,
              (ticketSum, ticket) => ticket.categoryId.contains('vip')
                  ? ticketSum + ticket.quantity
                  : ticketSum,
            ),
      ),
    );
  }

  final int registrations;
  final int tickets;
  final double value;
  final int vipTickets;
}

String readString(Object? value) => value?.toString().trim() ?? '';

int readInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double readDouble(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

String normalizePaidStatus(Map<String, dynamic> data) {
  final paidStatus = readString(data['paidStatus']);
  if (paidStatus == 'Paid' || paidStatus == 'Unpaid') return paidStatus;
  if (data['paid'] == true) return 'Paid';
  return 'Unpaid';
}

DateTime? readDate(Object? value) {
  if (value is Timestamp) return value.toDate();
  if (value is DateTime) return value;
  return DateTime.tryParse(value?.toString() ?? '');
}

String ticketLabel(TicketLine ticket, String language) {
  if (ticket.categoryId == 'general-ticket') {
    return language == 'ar' ? 'تذكرة نشامى أرينا' : 'Nashama Arena Ticket';
  }
  final category = _categories.where((item) => item.id == ticket.categoryId);
  if (category.isNotEmpty) return category.first.label(language);
  return ticket.categoryName;
}

List<TicketCategory> visibleTicketCategories() {
  return const [
    TicketCategory(
      'general-ticket',
      'Nashama Arena Ticket',
      'تذكرة نشامى أرينا',
    ),
  ];
}

String genderLabel(String gender, String Function(String key) tr) {
  final normalized = gender.toLowerCase();
  if (normalized == 'male') return tr('male');
  if (normalized == 'female') return tr('female');
  return gender;
}

String statusLabel(String status, String Function(String key) tr) {
  return tr('status.$status');
}

String formatDate(DateTime date, String language) {
  final locale = language == 'ar' ? 'ar' : 'en';
  return intl.DateFormat('MMM d, yyyy - h:mm a', locale).format(date.toLocal());
}

String normalizedDialPhone(String phone) {
  final trimmed = phone.trim();
  if (trimmed.isEmpty) return '';
  final buffer = StringBuffer();
  for (var index = 0; index < trimmed.length; index += 1) {
    final char = trimmed[index];
    if (index == 0 && char == '+') {
      buffer.write(char);
    } else if ('0123456789'.contains(char)) {
      buffer.write(char);
    }
  }
  return buffer.toString();
}

String normalizedWhatsAppPhone(String phone) {
  final dial = normalizedDialPhone(phone);
  if (dial.isEmpty) return '';
  var normalized = dial;
  if (normalized.startsWith('+')) normalized = normalized.substring(1);
  if (normalized.startsWith('00')) normalized = normalized.substring(2);
  if (normalized.startsWith('9620')) {
    normalized = '962${normalized.substring(4)}';
  }
  if (normalized.startsWith('962962')) {
    normalized = normalized.substring(3);
  }
  if (normalized.startsWith('0') && normalized.length >= 9) {
    return '962${normalized.substring(1)}';
  }
  return normalized;
}

String buildQrPayload(String passId) => 'NASHAMA|$passId';

String buildPublicPassUrl(String qrPayload) {
  return Uri.parse(
    _publicPassBaseUrl,
  ).replace(queryParameters: {'p': qrPayload}).toString();
}

String normalizeManualQrInput(String value) {
  final raw = value.trim();
  if (raw.isEmpty) return '';
  final passId = extractPassIdFromQr(raw);
  if (passId != null) return buildQrPayload(passId);
  final uri = Uri.tryParse(raw);
  if ((uri?.hasScheme ?? false) || raw.contains('|')) return raw;
  return buildQrPayload(raw);
}

String? extractPassIdFromQr(String rawPayload) {
  final raw = rawPayload.trim();
  if (raw.isEmpty) return null;
  final uri = Uri.tryParse(raw);
  final nested = uri?.queryParameters['p'];
  if (nested != null && nested.trim().isNotEmpty && nested != raw) {
    return extractPassIdFromQr(nested);
  }
  if (raw.startsWith('NASHAMA|')) {
    final parts = raw.split('|');
    if (parts.length == 2 && parts[1].trim().isNotEmpty) {
      return parts[1].trim();
    }
  }
  return null;
}

List<PassPlan> buildPassPlans(RegistrationRecord registration) {
  final plans = <PassPlan>[];
  final ticketTotal = registration.tickets.fold(
    0,
    (total, ticket) => total + ticket.quantity,
  );
  var ticketNumber = 1;

  for (final ticket in registration.tickets) {
    for (var count = 0; count < ticket.quantity; count += 1) {
      final categoryId = ticket.categoryId.isEmpty
          ? registration.categoryId
          : ticket.categoryId;
      final safeCategory = categoryId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
      final passId =
          '${registration.id}_${safeCategory}_${ticketNumber.toString().padLeft(3, '0')}';
      plans.add(
        PassPlan(
          passId: passId,
          categoryId: categoryId,
          categoryName: ticket.categoryName.isEmpty
              ? registration.categoryName
              : ticket.categoryName,
          ticketNumber: ticketNumber,
          ticketTotal: ticketTotal,
        ),
      );
      ticketNumber += 1;
    }
  }

  return plans;
}

String buildWhatsAppPassMessage(
  RegistrationRecord registration,
  List<QrPass> passes,
) {
  final buffer = StringBuffer()
    ..writeln('Nashama Arena registration: ${registration.confirmation}')
    ..writeln('Name: ${registration.fullName}')
    ..writeln()
    ..writeln(
      'Your QR tickets are ready. Open each link and show the QR at the entrance.',
    )
    ..writeln('Each QR can be scanned one time only.')
    ..writeln();

  for (final pass in passes) {
    buffer
      ..writeln(
        '${pass.ticketNumber}. ${pass.categoryName} (${pass.ticketNumber}/${pass.ticketTotal})',
      )
      ..writeln(pass.publicUrl);
  }

  return buffer.toString().trim();
}

String buildWhatsAppPdfMessage(RegistrationRecord registration, int passCount) {
  return [
    'Nashama Arena registration: ${registration.confirmation}',
    'Name: ${registration.fullName}',
    'Tickets: $passCount',
    '',
    'Your PDF tickets are attached. Each QR can be scanned one time only at the entrance.',
  ].join('\n');
}

Future<Uint8List> buildTicketPdf(
  RegistrationRecord registration,
  List<QrPass> passes,
) async {
  final document = pw.Document();
  final logoBytes = await rootBundle.load('assets/nashama-logo.jpg');
  final logo = pw.MemoryImage(logoBytes.buffer.asUint8List());
  final maroon = PdfColor.fromInt(0xFF3A0617);
  final deepMaroon = PdfColor.fromInt(0xFF21040D);
  final gold = PdfColor.fromInt(0xFFD8A83E);
  final cream = PdfColor.fromInt(0xFFFFF7E8);

  for (final pass in passes) {
    document.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(28),
        build: (context) {
          return pw.Container(
            decoration: pw.BoxDecoration(
              color: cream,
              borderRadius: pw.BorderRadius.circular(18),
              border: pw.Border.all(color: gold, width: 2),
            ),
            padding: const pw.EdgeInsets.all(24),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                pw.Container(
                  padding: const pw.EdgeInsets.all(16),
                  decoration: pw.BoxDecoration(
                    color: deepMaroon,
                    borderRadius: pw.BorderRadius.circular(14),
                  ),
                  child: pw.Row(
                    children: [
                      pw.ClipRRect(
                        horizontalRadius: 10,
                        verticalRadius: 10,
                        child: pw.Image(
                          logo,
                          width: 72,
                          height: 72,
                          fit: pw.BoxFit.cover,
                        ),
                      ),
                      pw.SizedBox(width: 16),
                      pw.Expanded(
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              'NASHAMA ARENA',
                              style: pw.TextStyle(
                                color: gold,
                                fontSize: 24,
                                fontWeight: pw.FontWeight.bold,
                              ),
                            ),
                            pw.SizedBox(height: 4),
                            pw.Text(
                              'World Cup Match Night Ticket',
                              style: const pw.TextStyle(
                                color: PdfColors.white,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                pw.SizedBox(height: 22),
                pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Expanded(
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          _pdfLabelValue(
                            'Guest',
                            registration.fullName,
                            maroon,
                          ),
                          _pdfLabelValue('Category', pass.categoryName, maroon),
                          _pdfLabelValue(
                            'Confirmation',
                            registration.confirmation,
                            maroon,
                          ),
                          _pdfLabelValue(
                            'Pass code',
                            registration.passCode,
                            maroon,
                          ),
                          _pdfLabelValue(
                            'Ticket',
                            '${pass.ticketNumber} of ${pass.ticketTotal}',
                            maroon,
                          ),
                          _pdfLabelValue(
                            'Payment',
                            registration.paidStatus,
                            maroon,
                          ),
                        ],
                      ),
                    ),
                    pw.SizedBox(width: 20),
                    pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.white,
                        borderRadius: pw.BorderRadius.circular(14),
                        border: pw.Border.all(color: gold, width: 2),
                      ),
                      child: pw.BarcodeWidget(
                        barcode: pw.Barcode.qrCode(),
                        data: pass.qrPayload,
                        width: 190,
                        height: 190,
                      ),
                    ),
                  ],
                ),
                pw.Spacer(),
                pw.Container(
                  padding: const pw.EdgeInsets.all(14),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.white,
                    borderRadius: pw.BorderRadius.circular(12),
                    border: pw.Border.all(color: PdfColor.fromInt(0xFFE2D7C5)),
                  ),
                  child: pw.Text(
                    'Show this PDF at the entrance. This QR is valid for one scan only. Duplicate scans will show the previous scan time.',
                    textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(
                      color: maroon,
                      fontSize: 12,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  return document.save();
}

pw.Widget _pdfLabelValue(String label, String value, PdfColor color) {
  return pw.Padding(
    padding: const pw.EdgeInsets.only(bottom: 14),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          label.toUpperCase(),
          style: pw.TextStyle(
            color: PdfColor.fromInt(0xFFA16207),
            fontSize: 9,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
        pw.SizedBox(height: 3),
        pw.Text(
          value.isEmpty ? '-' : value,
          style: pw.TextStyle(
            color: color,
            fontSize: 18,
            fontWeight: pw.FontWeight.bold,
          ),
        ),
      ],
    ),
  );
}

Future<ScanResult> checkInQrPayload(
  String rawPayload, {
  String? expectedRegistrationId,
}) async {
  final passId = extractPassIdFromQr(rawPayload);
  if (passId == null) {
    final result = ScanResult(
      type: ScanResultType.invalid,
      message: 'This is not a Nashama ticket QR.',
      rawPayload: rawPayload,
    );
    await recordScanAttempt(
      result,
      expectedRegistrationId: expectedRegistrationId,
    );
    return result;
  }

  final firestore = FirebaseFirestore.instance;
  final passRef = firestore.collection(_qrCollection).doc(passId);

  try {
    final result = await firestore.runTransaction((transaction) async {
      final passSnapshot = await transaction.get(passRef);
      if (!passSnapshot.exists) {
        return ScanResult(
          type: ScanResultType.invalid,
          message: 'Ticket was not found. It may not have been generated.',
          rawPayload: rawPayload,
          passId: passId,
        );
      }

      final passData = passSnapshot.data() ?? <String, dynamic>{};
      final registrationId = readString(passData['registrationId']);
      if (expectedRegistrationId != null &&
          expectedRegistrationId != registrationId) {
        return ScanResult(
          type: ScanResultType.invalid,
          message: 'This QR belongs to another registered person.',
          rawPayload: rawPayload,
          passId: passId,
          registrationId: registrationId,
          fullName: readString(passData['fullName']),
          categoryName: readString(passData['categoryName']),
        );
      }

      final registrationRef = firestore
          .collection(_registrationCollection)
          .doc(registrationId);
      final registrationSnapshot = await transaction.get(registrationRef);

      if (!registrationSnapshot.exists) {
        return ScanResult(
          type: ScanResultType.invalid,
          message: 'Registration linked to this ticket was not found.',
          rawPayload: rawPayload,
          passId: passId,
          registrationId: registrationId,
          fullName: readString(passData['fullName']),
          categoryName: readString(passData['categoryName']),
        );
      }

      final registrationData =
          registrationSnapshot.data() ?? <String, dynamic>{};
      final registrationStatus = readString(registrationData['status']);
      final passStatus = readString(passData['status']);
      final scannedAt = readDate(passData['scannedAt']);

      if (registrationStatus == 'Cancelled') {
        return ScanResult(
          type: ScanResultType.invalid,
          message: 'This registration is cancelled.',
          rawPayload: rawPayload,
          passId: passId,
          registrationId: registrationId,
          fullName: readString(passData['fullName']),
          categoryName: readString(passData['categoryName']),
        );
      }

      if (passStatus.isNotEmpty && passStatus != 'active') {
        return ScanResult(
          type: ScanResultType.invalid,
          message: 'This ticket is not active.',
          rawPayload: rawPayload,
          passId: passId,
          registrationId: registrationId,
          fullName: readString(passData['fullName']),
          categoryName: readString(passData['categoryName']),
        );
      }

      if (scannedAt != null) {
        return ScanResult(
          type: ScanResultType.alreadyScanned,
          message: 'This ticket was already scanned.',
          rawPayload: rawPayload,
          passId: passId,
          registrationId: registrationId,
          fullName: readString(passData['fullName']),
          categoryName: readString(passData['categoryName']),
          scannedAt: scannedAt,
        );
      }

      final checkedInTickets = readInt(registrationData['checkedInTickets']);
      final generatedPassCount = readInt(
        registrationData['generatedPassCount'],
      );
      final newCheckedInTickets = checkedInTickets + 1;
      final registrationUpdates = <String, dynamic>{
        'checkedInTickets': newCheckedInTickets,
        'lastScannedAt': FieldValue.serverTimestamp(),
      };
      if (generatedPassCount > 0 && newCheckedInTickets >= generatedPassCount) {
        registrationUpdates['status'] = 'Checked in';
      }

      transaction.update(passRef, {
        'scannedAt': FieldValue.serverTimestamp(),
        'scannedBy': 'mobile-admin',
        'scanStatus': 'scanned',
        'updatedAt': FieldValue.serverTimestamp(),
      });
      transaction.update(registrationRef, registrationUpdates);

      return ScanResult(
        type: ScanResultType.success,
        message: 'Ticket accepted. Entry recorded now.',
        rawPayload: rawPayload,
        passId: passId,
        registrationId: registrationId,
        fullName: readString(passData['fullName']),
        categoryName: readString(passData['categoryName']),
        scannedAt: DateTime.now(),
      );
    });
    await recordScanAttempt(
      result,
      expectedRegistrationId: expectedRegistrationId,
    );
    return result;
  } catch (error) {
    final result = ScanResult(
      type: ScanResultType.error,
      message: error.toString(),
      rawPayload: rawPayload,
      passId: passId,
    );
    await recordScanAttempt(
      result,
      expectedRegistrationId: expectedRegistrationId,
    );
    return result;
  }
}

Future<void> recordScanAttempt(
  ScanResult result, {
  String? expectedRegistrationId,
}) async {
  try {
    await FirebaseFirestore.instance.collection(_scanRecordsCollection).add({
      'result': result.type.name,
      'message': result.message,
      'rawPayload': result.rawPayload,
      'passId': result.passId,
      'registrationId': result.registrationId,
      'expectedRegistrationId': expectedRegistrationId ?? '',
      'fullName': result.fullName,
      'categoryName': result.categoryName,
      'previousScannedAt': result.scannedAt?.toIso8601String(),
      'scanner': 'mobile-admin',
      'createdAt': FieldValue.serverTimestamp(),
    });
  } catch (_) {
    // Scan records are audit support; check-in should not fail if audit logging fails.
  }
}

const _translations = {
  'en': {
    'title': 'Nashama Admin',
    'subtitle': 'Registration operations',
    'language': 'Switch language',
    'manageWebsite': 'Manage',
    'gateOps': 'Gate',
    'webAdmin': 'Web',
    'scanPageTitle': 'Gate scanner',
    'scanPageBody': 'Scan tickets, enter a code, and manage guests.',
    'recentScans': 'Recent scans',
    'noScansYet': 'No scans yet.',
    'websiteData': 'Website data',
    'heroTitle': 'Hero title',
    'heroLead': 'Hero lead',
    'ticketPrice': 'Ticket price',
    'experienceTitle': 'Experience title',
    'photoUrl': 'Photo URL',
    'saveWebsite': 'Save website',
    'eventTitle': 'Event title',
    'eventDateHint': 'Event date, for example 2026-12-18',
    'eventGame': 'Game',
    'eventImage': 'Event image URL',
    'saveEvent': 'Save event',
    'eventRequired': 'Date and game are required',
    'saved': 'Saved',
    'statRegistrations': 'Registrations',
    'statTickets': 'Tickets',
    'statValue': 'Estimated value',
    'statVip': 'VIP tickets',
    'searchHint': 'Search name, email, phone, code',
    'category': 'Category',
    'status': 'Status',
    'payment': 'Payment',
    'payment.Paid': 'Paid',
    'payment.Unpaid': 'Unpaid',
    'paymentSaved': 'Payment saved',
    'paymentFailed': 'Could not update payment',
    'allCategories': 'All categories',
    'allStatuses': 'All statuses',
    'shown': 'shown',
    'export': 'Export',
    'exportCsv': 'Export CSV',
    'clearAll': 'Clear all',
    'tickets': 'Tickets',
    'quantity': 'Quantity',
    'quickActions': 'Quick actions',
    'scanQr': 'Scan QR',
    'scanGuest': 'Scan guest',
    'scanGuestBody': 'Scan this guest tickets only.',
    'allTicketsScanned': 'All tickets for this guest are scanned.',
    'generateQrWhatsapp': 'PDF tickets',
    'noTicketsForQr': 'This registration has no tickets to generate',
    'qrGenerateFailed': 'Could not generate QR passes',
    'qrReady': 'QR passes ready',
    'passes': 'passes',
    'ticket': 'Ticket',
    'continueToWhatsapp': 'Continue to WhatsApp',
    'whatsappFailed': 'Could not open WhatsApp',
    'resetScanner': 'Reset scanner',
    'manualEntry': 'Manual entry',
    'manualEntryTitle': 'Enter ticket code',
    'manualEntryHint': 'Pass id, NASHAMA|code, or ticket link',
    'emptyManualCode': 'Enter a ticket code first',
    'submit': 'Submit',
    'scanAnother': 'Scan another',
    'scannerReady': 'Ready to scan',
    'scannerBody': 'Point the camera at a Nashama ticket QR.',
    'scanSuccess': 'Entry accepted',
    'alreadyScanned': 'Already scanned',
    'alreadyScannedBody': 'This QR was already scanned at',
    'scanProcessing': 'Checking ticket...',
    'invalidQr': 'Invalid QR',
    'scanError': 'Scan error',
    'callCustomer': 'Call customer',
    'missingPhone': 'This registration has no phone number',
    'callFailed': 'Could not open the phone dialer',
    'markCheckedIn': 'Mark checked in',
    'unnamed': 'Unnamed guest',
    'male': 'Male',
    'female': 'Female',
    'status.New': 'New',
    'status.Confirmed': 'Confirmed',
    'status.Checked in': 'Checked in',
    'status.Cancelled': 'Cancelled',
    'loadError': 'Could not load registrations',
    'emptyTitle': 'No registrations found',
    'emptyBody': 'Try another search, category, or status.',
    'statusSaved': 'Status saved',
    'statusFailed': 'Could not update status',
    'deleteTitle': 'Delete registration',
    'deleteBody': 'Delete registration',
    'delete': 'Delete',
    'deleted': 'Registration deleted',
    'deleteFailed': 'Could not delete registration',
    'clearTitle': 'Clear all registrations',
    'clearBody': 'This will delete every registration. Count:',
    'clear': 'Clear',
    'cleared': 'All registrations cleared',
    'clearFailed': 'Could not clear registrations',
    'cancel': 'Cancel',
    'exportReady': 'CSV ready',
    'exportBody': 'The CSV has been copied. You can also select it below.',
    'copyCsv': 'Copy CSV',
    'copied': 'CSV copied',
  },
  'ar': {
    'manageWebsite': 'Manage',
    'gateOps': 'Gate',
    'webAdmin': 'Web',
    'scanPageTitle': 'Gate scanner',
    'scanPageBody': 'Scan tickets, enter a code, and manage guests.',
    'manualEntry': 'Manual entry',
    'manualEntryTitle': 'Enter ticket code',
    'manualEntryHint': 'Pass id, NASHAMA|code, or ticket link',
    'emptyManualCode': 'Enter a ticket code first',
    'submit': 'Submit',
    'title': 'إدارة النشامى',
    'subtitle': 'عمليات التسجيل',
    'language': 'تغيير اللغة',
    'statRegistrations': 'التسجيلات',
    'statTickets': 'التذاكر',
    'statValue': 'القيمة المتوقعة',
    'statVip': 'تذاكر VIP',
    'searchHint': 'ابحث بالاسم أو الهاتف أو الرمز',
    'category': 'الفئة',
    'status': 'الحالة',
    'payment': 'الدفع',
    'payment.Paid': 'مدفوع',
    'payment.Unpaid': 'غير مدفوع',
    'paymentSaved': 'تم حفظ الدفع',
    'paymentFailed': 'تعذر تحديث الدفع',
    'allCategories': 'كل الفئات',
    'allStatuses': 'كل الحالات',
    'shown': 'معروض',
    'export': 'تصدير',
    'exportCsv': 'تصدير CSV',
    'clearAll': 'حذف الكل',
    'tickets': 'التذاكر',
    'quantity': 'العدد',
    'quickActions': 'إجراءات سريعة',
    'scanQr': 'مسح QR',
    'scanGuest': 'مسح الضيف',
    'scanGuestBody': 'امسح تذاكر هذا الضيف فقط.',
    'allTicketsScanned': 'تم مسح كل تذاكر هذا الضيف.',
    'generateQrWhatsapp': 'تذاكر PDF',
    'noTicketsForQr': 'لا توجد تذاكر لإنشاء QR',
    'qrGenerateFailed': 'تعذر إنشاء تذاكر QR',
    'qrReady': 'تذاكر QR جاهزة',
    'passes': 'تذاكر',
    'ticket': 'تذكرة',
    'continueToWhatsapp': 'المتابعة إلى واتساب',
    'whatsappFailed': 'تعذر فتح واتساب',
    'resetScanner': 'إعادة المسح',
    'scanAnother': 'مسح آخر',
    'scannerReady': 'جاهز للمسح',
    'scannerBody': 'وجه الكاميرا نحو رمز QR لتذكرة النشامى.',
    'scanSuccess': 'تم قبول الدخول',
    'alreadyScanned': 'تم مسحه مسبقاً',
    'alreadyScannedBody': 'تم مسح هذا الرمز مسبقاً في',
    'scanProcessing': 'جاري التحقق من التذكرة...',
    'invalidQr': 'QR غير صالح',
    'scanError': 'خطأ في المسح',
    'callCustomer': 'اتصال بالعميل',
    'missingPhone': 'لا يوجد رقم هاتف لهذا التسجيل',
    'callFailed': 'تعذر فتح تطبيق الاتصال',
    'markCheckedIn': 'تسجيل الدخول',
    'unnamed': 'ضيف بدون اسم',
    'male': 'ذكر',
    'female': 'أنثى',
    'status.New': 'جديد',
    'status.Confirmed': 'مؤكد',
    'status.Checked in': 'تم الدخول',
    'status.Cancelled': 'ملغي',
    'loadError': 'تعذر تحميل التسجيلات',
    'emptyTitle': 'لا توجد تسجيلات',
    'emptyBody': 'جرّب بحثاً أو فئة أو حالة أخرى.',
    'statusSaved': 'تم حفظ الحالة',
    'statusFailed': 'تعذر تحديث الحالة',
    'deleteTitle': 'حذف التسجيل',
    'deleteBody': 'حذف التسجيل',
    'delete': 'حذف',
    'deleted': 'تم حذف التسجيل',
    'deleteFailed': 'تعذر حذف التسجيل',
    'clearTitle': 'حذف كل التسجيلات',
    'clearBody': 'سيتم حذف كل التسجيلات. العدد:',
    'clear': 'حذف',
    'cleared': 'تم حذف كل التسجيلات',
    'clearFailed': 'تعذر حذف التسجيلات',
    'cancel': 'إلغاء',
    'exportReady': 'ملف CSV جاهز',
    'exportBody': 'تم نسخ CSV. ويمكنك تحديده أدناه أيضاً.',
    'copyCsv': 'نسخ CSV',
    'copied': 'تم نسخ CSV',
  },
};
