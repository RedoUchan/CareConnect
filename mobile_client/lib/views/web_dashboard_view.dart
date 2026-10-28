import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:geolocator/geolocator.dart';
import '../config/api_config.dart';
import 'widgets/pulsing_skeleton.dart';
import 'login_view.dart';
import 'iframe_stub.dart' if (dart.library.html) 'iframe_web.dart';

class WebDashboardView extends StatefulWidget {
  const WebDashboardView({super.key});

  @override
  State<WebDashboardView> createState() => _WebDashboardViewState();
}

class _WebDashboardViewState extends State<WebDashboardView> {
  WebViewController? _controller;
  bool _isLoading = true;
  bool _hasError = false;
  bool _initialLoadDone = false;
  String _errorMessage = "";
  String _userRole = "";
  String _userName = "";
  String _startUrl = "";

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  Future<void> _initWebView() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: "jwt_token") ?? "";
    final role = await storage.read(key: "user_role") ?? "Patient";
    final name = await storage.read(key: "user_name") ?? "Thành viên";
    final userId = await storage.read(key: "user_id") ?? "";

    setState(() {
      _userRole = role;
      _userName = name;
    });

    final webUrl = ApiConfig.webUrl;
    final startUrl = "$webUrl/#/dashboard?token=$token&role=$role&name=${Uri.encodeComponent(name)}&userId=$userId";

    setState(() {
      _startUrl = startUrl;
    });

    if (kIsWeb) {
      // Trên Web, dùng HtmlElementView (iframe) và tự tắt loading sau 1.2s
      Future.delayed(const Duration(milliseconds: 1200), () {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      });
      return;
    }

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent("CareConnectMobile/1.0.0");

    if (controller.platform is AndroidWebViewController) {
      final androidController = controller.platform as AndroidWebViewController;
      await androidController.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (GeolocationPermissionsRequestParams request) async {
          final permission = await Geolocator.requestPermission();
          if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
            return const GeolocationPermissionsResponse(allow: true, retain: true);
          }
          return const GeolocationPermissionsResponse(allow: false, retain: false);
        },
        onHidePrompt: () {},
      );
    }

    controller.setNavigationDelegate(
      NavigationDelegate(
        onPageStarted: (String url) {
          setState(() {
            _isLoading = true;
            _hasError = false;
          });
        },
        onPageFinished: (String url) async {
          if (!_initialLoadDone) {
            // Tiêm thông tin đăng nhập từ secure storage của Mobile vào localStorage của Web
            final jsInject = """
              localStorage.setItem('token', '$token');
              localStorage.setItem('userRole', '$role');
              localStorage.setItem('userName', '$name');
              localStorage.setItem('userId', '$userId');
              
              if (typeof token !== 'undefined') token = '$token';
              if (typeof userRole !== 'undefined') userRole = '$role';
              if (typeof userName !== 'undefined') userName = '$name';
              if (typeof userId !== 'undefined') userId = '$userId';
              
              // Nếu ở màn hình không đăng nhập, tự động chuyển đến dashboard
              if (window.location.hash === '#/login' || window.location.hash === '#/home' || window.location.hash === '') {
                window.location.hash = '#/dashboard';
              }
              
              if (typeof handleRouting === 'function') {
                handleRouting();
              }
            """;

            try {
              await controller.runJavaScript(jsInject);
            } catch (e) {
              debugPrint("JS Injection Error: $e");
            }

            // Đợi một chút để Web xử lý định tuyến xong rồi tắt loading skeleton
            await Future.delayed(const Duration(milliseconds: 400));
            if (mounted) {
              setState(() {
                _isLoading = false;
                _initialLoadDone = true;
              });
            }
          } else {
            // Đã qua lần tải đầu tiên, kiểm tra xem người dùng có đăng xuất từ phía Web không
            try {
              final storedToken = await controller.runJavaScriptReturningResult("localStorage.getItem('token')");
              final cleanToken = storedToken.toString().replaceAll('"', '').trim();
              if (cleanToken.isEmpty || cleanToken == 'null') {
                // Đăng xuất từ Web -> Đồng bộ đăng xuất trên Mobile
                const storage = FlutterSecureStorage();
                await storage.deleteAll();
                if (mounted) {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (context) => const LoginView()),
                  );
                }
                return;
              }
            } catch (e) {
              debugPrint("Check token error: $e");
            }

            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
          }
        },
        onWebResourceError: (WebResourceError error) {
          if (error.isForMainFrame == true) {
            setState(() {
              _hasError = true;
              _isLoading = false;
              _errorMessage = "${error.description} (Mã: ${error.errorCode})";
            });
          }
        },
      ),
    );

    controller.loadRequest(Uri.parse(startUrl));

    // Fallback timer to hide skeleton loader on Web platforms due to CORS-blocked events
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted && _isLoading) {
        setState(() {
          _isLoading = false;
        });
      }
    });

    setState(() {
      _controller = controller;
    });
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Đăng xuất"),
        content: const Text("Bạn có chắc chắn muốn đăng xuất tài khoản?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Hủy"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
            ),
            child: const Text("Đăng xuất"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      const storage = FlutterSecureStorage();
      await storage.deleteAll();
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginView()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final navigator = Navigator.of(context);
        if (_controller != null && await _controller!.canGoBack()) {
          await _controller!.goBack();
        } else {
          if (navigator.canPop()) {
            navigator.pop();
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Row(
            children: [
              const Icon(Icons.favorite, color: Colors.teal),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "CareConnect",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F766E),
                    ),
                  ),
                  Text(
                    "$_userName ($_userRole)",
                    style: const TextStyle(
                      fontSize: 11,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ],
          ),
          backgroundColor: Colors.white,
          elevation: 0.5,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh, color: Color(0xFF0F766E)),
              tooltip: "Tải lại trang",
              onPressed: () {
                _controller?.reload();
              },
            ),
            IconButton(
              icon: const Icon(Icons.power_settings_new, color: Colors.red),
              tooltip: "Đăng xuất",
              onPressed: _handleLogout,
            ),
          ],
        ),
        body: _hasError
            ? _buildErrorScreen()
            : Stack(
                children: [
                  if (kIsWeb)
                    createIframe(_startUrl)
                  else ...[
                    if (_controller != null) WebViewWidget(controller: _controller!),
                  ],
                  if (_isLoading || (!kIsWeb && _controller == null))
                    const WebDashboardLoadingPlaceholder(),
                ],
              ),
      ),
    );
  }

  Widget _buildErrorScreen() {
    return Container(
      color: const Color(0xFFF8FAFC),
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off, size: 72, color: Colors.red.shade400),
          const SizedBox(height: 16),
          const Text(
            "Không thể kết nối máy chủ",
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Có lỗi xảy ra trong quá trình kết nối với hệ thống CareConnect. Vui lòng kiểm tra lại mạng hoặc thử lại.",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "Chi tiết lỗi: $_errorMessage",
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontStyle: FontStyle.italic,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              setState(() {
                _hasError = false;
                _isLoading = true;
              });
              _controller?.reload();
            },
            icon: const Icon(Icons.refresh),
            label: const Text("Thử kết nối lại"),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              backgroundColor: const Color(0xFF0F766E),
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class WebDashboardLoadingPlaceholder extends StatelessWidget {
  const WebDashboardLoadingPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        physics: const NeverScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const PulsingSkeleton(width: 220, height: 24),
            const SizedBox(height: 8),
            const PulsingSkeleton(width: 140, height: 14),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 80,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        PulsingSkeleton(width: 40, height: 16),
                        SizedBox(height: 8),
                        PulsingSkeleton(width: 85, height: 12),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 80,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        PulsingSkeleton(width: 40, height: 16),
                        SizedBox(height: 8),
                        PulsingSkeleton(width: 85, height: 12),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const PulsingSkeleton(width: 160, height: 18),
            const SizedBox(height: 12),
            const SkeletonCard(),
            const SkeletonCard(),
          ],
        ),
      ),
    );
  }
}
